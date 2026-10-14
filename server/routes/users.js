const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const { ensureSuperadminAccount } = require('../services/superadminRecovery');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { createSuperadminNotification } = require('../services/notifications');
const { sendAccountCredentialsEmail } = require('../services/emailjs');
const { recordActivity } = require('../services/activityLog');

function normalizeDbStatus(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'Active';
  if (['active', 'enabled'].includes(normalized)) return 'Active';
  if (['suspended', 'inactive', 'disabled'].includes(normalized)) return 'Suspended';
  return 'Active';
}

const HEALTH_WORKER_ROLE_SQL = `LOWER(TRIM(role)) IN ('health worker', 'health_worker', 'healthworker')`;

function getOrganizerSchoolId(req, res) {
  const schoolId = Number(req.user?.school_id);
  if (!Number.isInteger(schoolId) || schoolId <= 0) {
    res.status(403).json({ error: 'Assign this account to a school before managing health workers' });
    return null;
  }
  return schoolId;
}

async function isGroupInSchool(groupId, schoolId) {
  const [groups] = await pool.query(
    'SELECT id FROM groups WHERE id = ? AND community_id = ? LIMIT 1',
    [groupId, schoolId],
  );
  return groups.length > 0;
}

function healthWorkerSelectSql(whereClause) {
  return `SELECT id, CONCAT_WS(' ', first_name, last_name) AS username,
      CONCAT_WS(' ', first_name, last_name) AS full_name, email, role, status,
      first_name, last_name, middle_initial, contact_number, gender, dob, location,
      school_id, group_id, created_at, updated_at
    FROM users ${whereClause}`;
}

// Helper: normalize searchable name/value
function nameLike(column) {
  return `CONCAT_WS(' ', first_name, last_name)`;
}

// Community Coordinators can manage only health workers assigned to their own school.
router.get('/health-workers', verifyToken, authorize('community_coordinator'), async (req, res) => {
  const schoolId = getOrganizerSchoolId(req, res);
  if (!schoolId) return;
  try {
    const [users] = await pool.query(
      `${healthWorkerSelectSql(`WHERE school_id = ? AND ${HEALTH_WORKER_ROLE_SQL}`)} ORDER BY id DESC`,
      [schoolId],
    );
    res.json({ total: users.length, users });
  } catch (error) {
    console.error('[Users API] GET /health-workers error:', error.message);
    res.status(500).json({ error: 'Unable to load assigned health workers' });
  }
});

router.get('/health-workers/:id', verifyToken, authorize('community_coordinator'), async (req, res) => {
  const schoolId = getOrganizerSchoolId(req, res);
  if (!schoolId) return;
  try {
    const [users] = await pool.query(
      `${healthWorkerSelectSql(`WHERE id = ? AND school_id = ? AND ${HEALTH_WORKER_ROLE_SQL}`)} LIMIT 1`,
      [req.params.id, schoolId],
    );
    if (!users.length) return res.status(404).json({ error: 'Health worker not found' });
    res.json(users[0]);
  } catch (error) {
    console.error('[Users API] GET /health-workers/:id error:', error.message);
    res.status(500).json({ error: 'Unable to load assigned health worker' });
  }
});

router.post('/health-workers', verifyToken, authorize('community_coordinator'), async (req, res) => {
  const schoolId = getOrganizerSchoolId(req, res);
  if (!schoolId) return;
  try {
    const {
      email, password, firstName, lastName, middleInitial, contactNumber,
      gender, dob, location, groupId,
    } = req.body || {};
    const normalizedEmail = String(email || '').trim();
    const normalizedFirstName = String(firstName || '').trim();
    const normalizedLastName = String(lastName || '').trim();
    const assignedGroupId = Number(groupId);
    if (!normalizedEmail || !normalizedFirstName || !normalizedLastName) {
      return res.status(400).json({ error: 'First name, last name, and email are required' });
    }
    if (!Number.isInteger(assignedGroupId) || assignedGroupId <= 0) {
      return res.status(400).json({ error: 'A valid group assignment is required' });
    }
    if (!(await isGroupInSchool(assignedGroupId, schoolId))) {
      return res.status(400).json({ error: 'Select a group within your assigned school' });
    }

    const userName = String(req.body.username || normalizedEmail.split('@')[0]).trim();
    const plainPassword = String(password || `${userName}.${require('crypto').randomBytes(4).toString('hex')}`);
    if (plainPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const passwordHash = await bcrypt.hash(plainPassword, 10);
    const [result] = await pool.query(
      `INSERT INTO users
        (email, role, status, password_hash, first_name, last_name, middle_initial,
         contact_number, gender, dob, location, school_id, group_id)
       VALUES (?, 'Health worker', 'Active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        normalizedEmail,
        passwordHash,
        normalizedFirstName,
        normalizedLastName,
        middleInitial || null,
        contactNumber || null,
        gender || 'Male',
        dob || null,
        location || null,
        schoolId,
        assignedGroupId,
      ],
    );
    const [rows] = await pool.query(
      `${healthWorkerSelectSql('WHERE id = ? AND school_id = ? AND ' + HEALTH_WORKER_ROLE_SQL)} LIMIT 1`,
      [result.insertId, schoolId],
    );
    const user = rows[0];
    const fullName = [user.first_name, user.middle_initial, user.last_name].filter(Boolean).join(' ');
    await recordActivity({
      actor: req.user,
      category: 'User Management',
      action: 'create',
      entityType: 'user',
      entityId: user.id,
      description: `Created health worker account: ${fullName}`,
    });
    let emailSent = false;
    try {
      await sendAccountCredentialsEmail({
        email: user.email,
        name: fullName,
        role: user.role,
        password: plainPassword,
      });
      emailSent = true;
    } catch (emailError) {
      console.error('[Users API] Unable to email health worker credentials:', emailError.message);
    }
    await createSuperadminNotification({
      eventType: 'user.created',
      category: 'User Management',
      title: 'Health worker account created',
      message: `Health worker account created: ${fullName}.`,
      entityType: 'user',
      entityId: user.id,
      linkTo: '/user-management',
      schoolId,
      groupId: assignedGroupId,
      actorUserId: req.user.id,
    });
    res.status(201).json({ user, emailSent });
  } catch (error) {
    console.error('[Users API] POST /health-workers error:', error.message);
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email is already assigned to an account' });
    }
    res.status(500).json({ error: 'Unable to create health worker account' });
  }
});

router.put('/health-workers/:id', verifyToken, authorize('community_coordinator'), async (req, res) => {
  const schoolId = getOrganizerSchoolId(req, res);
  if (!schoolId) return;
  try {
    const { id } = req.params;
    const [existingRows] = await pool.query(
      `SELECT id FROM users WHERE id = ? AND school_id = ? AND ${HEALTH_WORKER_ROLE_SQL} LIMIT 1`,
      [id, schoolId],
    );
    if (!existingRows.length) return res.status(404).json({ error: 'Health worker not found' });

    const {
      email, firstName, lastName, middleInitial, contactNumber,
      gender, dob, location, groupId,
    } = req.body || {};
    const assignedGroupId = Number(groupId);
    if (!Number.isInteger(assignedGroupId) || assignedGroupId <= 0
      || !(await isGroupInSchool(assignedGroupId, schoolId))) {
      return res.status(400).json({ error: 'Select a group within your assigned school' });
    }
    if (!String(email || '').trim() || !String(firstName || '').trim() || !String(lastName || '').trim()) {
      return res.status(400).json({ error: 'First name, last name, and email are required' });
    }

    const updates = [
      'email = ?',
      'first_name = ?',
      'last_name = ?',
      'middle_initial = ?',
      'contact_number = ?',
      'dob = ?',
      'group_id = ?',
    ];
    const updateValues = [
      String(email).trim(),
      String(firstName).trim(),
      String(lastName).trim(),
      middleInitial || null,
      contactNumber || null,
      dob || null,
      assignedGroupId,
    ];
    if (gender !== undefined) {
      updates.push('gender = ?');
      updateValues.push(gender || 'Male');
    }
    if (location !== undefined) {
      updates.push('location = ?');
      updateValues.push(location || null);
    }
    await pool.query(
      `UPDATE users SET ${updates.join(', ')}
       WHERE id = ? AND school_id = ? AND ${HEALTH_WORKER_ROLE_SQL}`,
      [...updateValues, id, schoolId],
    );
    const [rows] = await pool.query(
      `${healthWorkerSelectSql('WHERE id = ? AND school_id = ? AND ' + HEALTH_WORKER_ROLE_SQL)} LIMIT 1`,
      [id, schoolId],
    );
    await recordActivity({
      actor: req.user,
      category: 'User Management',
      action: 'update',
      entityType: 'user',
      entityId: id,
      description: `Updated health worker account: ${[rows[0].first_name, rows[0].middle_initial, rows[0].last_name].filter(Boolean).join(' ')}`,
    });
    res.json(rows[0]);
  } catch (error) {
    console.error('[Users API] PUT /health-workers/:id error:', error.message);
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email is already assigned to an account' });
    }
    res.status(500).json({ error: 'Unable to update health worker account' });
  }
});

router.patch('/health-workers/:id/status', verifyToken, authorize('community_coordinator'), async (req, res) => {
  const schoolId = getOrganizerSchoolId(req, res);
  if (!schoolId) return;
  try {
    const status = String(req.body?.status || '').trim();
    if (!['Active', 'Suspended'].includes(status)) {
      return res.status(400).json({ error: 'Status must be Active or Suspended' });
    }
    const [rows] = await pool.query(
      `SELECT id, first_name, middle_initial, last_name, status, group_id
       FROM users WHERE id = ? AND school_id = ? AND ${HEALTH_WORKER_ROLE_SQL} LIMIT 1`,
      [req.params.id, schoolId],
    );
    if (!rows.length) return res.status(404).json({ error: 'Health worker not found' });
    await pool.query(
      `UPDATE users SET status = ? WHERE id = ? AND school_id = ? AND ${HEALTH_WORKER_ROLE_SQL}`,
      [status, req.params.id, schoolId],
    );
    if (normalizeDbStatus(rows[0].status) !== status) {
      const fullName = [rows[0].first_name, rows[0].middle_initial, rows[0].last_name].filter(Boolean).join(' ');
      await recordActivity({
        actor: req.user,
        category: 'User Management',
        action: status === 'Suspended' ? 'suspend' : 'reactivate',
        entityType: 'user',
        entityId: req.params.id,
        description: `${status === 'Suspended' ? 'Suspended' : 'Reactivated'} health worker account: ${fullName}`,
      });
      const suspended = status === 'Suspended';
      await createSuperadminNotification({
        eventType: suspended ? 'user.suspended' : 'user.reactivated',
        category: 'User Management',
        title: suspended ? 'Health worker suspended' : 'Health worker reactivated',
        message: `Health worker account ${suspended ? 'suspended' : 'reactivated'}: ${fullName}.`,
        entityType: 'user',
        entityId: req.params.id,
        linkTo: '/user-management',
        schoolId,
        groupId: rows[0].group_id,
        actorUserId: req.user.id,
      });
    }
    res.json({ id: Number(req.params.id), status });
  } catch (error) {
    console.error('[Users API] PATCH /health-workers/:id/status error:', error.message);
    res.status(500).json({ error: 'Unable to update health worker status' });
  }
});

// GET /api/users/coordinators - limited data for operational assignment fields
router.get('/coordinators', verifyToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT id, CONCAT_WS(' ', first_name, last_name) AS username, CONCAT_WS(' ', first_name, last_name) AS full_name, role, school_id FROM users WHERE LOWER(TRIM(role)) IN ('community organizer', 'community_coordinator', 'communitycoordinator', 'communityorganizer', 'coordinator', 'co', 'partner') ORDER BY id DESC`
    );
    res.json({ users });
  } catch (err) {
    console.error('[Users API] GET /coordinators error:', err.message);
    res.status(500).json({ error: 'db error' });
  }
});

// GET /api/users?search=&role=&status=&page=1&perPage=10
router.get('/', verifyToken, authorize('super_admin'), async (req, res) => {
  try {
    const { search = '', role, status, page = 1, perPage = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(perPage);

    const filters = [];
    const params = [];
    if (search) {
      filters.push(`( ${nameLike()} LIKE ? OR email LIKE ? )`);
      const s = `%${search}%`;
      params.push(s, s);
    }
    if (role) {
      filters.push('role = ?');
      params.push(role);
    }
    if (status) {
      filters.push('status = ?');
      params.push(status);
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM users ${where}`, params);
    const total = countRows[0].total || 0;

    const [rows] = await pool.query(
      `SELECT id, CONCAT_WS(' ', first_name, last_name) AS username, CONCAT_WS(' ', first_name, last_name) AS full_name, email, role, status, first_name, last_name, middle_initial, contact_number, gender, dob, location, school_id, group_id, created_at, updated_at FROM users ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, Number(perPage), Number(offset)]
    );

    res.json({ total, users: rows });
  } catch (err) {
    console.error('[Users API] GET / error:', err.message);
    res.status(500).json({ error: 'db error' });
  }
});

// POST /api/users
// Require authentication to create users (only Admin/Superadmin allowed in this example)
router.post('/', verifyToken, authorize('super_admin'), async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      fullName,
      firstName,
      lastName,
      middleInitial,
      contactNumber,
      gender,
      dob,
      location,
      role,
      status,
      schoolId,
      groupId,
    } = req.body;

    // build username and full_name from provided fields if necessary
    const userName = username || (email ? email.split('@')[0] : null);
    const full_name = fullName || (firstName || lastName ? `${(firstName||'').trim()} ${(lastName||'').trim()}`.trim() : null);
    const roleName = String(role || '').trim().toLowerCase();
    const requiresSchool = ['health worker', 'community organizer', 'community_coordinator', 'communitycoordinator', 'coordinator'].includes(roleName);
    const requiresGroup = roleName === 'health worker';

    if (!userName || !email) return res.status(400).json({ error: 'username and email are required' });
    if (requiresSchool && !schoolId) return res.status(400).json({ error: 'schoolId is required for this role' });
    if (requiresGroup && !groupId) return res.status(400).json({ error: 'groupId is required for this role' });

    // generate password if none provided
    let plainPassword = password;
    if (!plainPassword || plainPassword.length < 8) {
      const rand3 = Math.floor(100 + Math.random() * 900);
      plainPassword = `${userName}.${rand3}`;
      while (plainPassword.length < 8) {
        plainPassword += Math.floor(Math.random() * 10).toString();
      }
    }
    const hash = await bcrypt.hash(plainPassword, 10);

    const dbStatus = normalizeDbStatus(status || 'active');
    const [result] = await pool.query(
      `INSERT INTO users (email, role, status, password_hash, first_name, last_name, middle_initial, contact_number, gender, dob, location, school_id, group_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        email,
        role || 'user',
        dbStatus,
        hash,
        firstName || '',
        lastName || '',
        middleInitial || null,
        contactNumber || null,
        gender || 'Male',
        dob || null,
        location || null,
        schoolId || null,
        groupId || null
      ]
    );

    const [rows] = await pool.query(
      `SELECT id, CONCAT_WS(' ', first_name, last_name) AS username, CONCAT_WS(' ', first_name, last_name) AS full_name, email, role, status, first_name, last_name, middle_initial, contact_number, gender, dob, location, school_id, group_id, created_at
       FROM users WHERE id = ?`,
      [result.insertId]
    );
    const user = rows[0];
    const createdName = [user.first_name, user.middle_initial, user.last_name].filter(Boolean).join(' ');
    await recordActivity({
      actor: req.user,
      category: 'User Management',
      action: 'create',
      entityType: 'user',
      entityId: user.id,
      description: `Created ${user.role} account: ${createdName}`,
    });
    let emailSent = false;
    try {
      await sendAccountCredentialsEmail({
        email: user.email,
        name: createdName,
        role: user.role,
        password: plainPassword,
      });
      emailSent = true;
    } catch (emailError) {
      console.error('[Users API] Unable to email account credentials:', emailError.message);
    }
    await createSuperadminNotification({
      eventType: 'user.created',
      category: 'User Management',
      title: 'User created',
      message: `User account created: ${createdName} (${user.role}).`,
      entityType: 'user',
      entityId: user.id,
      linkTo: `/user-management/user/${user.id}`,
      schoolId: user.school_id,
      groupId: user.group_id,
      actorUserId: req.user.id,
    });
    // Return created user WITHOUT plaintext password for security.
    res.status(201).json({ user, emailSent });
  } catch (err) {
    console.error('[Users API] POST / error:', err.message);
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email or username already exists' });
    res.status(500).json({ error: 'db error' });
  }
});

// GET /api/users/:id
router.get('/:id', verifyToken, authorize('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT id, CONCAT_WS(' ', first_name, last_name) AS username, CONCAT_WS(' ', first_name, last_name) AS full_name, email, role, status, first_name, last_name, middle_initial, contact_number, gender, dob, location, school_id, group_id, created_at
       FROM users WHERE id = ?`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[Users API] GET /:id error:', err.message);
    res.status(500).json({ error: 'db error' });
  }
});

// PUT /api/users/:id
// Require authentication to update users
router.put('/:id', verifyToken, authorize('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      username,
      email,
      fullName,
      firstName,
      lastName,
      middleInitial,
      contactNumber,
      gender,
      dob,
      location,
      role,
      status,
      password,
      schoolId,
      groupId,
    } = req.body;

    const [existingRows] = await pool.query(
      'SELECT id, first_name, middle_initial, last_name, role, status, school_id, group_id FROM users WHERE id = ? LIMIT 1',
      [id],
    );
    if (!existingRows.length) return res.status(404).json({ error: 'Not found' });
    const existingUser = existingRows[0];

    const updates = [];
    const params = [];
    if (email) { updates.push('email = ?'); params.push(email); }
      if (fullName !== undefined && firstName === undefined && lastName === undefined) {
        const nameParts = String(fullName || '').trim().split(/\s+/);
        updates.push('first_name = ?', 'last_name = ?');
        params.push(nameParts.shift() || '', nameParts.join(' '));
      }
      if (firstName !== undefined) { updates.push('first_name = ?'); params.push(firstName); }
    if (lastName !== undefined) { updates.push('last_name = ?'); params.push(lastName); }
    if (middleInitial !== undefined) { updates.push('middle_initial = ?'); params.push(middleInitial || null); }
    if (contactNumber !== undefined) { updates.push('contact_number = ?'); params.push(contactNumber || null); }
    if (gender !== undefined) { updates.push('gender = ?'); params.push(gender || 'Male'); }
    if (dob !== undefined) { updates.push('dob = ?'); params.push(dob || null); }
    if (location !== undefined) { updates.push('location = ?'); params.push(location || null); }
    if (role !== undefined) { updates.push('role = ?'); params.push(role); }
    if (status !== undefined) { updates.push('status = ?'); params.push(normalizeDbStatus(status)); }
    if (schoolId !== undefined) { updates.push('school_id = ?'); params.push(schoolId || null); }
    if (groupId !== undefined) { updates.push('group_id = ?'); params.push(groupId || null); }
    if (role !== undefined && ['health worker', 'community organizer', 'community_coordinator', 'communitycoordinator', 'coordinator'].includes(String(role).trim().toLowerCase()) && !schoolId) {
      return res.status(400).json({ error: 'schoolId is required for this role' });
    }
    if (role !== undefined && String(role).trim().toLowerCase() === 'health worker' && !groupId && req.body.groupId !== undefined) {
      return res.status(400).json({ error: 'groupId is required for this role' });
    }

    if (password) {
      const hash = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      params.push(hash);
    }

    if (!updates.length) return res.status(400).json({ error: 'No fields to update' });

    params.push(id);
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    await pool.query(sql, params);

    const [rows] = await pool.query(
      `SELECT id, CONCAT_WS(' ', first_name, last_name) AS username, CONCAT_WS(' ', first_name, last_name) AS full_name, email, role, status, first_name, last_name, middle_initial, contact_number, gender, dob, location, school_id, group_id, updated_at
       FROM users WHERE id = ?`,
      [id]
    );
    const updatedUser = rows[0];
    const updatedName = [updatedUser.first_name, updatedUser.middle_initial, updatedUser.last_name].filter(Boolean).join(' ');
    await recordActivity({
      actor: req.user,
      category: 'User Management',
      action: 'update',
      entityType: 'user',
      entityId: updatedUser.id,
      description: `Updated ${updatedUser.role} account: ${updatedName}`,
    });
    const accessChanges = [];
    if (String(existingUser.role ?? '') !== String(updatedUser.role ?? '')) accessChanges.push(`role changed to ${updatedUser.role}`);
    if (String(existingUser.school_id ?? '') !== String(updatedUser.school_id ?? '')) accessChanges.push('school assignment changed');
    if (String(existingUser.group_id ?? '') !== String(updatedUser.group_id ?? '')) accessChanges.push('group assignment changed');
    if (accessChanges.length) {
      await createSuperadminNotification({
        eventType: 'user.access_updated',
        category: 'User Management',
        title: 'User access updated',
        message: `Access updated for ${updatedName}: ${accessChanges.join(', ')}.`,
        entityType: 'user',
        entityId: updatedUser.id,
        linkTo: `/user-management/user/${updatedUser.id}`,
        schoolId: updatedUser.school_id,
        groupId: updatedUser.group_id,
        actorUserId: req.user.id,
      });
    }
    const previousStatus = normalizeDbStatus(existingUser.status);
    const updatedStatus = normalizeDbStatus(updatedUser.status);
    if (previousStatus !== updatedStatus) {
      const isSuspended = updatedStatus === 'Suspended';
      await createSuperadminNotification({
        eventType: isSuspended ? 'user.suspended' : 'user.reactivated',
        category: 'User Management',
        title: isSuspended ? 'User suspended' : 'User reactivated',
        message: `User account ${isSuspended ? 'suspended' : 'reactivated'}: ${updatedName}.`,
        entityType: 'user',
        entityId: updatedUser.id,
        linkTo: `/user-management/user/${updatedUser.id}`,
        schoolId: updatedUser.school_id,
        groupId: updatedUser.group_id,
        actorUserId: req.user.id,
      });
    }
    res.json(updatedUser);
  } catch (err) {
    console.error('[Users API] PUT /:id error:', err.message);
    res.status(500).json({ error: 'db error' });
  }
});

// DELETE /api/users/:id
// Require authentication to delete users (only Superadmin/Admin)
router.delete('/:id', verifyToken, authorize('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const [userRows] = await pool.query(
      'SELECT id, first_name, middle_initial, last_name, school_id, group_id FROM users WHERE id = ? LIMIT 1',
      [id],
    );
    if (!userRows.length) return res.status(404).json({ error: 'Not found' });
    const deletedUser = userRows[0];
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    const deletedName = [deletedUser.first_name, deletedUser.middle_initial, deletedUser.last_name].filter(Boolean).join(' ');
    await recordActivity({
      actor: req.user,
      category: 'User Management',
      action: 'delete',
      entityType: 'user',
      entityId: id,
      description: `Deleted user account: ${deletedName}`,
    });
    await createSuperadminNotification({
      eventType: 'user.deleted',
      category: 'User Management',
      title: 'User deleted',
      message: `User account deleted: ${deletedName}.`,
      entityType: 'user',
      entityId: id,
      linkTo: '/user-management',
      schoolId: deletedUser.school_id,
      groupId: deletedUser.group_id,
      actorUserId: String(req.user.id) === String(id) ? null : req.user.id,
    });
    await ensureSuperadminAccount(pool);
    res.status(204).end();
  } catch (err) {
    console.error('[Users API] DELETE /:id error:', err.message);
    res.status(500).json({ error: 'db error' });
  }
});

// PATCH /api/users/:id/status - toggle or set status
// Require authentication to change status
router.patch('/:id/status', verifyToken, authorize('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status required' });
    const [userRows] = await pool.query(
      'SELECT id, first_name, middle_initial, last_name, status, school_id, group_id FROM users WHERE id = ? LIMIT 1',
      [id],
    );
    if (!userRows.length) return res.status(404).json({ error: 'Not found' });
    const existingUser = userRows[0];
    const dbStatus = normalizeDbStatus(status);
    await pool.query('UPDATE users SET status = ? WHERE id = ?', [dbStatus, id]);
    if (normalizeDbStatus(existingUser.status) !== dbStatus) {
      const isSuspended = dbStatus === 'Suspended';
      const fullName = [existingUser.first_name, existingUser.middle_initial, existingUser.last_name].filter(Boolean).join(' ');
      await recordActivity({
        actor: req.user,
        category: 'User Management',
        action: isSuspended ? 'suspend' : 'reactivate',
        entityType: 'user',
        entityId: id,
        description: `${isSuspended ? 'Suspended' : 'Reactivated'} user account: ${fullName}`,
      });
      await createSuperadminNotification({
        eventType: isSuspended ? 'user.suspended' : 'user.reactivated',
        category: 'User Management',
        title: isSuspended ? 'User suspended' : 'User reactivated',
        message: `User account ${isSuspended ? 'suspended' : 'reactivated'}: ${fullName}.`,
        entityType: 'user',
        entityId: id,
        linkTo: `/user-management/user/${id}`,
        schoolId: existingUser.school_id,
        groupId: existingUser.group_id,
        actorUserId: req.user.id,
      });
    }
    res.json({ ok: true, status: dbStatus });
  } catch (err) {
    console.error('[Users API] PATCH /:id/status error:', err.message);
    res.status(500).json({ error: 'db error' });
  }
});

module.exports = router;
