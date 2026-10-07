const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const { ensureSuperadminAccount } = require('../services/superadminRecovery');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { createSuperadminNotification } = require('../services/notifications');
const { sendAccountCredentials } = require('../services/emailjs');
const { encryptCredential, decryptCredential } = require('../services/credentialCipher');
const crypto = require('crypto');

function normalizeDbStatus(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'Active';
  if (['active', 'enabled'].includes(normalized)) return 'Active';
  if (['suspended', 'inactive', 'disabled'].includes(normalized)) return 'Suspended';
  return 'Active';
}

// Helper: normalize searchable name/value
function nameLike(column) {
  return `CONCAT_WS(' ', first_name, last_name)`;
}

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
  let connection;
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

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedContact = String(contactNumber || '').replace(/\D/g, '');
    const [duplicateUsers] = await pool.query(
      `SELECT id FROM users
       WHERE LOWER(TRIM(email)) = ?
          OR (? <> '' AND REPLACE(REPLACE(REPLACE(contact_number, '+', ''), ' ', ''), '-', '') = ?)
       LIMIT 1`,
      [normalizedEmail, normalizedContact, normalizedContact],
    );
    if (duplicateUsers.length) {
      return res.status(409).json({ error: 'A user with this email address or contact number already exists.' });
    }

    // Generate a strong server-side password when the form does not provide one.
    let plainPassword = password;
    if (!plainPassword || plainPassword.length < 8) {
      plainPassword = crypto.randomBytes(18).toString('base64url');
    }
    const hash = await bcrypt.hash(plainPassword, 10);

    const dbStatus = normalizeDbStatus(status || 'active');
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [result] = await connection.query(
      `INSERT INTO users (email, role, status, password_hash, auth_version, pending_credential_email, first_name, last_name, middle_initial, contact_number, gender, dob, location, school_id, group_id)
       VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        email,
        role || 'user',
        dbStatus,
        hash,
        encryptCredential(plainPassword),
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

    const [rows] = await connection.query(
      `SELECT id, CONCAT_WS(' ', first_name, last_name) AS username, CONCAT_WS(' ', first_name, last_name) AS full_name, email, role, status, first_name, last_name, middle_initial, contact_number, gender, dob, location, school_id, group_id, created_at
       FROM users WHERE id = ?`,
      [result.insertId]
    );
    const user = rows[0];
    const createdName = [user.first_name, user.middle_initial, user.last_name].filter(Boolean).join(' ');
    await connection.commit();
    connection.release();
    connection = null;
    let emailSent = false;
    try {
      await sendAccountCredentials({
        email: user.email,
        name: createdName,
        password: plainPassword,
        role: user.role,
      });
      await pool.query('UPDATE users SET pending_credential_email = NULL WHERE id = ?', [user.id]);
      emailSent = true;
    } catch (emailError) {
      console.error('[Users API] User created, but credential email failed:', emailError.message);
    }
    try {
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
    } catch (notificationError) {
      console.error('[Users API] User created, but notification failed:', notificationError.message);
    }
    res.status(201).json({ user, emailSent });
  } catch (err) {
    if (connection) {
      try { await connection.rollback(); } catch (rollbackError) {
        console.error('[Users API] User creation rollback failed:', rollbackError.message);
      }
      connection.release();
    }
    console.error('[Users API] POST / error:', err.message);
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'A user with this email address or contact number already exists.' });
    res.status(500).json({ error: 'db error' });
  }
});

router.post('/:id/resend-credentials', verifyToken, authorize('super_admin'), async (req, res) => {
  let connection;
  let needsNewPassword = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [users] = await connection.query(
      'SELECT id, email, first_name, middle_initial, last_name, role, pending_credential_email FROM users WHERE id = ? LIMIT 1 FOR UPDATE',
      [req.params.id],
    );
    const user = users[0];
    if (!user) {
      await connection.rollback();
      return res.status(404).json({ error: 'Not found' });
    }

    needsNewPassword = !user.pending_credential_email;
    const password = user.pending_credential_email
      ? decryptCredential(user.pending_credential_email)
      : crypto.randomBytes(18).toString('base64url');
    if (needsNewPassword) {
      const passwordHash = await bcrypt.hash(password, 10);
      await connection.query(
        'UPDATE users SET password_hash = ?, auth_version = auth_version + 1, pending_credential_email = ? WHERE id = ?',
        [passwordHash, encryptCredential(password), user.id],
      );
    }
    await connection.commit();
    connection.release();
    connection = null;

    await sendAccountCredentials({
      email: user.email,
      name: [user.first_name, user.middle_initial, user.last_name].filter(Boolean).join(' '),
      password,
      role: user.role,
    });
    await pool.query('UPDATE users SET pending_credential_email = NULL WHERE id = ?', [user.id]);
    return res.json({ emailSent: true });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (rollbackError) {
        console.error('[Users API] Credential resend rollback failed:', rollbackError.message);
      }
    }
    console.error('[Users API] Credential resend failed:', error.message);
    if (String(error.message || '').startsWith('EmailJS')) {
      return res.status(502).json({
        error: needsNewPassword
          ? 'The password was updated, but the credential email was not confirmed. Retry sending credentials.'
          : 'The credential email was not confirmed. Retry sending credentials.',
        emailSent: false,
        passwordChanged: needsNewPassword,
      });
    }
    return res.status(500).json({ error: 'Unable to resend credentials.' });
  } finally {
    connection?.release();
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

    const nextEmail = String(email || '').trim().toLowerCase();
    if (nextEmail) {
      const [duplicates] = await pool.query(
        'SELECT id FROM users WHERE LOWER(TRIM(email)) = ? AND id <> ? LIMIT 1',
        [nextEmail, id],
      );
      if (duplicates.length) {
        return res.status(409).json({ error: 'A user with this email address already exists.' });
      }
    }
    if (contactNumber !== undefined && contactNumber) {
      const normalizedContact = String(contactNumber).replace(/\D/g, '');
      const [duplicates] = await pool.query(
        `SELECT id FROM users
         WHERE REPLACE(REPLACE(REPLACE(contact_number, '+', ''), ' ', ''), '-', '') = ?
           AND id <> ?
         LIMIT 1`,
        [normalizedContact, id],
      );
      if (duplicates.length) {
        return res.status(409).json({ error: 'A user with this contact number already exists.' });
      }
    }

    if (password) {
      const hash = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      params.push(hash);
      updates.push('auth_version = auth_version + 1');
      updates.push('pending_credential_email = NULL');
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
    if (err?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A user with this email address already exists.' });
    }
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
