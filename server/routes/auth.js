const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const [rows] = await pool.query(
      `SELECT id, username, full_name, email, role, status, password_hash
       FROM users
       WHERE email = ? OR username = ?
       LIMIT 1`,
      [email, email]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const normalizedStatus = String(user.status || '').trim().toLowerCase();
    if (normalizedStatus === 'inactive' || normalizedStatus === 'pending' || normalizedStatus === 'suspended') {
      return res.status(403).json({ error: 'Account suspended' });
    }

    const ok = await bcrypt.compare(password, user.password_hash || '');
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const role = String(user.role || 'User').trim() || 'User';
    const name = String(user.full_name || user.username || 'User').trim() || 'User';

    const payload = {
      id: user.id,
      role,
      name,
      email: user.email,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.json({ token, user: payload });
  } catch (err) {
    console.error('Auth login error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
const { verifyToken } = require('../middleware/auth');
router.get('/me', verifyToken, async (req, res) => {
  // req.user set by verifyToken
  res.json({ user: req.user });
});

module.exports = router;