const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || '7d';
const { verifyToken } = require('../middleware/auth');

const buildUserPayload = (user) => {
  const role = String(user.role || 'User').trim() || 'User';
  const name = String(user.full_name || user.username || 'User').trim() || 'User';

  return {
    id: user.id,
    role,
    name,
    email: user.email,
    school_id: user.school_id || null,
  };
};

const issueTokens = (res, user) => {
  const payload = buildUserPayload(user);
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  const refreshToken = jwt.sign({ id: payload.id, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_TTL });

  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return { token: accessToken, refreshToken, user: payload };
};

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ status: 400, code: 'VALIDATION_ERROR', message: 'email and password required', timestamp: new Date().toISOString() });
    }

    const [rows] = await pool.query(
      `SELECT id, username, full_name, email, role, status, school_id, password_hash
       FROM users
       WHERE email = ? OR username = ?
       LIMIT 1`,
      [email, email]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid credentials', timestamp: new Date().toISOString() });

    const normalizedStatus = String(user.status || '').trim().toLowerCase();
    if (normalizedStatus === 'inactive' || normalizedStatus === 'pending' || normalizedStatus === 'suspended') {
      return res.status(403).json({ status: 403, code: 'ACCOUNT_SUSPENDED', message: 'Account suspended', timestamp: new Date().toISOString() });
    }

    const ok = await bcrypt.compare(password, user.password_hash || '');
    if (!ok) return res.status(401).json({ status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid credentials', timestamp: new Date().toISOString() });

    const tokens = issueTokens(res, user);
    res.json(tokens);
  } catch (err) {
    console.error('Auth login error:', err.message);
    res.status(500).json({ status: 500, code: 'SERVER_ERROR', message: 'Server error', timestamp: new Date().toISOString() });
  }
});

router.post('/refresh', (req, res) => {
  const refreshToken = req.cookies && req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ status: 401, code: 'REFRESH_TOKEN_MISSING', message: 'Refresh token is missing', timestamp: new Date().toISOString() });
  }

  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET);
    if (payload.type !== 'refresh') {
      return res.status(401).json({ status: 401, code: 'INVALID_REFRESH_TOKEN', message: 'Invalid refresh token', timestamp: new Date().toISOString() });
    }

    const userId = payload.id;
    pool.query(
      `SELECT id, username, full_name, email, role, status, school_id FROM users WHERE id = ? LIMIT 1`,
      [userId],
      (error, [rows]) => {
        if (error) {
          console.error('Refresh token query error:', error.message);
          return res.status(500).json({ status: 500, code: 'SERVER_ERROR', message: 'Server error', timestamp: new Date().toISOString() });
        }

        const user = rows && rows[0];
        if (!user) {
          return res.status(401).json({ status: 401, code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token is invalid', timestamp: new Date().toISOString() });
        }

        const tokens = issueTokens(res, user);
        return res.json(tokens);
      }
    );
  } catch (error) {
    return res.status(401).json({ status: 401, code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token is invalid or expired', timestamp: new Date().toISOString() });
  }
});

router.get('/me', verifyToken, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;