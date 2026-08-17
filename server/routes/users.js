const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET /api/users?search=&role=&status=&page=1&perPage=10
router.get('/', async (req, res) => {
  try {
    const { search = '', role, status, page = 1, perPage = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(perPage);

    const filters = [];
    const params = [];
    if (search) {
      filters.push("(CONCAT(first_name, ' ', IFNULL(middle_initial,''), ' ', last_name) LIKE ? OR email LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
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
      `SELECT id, first_name, last_name, middle_initial, contact_number, email, gender, dob, location, role, status, created_at, updated_at FROM users ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, Number(perPage), Number(offset)]
    );

    res.json({ total, users: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db error' });
  }
});

// POST /api/users
// Require authentication to create users (only Admin/Superadmin allowed in this example)
router.post('/', verifyToken, requireRole('Superadmin','Admin'), async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      middleInitial,
      contactNumber,
      email,
      gender,
      dob,
      location,
      role,
      status,
      password,
    } = req.body;

    if (!firstName || !lastName || !email) return res.status(400).json({ error: 'firstName, lastName and email are required' });

    // generate password if none provided
    let plainPassword = password;
    if (!plainPassword || plainPassword.length < 8) {
      // Desired default format: Surname-like (spaces -> hyphens, keep casing) + '.' + 3 random digits, e.g. "Sta-Ana.223"
      let lastNameRaw = (lastName || '').trim();
      if (!lastNameRaw && req.body.name) {
        const parts = req.body.name.trim().split(/\s+/);
        if (parts.length > 1) lastNameRaw = parts[parts.length - 1];
        else if (parts.length === 1) lastNameRaw = parts[0];
      }
      let surname = (lastNameRaw || '').replace(/\s+/g, '-').replace(/[^A-Za-z\-]/g, '');
      if (!surname) surname = 'user';
      const rand3 = Math.floor(100 + Math.random() * 900);
      plainPassword = `${surname}.${rand3}`;
      while (plainPassword.length < 8) {
        plainPassword += Math.floor(Math.random() * 10).toString();
      }
    }
    const hash = await bcrypt.hash(plainPassword, 10);

    const [result] = await pool.query(
      `INSERT INTO users (first_name, last_name, middle_initial, contact_number, email, gender, dob, location, role, status, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [firstName, lastName, middleInitial || null, contactNumber || null, email, gender || 'Male', dob || null, location || null, role || null, status || 'Active', hash]
    );

    const [rows] = await pool.query('SELECT id, first_name, last_name, middle_initial, contact_number, email, gender, dob, location, role, status, created_at FROM users WHERE id = ?', [result.insertId]);
    const user = rows[0];
    // For development convenience only: store the plaintext temp password in a DB column when not in production.
    // Do NOT return plaintext in the API response. The frontend should display the pre-computed password once in the UI.
    // Return created user WITHOUT plaintext password for security.
    res.status(201).json({ user });
  } catch (err) {
    console.error(err);
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'db error' });
  }
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT id, first_name, last_name, middle_initial, contact_number, email, gender, dob, location, role, status, created_at FROM users WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db error' });
  }
});

// PUT /api/users/:id
// Require authentication to update users
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      middleInitial,
      contactNumber,
      email,
      gender,
      dob,
      location,
      role,
      status,
      password,
    } = req.body;

    const updates = [];
    const params = [];
    if (firstName) { updates.push('first_name = ?'); params.push(firstName); }
    if (lastName) { updates.push('last_name = ?'); params.push(lastName); }
    if (middleInitial !== undefined) { updates.push('middle_initial = ?'); params.push(middleInitial || null); }
    if (contactNumber !== undefined) { updates.push('contact_number = ?'); params.push(contactNumber || null); }
    if (email) { updates.push('email = ?'); params.push(email); }
    if (gender) { updates.push('gender = ?'); params.push(gender); }
    if (dob !== undefined) { updates.push('dob = ?'); params.push(dob || null); }
    if (location !== undefined) { updates.push('location = ?'); params.push(location); }
    if (role !== undefined) { updates.push('role = ?'); params.push(role); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }

    if (password) {
      const hash = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      params.push(hash);
    }

    if (!updates.length) return res.status(400).json({ error: 'No fields to update' });

    params.push(id);
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    await pool.query(sql, params);

    const [rows] = await pool.query('SELECT id, first_name, last_name, middle_initial, contact_number, email, gender, dob, location, role, status, updated_at FROM users WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
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
    console.error(err);
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
    await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db error' });
  }
});

module.exports = router;
