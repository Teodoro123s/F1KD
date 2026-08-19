const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const { verifyToken, requireRole } = require('../middleware/auth');

function normalizeDbStatus(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'active';
  if (['active', 'enabled'].includes(normalized)) return 'active';
  if (['suspended', 'inactive', 'disabled'].includes(normalized)) return 'inactive';
  if (['pending'].includes(normalized)) return 'pending';
  return 'active';
}

// Helper: normalize searchable name/value
function nameLike(column) {
  // use COALESCE to prefer full_name, fall back to username
  return `COALESCE(full_name, username)`;
}

// GET /api/users?search=&role=&status=&page=1&perPage=10
router.get('/', async (req, res) => {
  try {
    const { search = '', role, status, page = 1, perPage = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(perPage);

    const filters = [];
    const params = [];
    if (search) {
      filters.push(`( ${nameLike()} LIKE ? OR email LIKE ? OR username LIKE ? )`);
      const s = `%${search}%`;
      params.push(s, s, s);
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
      `SELECT id, username, full_name, email, role, status, first_name, last_name, middle_initial, contact_number, gender, dob, location, created_at, updated_at FROM users ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
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
router.post('/', verifyToken, requireRole('Superadmin','Admin'), async (req, res) => {
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
    } = req.body;

    // build username and full_name from provided fields if necessary
    const userName = username || (email ? email.split('@')[0] : null);
    const full_name = fullName || (firstName || lastName ? `${(firstName||'').trim()} ${(lastName||'').trim()}`.trim() : null);

    if (!userName || !email) return res.status(400).json({ error: 'username and email are required' });

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
      `INSERT INTO users (username, email, full_name, role, status, password_hash, first_name, last_name, middle_initial, contact_number, gender, dob, location)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userName,
        email,
        full_name || null,
        role || 'user',
        dbStatus,
        hash,
        firstName || '',
        lastName || '',
        middleInitial || null,
        contactNumber || null,
        gender || 'Male',
        dob || null,
        location || null
      ]
    );

    const [rows] = await pool.query(
      `SELECT id, username, full_name, email, role, status, first_name, last_name, middle_initial, contact_number, gender, dob, location, created_at
       FROM users WHERE id = ?`,
      [result.insertId]
    );
    const user = rows[0];
    // Return created user WITHOUT plaintext password for security.
    res.status(201).json({ user });
  } catch (err) {
    console.error('[Users API] POST / error:', err.message);
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email or username already exists' });
    res.status(500).json({ error: 'db error' });
  }
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT id, username, full_name, email, role, status, first_name, last_name, middle_initial, contact_number, gender, dob, location, created_at
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
router.put('/:id', verifyToken, async (req, res) => {
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
    } = req.body;

    const updates = [];
    const params = [];
    if (username) { updates.push('username = ?'); params.push(username); }
    if (email) { updates.push('email = ?'); params.push(email); }
    if (fullName !== undefined) { updates.push('full_name = ?'); params.push(fullName || null); }
    if (firstName !== undefined) { updates.push('first_name = ?'); params.push(firstName); }
    if (lastName !== undefined) { updates.push('last_name = ?'); params.push(lastName); }
    if (middleInitial !== undefined) { updates.push('middle_initial = ?'); params.push(middleInitial || null); }
    if (contactNumber !== undefined) { updates.push('contact_number = ?'); params.push(contactNumber || null); }
    if (gender !== undefined) { updates.push('gender = ?'); params.push(gender || 'Male'); }
    if (dob !== undefined) { updates.push('dob = ?'); params.push(dob || null); }
    if (location !== undefined) { updates.push('location = ?'); params.push(location || null); }
    if (role !== undefined) { updates.push('role = ?'); params.push(role); }
    if (status !== undefined) { updates.push('status = ?'); params.push(normalizeDbStatus(status)); }

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
      `SELECT id, username, full_name, email, role, status, first_name, last_name, middle_initial, contact_number, gender, dob, location, updated_at
       FROM users WHERE id = ?`,
      [id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('[Users API] PUT /:id error:', err.message);
    res.status(500).json({ error: 'db error' });
  }
});

// DELETE /api/users/:id
// Require authentication to delete users (only Superadmin/Admin)
router.delete('/:id', verifyToken, requireRole('Superadmin','Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    res.status(204).end();
  } catch (err) {
    console.error('[Users API] DELETE /:id error:', err.message);
    res.status(500).json({ error: 'db error' });
  }
});

// PATCH /api/users/:id/status - toggle or set status
// Require authentication to change status
router.patch('/:id/status', verifyToken, requireRole('Superadmin','Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status required' });
    const dbStatus = normalizeDbStatus(status);
    await pool.query('UPDATE users SET status = ? WHERE id = ?', [dbStatus, id]);
    res.json({ ok: true, status: dbStatus });
  } catch (err) {
    console.error('[Users API] PATCH /:id/status error:', err.message);
    res.status(500).json({ error: 'db error' });
  }
});

module.exports = router;
