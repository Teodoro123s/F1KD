const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || '7d';
const { verifyToken } = require('../middleware/auth');
const { ensureSuperadminAccount } = require('../services/superadminRecovery');
const { sendPasswordResetCode } = require('../services/emailjs');
const { getPasswordPolicyError } = require('../services/passwordPolicy');

const PASSWORD_RESET_TTL_MINUTES = 15;
const PASSWORD_RESET_RESEND_SECONDS = 60;
const PASSWORD_RESET_MAX_ATTEMPTS = 5;

function hashPasswordResetCode(userId, code) {
  return crypto.createHmac('sha256', JWT_SECRET).update(`${userId}:${code}`).digest('hex');
}

function safeHashEqual(expectedHash, actualHash) {
  const expected = Buffer.from(expectedHash, 'hex');
  const actual = Buffer.from(actualHash, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

const buildUserPayload = (user) => {
  const role = String(user.role || 'User').trim() || 'User';
  const firstName = String(user.first_name || '').trim();
  const middleInitial = String(user.middle_initial || '').trim();
  const lastName = String(user.last_name || '').trim();
  const derivedName = [firstName, middleInitial, lastName].filter(Boolean).join(' ');
  const name = String(user.name || user.full_name || user.username || derivedName || 'User').trim() || 'User';

  return {
    id: user.id,
    auth_version: Number(user.auth_version || 0),
    role,
    name,
    first_name: firstName,
    middle_initial: middleInitial,
    last_name: lastName,
    email: user.email,
    status: user.status || 'Active',
    school_id: user.school_id ?? null,
    group_id: user.group_id ?? null,
    contact_number: user.contact_number || null,
    location: user.location || null,
  };
};

const issueTokens = (res, user) => {
  const payload = buildUserPayload(user);
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  const refreshToken = jwt.sign({ id: payload.id, auth_version: payload.auth_version, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_TTL });

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

    await ensureSuperadminAccount(pool);

    const [rows] = await pool.query(
        `SELECT id, first_name, last_name, middle_initial, email, role, status, school_id, group_id, contact_number, password_hash, auth_version
       FROM users
         WHERE email = ?
       LIMIT 1`,
      [email]
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

router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    if (!currentPassword || !newPassword || newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Current password and matching new passwords are required' });
    }
    const passwordPolicyError = getPasswordPolicyError(newPassword);
    if (passwordPolicyError) {
      return res.status(400).json({ error: passwordPolicyError });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from the current password' });
    }

    const [rows] = await pool.query(
      'SELECT id, password_hash FROM users WHERE id = ? OR LOWER(TRIM(email)) = LOWER(TRIM(?)) LIMIT 1',
      [req.user.id, req.user.email],
    );
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Your session is no longer linked to an account. Please sign in again.' });
    }
    if (!(await bcrypt.compare(currentPassword, user.password_hash || ''))) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password_hash = ?, auth_version = auth_version + 1, pending_credential_email = NULL WHERE id = ?',
      [passwordHash, user.id],
    );
    return res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error.message);
    return res.status(500).json({ error: 'Unable to change password' });
  }
});

router.post('/password-reset/request', verifyToken, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [users] = await connection.query(
      'SELECT id, email, first_name, middle_initial, last_name FROM users WHERE id = ? LIMIT 1 FOR UPDATE',
      [req.user.id],
    );
    const user = users[0];
    if (!user?.email) {
      await connection.rollback();
      return res.status(400).json({ error: 'No email address is configured for this account.' });
    }

    const [existingCodes] = await connection.query(
      'SELECT requested_at FROM user_password_reset_codes WHERE user_id = ? LIMIT 1',
      [user.id],
    );
    if (existingCodes.length) {
      const lastRequestedAt = new Date(existingCodes[0].requested_at).getTime();
      const waitMilliseconds = PASSWORD_RESET_RESEND_SECONDS * 1000 - (Date.now() - lastRequestedAt);
      if (waitMilliseconds > 0) {
        await connection.rollback();
        return res.status(429).json({
          error: `Please wait ${Math.ceil(waitMilliseconds / 1000)} seconds before requesting another code.`,
        });
      }
    }

    const code = String(crypto.randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);
    const expiresTimeLabel = expiresAt.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' });
    const name = [user.first_name, user.middle_initial, user.last_name].filter(Boolean).join(' ').trim() || 'User';

    await connection.query(
      `INSERT INTO user_password_reset_codes (user_id, code_hash, expires_at, requested_at, attempts)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP, 0)
       ON DUPLICATE KEY UPDATE
         code_hash = VALUES(code_hash),
         expires_at = VALUES(expires_at),
         requested_at = CURRENT_TIMESTAMP,
         attempts = 0`,
      [user.id, hashPasswordResetCode(user.id, code), expiresAt],
    );
    await sendPasswordResetCode({
      email: user.email,
      name,
      passcode: code,
      time: expiresTimeLabel,
    });
    await connection.commit();
    connection.release();
    connection = null;
    return res.json({ message: `A verification code was sent to ${user.email}. It expires in ${PASSWORD_RESET_TTL_MINUTES} minutes.` });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (rollbackError) {
        console.error('Password reset request rollback failed:', rollbackError.message);
      }
    }
    console.error('Password reset email request failed:', error.message);
    if (String(error.message || '').startsWith('EmailJS')) {
      return res.status(502).json({ error: 'Unable to send the verification email. Please try again later.' });
    }
    return res.status(500).json({ error: 'Unable to request a verification code. Please try again.' });
  } finally {
    connection?.release();
  }
});

router.post('/password-reset/confirm', verifyToken, async (req, res) => {
  const { passcode, newPassword, confirmPassword } = req.body || {};
  if (!/^\d{6}$/.test(String(passcode || ''))) {
    return res.status(400).json({ error: 'Enter the six-digit verification code from your email.' });
  }
  const passwordPolicyError = getPasswordPolicyError(newPassword);
  if (passwordPolicyError) {
    return res.status(400).json({ error: passwordPolicyError });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'New passwords do not match.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [codes] = await connection.query(
      'SELECT code_hash, expires_at, attempts FROM user_password_reset_codes WHERE user_id = ? FOR UPDATE',
      [req.user.id],
    );
    const resetCode = codes[0];
    if (!resetCode || new Date(resetCode.expires_at).getTime() <= Date.now()) {
      await connection.query('DELETE FROM user_password_reset_codes WHERE user_id = ?', [req.user.id]);
      await connection.commit();
      return res.status(400).json({ error: 'The verification code is invalid or expired. Request a new code.' });
    }

    if (Number(resetCode.attempts) >= PASSWORD_RESET_MAX_ATTEMPTS) {
      await connection.query('DELETE FROM user_password_reset_codes WHERE user_id = ?', [req.user.id]);
      await connection.commit();
      return res.status(429).json({ error: 'Too many incorrect attempts. Request a new verification code.' });
    }

    const submittedHash = hashPasswordResetCode(req.user.id, String(passcode));
    if (!safeHashEqual(resetCode.code_hash, submittedHash)) {
      await connection.query(
        'UPDATE user_password_reset_codes SET attempts = attempts + 1 WHERE user_id = ?',
        [req.user.id],
      );
      await connection.commit();
      return res.status(400).json({ error: 'The verification code is incorrect.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await connection.query(
      'UPDATE users SET password_hash = ?, auth_version = auth_version + 1, pending_credential_email = NULL WHERE id = ?',
      [passwordHash, req.user.id],
    );
    await connection.query('DELETE FROM user_password_reset_codes WHERE user_id = ?', [req.user.id]);
    await connection.commit();
    return res.json({ message: 'Password reset successfully.' });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (rollbackError) {
        console.error('Password reset rollback failed:', rollbackError.message);
      }
    }
    console.error('Password reset confirmation failed:', error.message);
    return res.status(500).json({ error: 'Unable to reset password. Please try again.' });
  } finally {
    connection?.release();
  }
});

router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies && req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ status: 401, code: 'REFRESH_TOKEN_MISSING', message: 'Refresh token is missing', timestamp: new Date().toISOString() });
  }

  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET);
    if (payload.type !== 'refresh') {
      return res.status(401).json({ status: 401, code: 'INVALID_REFRESH_TOKEN', message: 'Invalid refresh token', timestamp: new Date().toISOString() });
    }

    const [rows] = await pool.query(
      `SELECT id, first_name, last_name, middle_initial, email, role, status, school_id, group_id, contact_number, auth_version FROM users WHERE id = ? LIMIT 1`,
      [payload.id]
    );

    const user = rows && rows[0];
    if (!user) {
      return res.status(401).json({ status: 401, code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token is invalid', timestamp: new Date().toISOString() });
    }
    if (Number(payload.auth_version || 0) !== Number(user.auth_version || 0)) {
      return res.status(401).json({ status: 401, code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token is invalid', timestamp: new Date().toISOString() });
    }

    const tokens = issueTokens(res, user);
    return res.json(tokens);
  } catch (error) {
    return res.status(401).json({ status: 401, code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token is invalid or expired', timestamp: new Date().toISOString() });
  }
});

router.get('/me', verifyToken, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;