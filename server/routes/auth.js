const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || '7d';
const { verifyToken } = require('../middleware/auth');
const { ensureSuperadminAccount } = require('../services/superadminRecovery');
const {
  getEmailJsConfig,
  sendPasswordResetCodeEmail,
} = require('../services/emailjs');
const { recordActivity } = require('../services/activityLog');
const {
  isValidEmail,
  normalizeEmail,
  validateAccountPassword,
} = require('../utils/userInputValidation');

const passwordResetRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset requests. Please try again later.' },
});
const passwordResetSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset attempts. Please try again later.' },
});

function hashResetCode(email, code) {
  return crypto.createHmac('sha256', JWT_SECRET).update(`${email}:${code}`).digest('hex');
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

const TEST_ROLE_ALIASES = {
  super_admin: ['super_admin', 'superadmin', 'super admin'],
  admin: ['admin', 'administrator'],
  partner: ['partner'],
  community_coordinator: [
    'community_coordinator',
    'community coordinator',
    'communityorganizer',
    'community organizer',
    'coordinator',
    'co',
  ],
  health_worker: ['health_worker', 'healthworker', 'health worker'],
};

const LOCAL_TEST_ROLE_DEFAULTS = {
  super_admin: {
    first_name: 'Test',
    last_name: 'Super Admin',
    email: 'super_admin@local.test',
    role: 'Superadmin',
    status: 'Active',
    school_id: null,
    group_id: null,
  },
  admin: {
    first_name: 'Test',
    last_name: 'Admin',
    email: 'admin@local.test',
    role: 'Admin',
    status: 'Active',
    school_id: null,
    group_id: null,
  },
  partner: {
    first_name: 'Test',
    last_name: 'Partner',
    email: 'partner@local.test',
    role: 'Partner',
    status: 'Active',
    school_id: null,
    group_id: null,
  },
  community_coordinator: {
    first_name: 'Test',
    last_name: 'Community Organizer',
    email: 'community_coordinator@local.test',
    role: 'Community Organizer',
    status: 'Active',
    school_id: 1,
    group_id: null,
  },
  health_worker: {
    first_name: 'Test',
    last_name: 'Health Worker',
    email: 'health_worker@local.test',
    role: 'Health worker',
    status: 'Active',
    school_id: 1,
    group_id: 1,
  },
};

async function ensureLocalTestRoleAccount(roleKey) {
  const aliases = TEST_ROLE_ALIASES[roleKey];
  if (!aliases) return null;
  const placeholders = aliases.map(() => '?').join(', ');
  const [existingRows] = await pool.query(
    `SELECT id, first_name, last_name, middle_initial, email, role, status,
        school_id, group_id, contact_number, location
     FROM users
     WHERE LOWER(TRIM(role)) IN (${placeholders})
       AND LOWER(TRIM(status)) IN ('active', 'enabled')
     ORDER BY (school_id IS NOT NULL) DESC, (group_id IS NOT NULL) DESC, id DESC
     LIMIT 1`,
    aliases,
  );

  if (existingRows.length) return existingRows[0];

  const defaults = LOCAL_TEST_ROLE_DEFAULTS[roleKey];
  if (!defaults) return null;

  const passwordHash = await bcrypt.hash('Password123!', 10);
  try {
    const [result] = await pool.query(
      `INSERT INTO users
        (first_name, last_name, email, role, status, password_hash, gender, school_id, group_id, contact_number, location)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        defaults.first_name,
        defaults.last_name,
        defaults.email,
        defaults.role,
        defaults.status,
        passwordHash,
        'Other',
        defaults.school_id,
        defaults.group_id,
        null,
        null,
      ],
    );

    return {
      id: result.insertId,
      first_name: defaults.first_name,
      last_name: defaults.last_name,
      middle_initial: null,
      email: defaults.email,
      role: defaults.role,
      status: defaults.status,
      school_id: defaults.school_id,
      group_id: defaults.group_id,
      contact_number: null,
      location: null,
      password_hash: passwordHash,
    };
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      const [retries] = await pool.query(
        `SELECT id, first_name, last_name, middle_initial, email, role, status,
            school_id, group_id, contact_number, location
         FROM users
         WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))
         LIMIT 1`,
        [defaults.email],
      );
      return retries[0] || null;
    }
    throw error;
  }
}

function normalizeIp(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/^::ffff:/, '')
    .replace(/\[|\]/g, '')
    .trim();
}

function isLoopbackAddress(address = '') {
  const normalized = normalizeIp(address);
  return normalized === '127.0.0.1'
    || normalized === '::1'
    || normalized.startsWith('127.')
    || normalized.startsWith('::ffff:127.');
}

function isLocalLoopbackRequest(req) {
  const headers = req.headers || {};
  const host = String(headers.host || '').split(':')[0].toLowerCase();
  const origin = String(headers.origin || '').replace(/^https?:\/\//i, '').split(':')[0].toLowerCase();
  const forwardedFor = String(headers['x-forwarded-for'] || '').split(',')[0].trim();
  const realIp = String(headers['x-real-ip'] || '').trim();
  const remoteAddress = normalizeIp(req.socket?.remoteAddress || '');
  const requestIp = normalizeIp(req.ip || '');

  return host === 'localhost'
    || host === '127.0.0.1'
    || host === '::1'
    || origin === 'localhost'
    || origin === '127.0.0.1'
    || isLoopbackAddress(remoteAddress)
    || isLoopbackAddress(forwardedFor)
    || isLoopbackAddress(realIp)
    || isLoopbackAddress(requestIp);
}

router.post('/test-role', async (req, res) => {
  const localDevelopment = process.env.NODE_ENV === 'development' && isLocalLoopbackRequest(req);
  const explicitlyEnabled = process.env.ENABLE_TEST_ROLE_SHORTCUTS === 'true';
  const localhostAllowed = isLocalLoopbackRequest(req);
  if (!localDevelopment && !explicitlyEnabled && !localhostAllowed) {
    return res.status(404).json({ error: 'Not found' });
  }

  const roleKey = String(req.body?.role || '').trim().toLowerCase();
  const aliases = TEST_ROLE_ALIASES[roleKey];
  if (!aliases) return res.status(400).json({ error: 'Select a supported test role' });

  try {
    const placeholders = aliases.map(() => '?').join(', ');
    const [rows] = await pool.query(
      `SELECT id, first_name, last_name, middle_initial, email, role, status,
          school_id, group_id, contact_number, location
       FROM users
       WHERE LOWER(TRIM(role)) IN (${placeholders})
         AND LOWER(TRIM(status)) IN ('active', 'enabled')
       ORDER BY (school_id IS NOT NULL) DESC, (group_id IS NOT NULL) DESC, id DESC
       LIMIT 1`,
      aliases,
    );
    const matchedUser = rows[0] || await ensureLocalTestRoleAccount(roleKey);
    if (!matchedUser) {
      return res.status(404).json({ error: 'No active account exists for this role' });
    }
    return res.json(issueTokens(res, matchedUser));
  } catch (error) {
    console.error('[Auth API] Test role sign-in error:', error.message);
    return res.status(500).json({ error: 'Unable to sign in to the selected test role' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;
    if (!email || typeof password !== 'string' || !password) {
      return res.status(400).json({ status: 400, code: 'VALIDATION_ERROR', message: 'email and password required', timestamp: new Date().toISOString() });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ status: 400, code: 'VALIDATION_ERROR', message: 'Enter a valid email address', timestamp: new Date().toISOString() });
    }

    await ensureSuperadminAccount(pool);

    const [rows] = await pool.query(
        `SELECT id, first_name, last_name, middle_initial, email, role, status, school_id, group_id, contact_number, password_hash
       FROM users
         WHERE LOWER(TRIM(email)) = ?
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

    await recordActivity({
      actor: { ...user, name: [user.first_name, user.middle_initial, user.last_name].filter(Boolean).join(' ') },
      category: 'User Management',
      action: 'sign_in',
      entityType: 'user',
      entityId: user.id,
      description: 'Signed in',
    });
    const tokens = issueTokens(res, user);
    res.json(tokens);
  } catch (err) {
    console.error('Auth login error:', err.message);
    res.status(500).json({ status: 500, code: 'SERVER_ERROR', message: 'Server error', timestamp: new Date().toISOString() });
  }
});

router.post('/forgot-password', passwordResetRequestLimiter, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Enter a valid email address' });
  }

  try {
    getEmailJsConfig('otp');
  } catch (error) {
    console.error('[Auth API] Password reset email configuration error:', error.message);
    return res.status(503).json({ error: 'Password reset email is not configured. Please contact an administrator.' });
  }

  try {
    const [users] = await pool.query(
      `SELECT id, email, first_name, middle_initial, last_name
       FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1`,
      [email],
    );

    if (users.length) {
      const user = users[0];
      const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
      await pool.query(
        `INSERT INTO password_reset_codes (email, code_hash, expires_at, attempts)
         VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 15 MINUTE), 0)
         ON DUPLICATE KEY UPDATE code_hash = VALUES(code_hash),
           expires_at = VALUES(expires_at), attempts = 0, created_at = CURRENT_TIMESTAMP`,
        [email, hashResetCode(email, code)],
      );

      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const time = expiresAt.toLocaleTimeString('en-US', {
        timeZone: 'UTC',
        hour: 'numeric',
        minute: '2-digit',
      });
      const name = [user.first_name, user.middle_initial, user.last_name].filter(Boolean).join(' ') || 'F1KD user';
      try {
        await sendPasswordResetCodeEmail({
          email: user.email,
          name,
          passcode: code,
          time,
        });
      } catch (emailError) {
        await pool.query('DELETE FROM password_reset_codes WHERE email = ?', [email]);
        console.error('[Auth API] Unable to send password reset code:', emailError.message);
        return res.status(503).json({ error: 'Unable to send a verification code right now. Please try again later.' });
      }
    }

    return res.json({
      message: 'If an account exists for that email, a verification code has been sent.',
    });
  } catch (error) {
    console.error('[Auth API] Password reset request error:', error.message);
    return res.status(500).json({ error: 'Unable to start password reset. Please try again later.' });
  }
});

router.post('/reset-password', passwordResetSubmitLimiter, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const code = String(req.body?.passcode || '').trim();
  const newPassword = req.body?.newPassword;
  const confirmPassword = req.body?.confirmPassword;
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Enter a valid email address' });
  }
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'Enter the six-digit verification code' });
  }
  const passwordError = validateAccountPassword(newPassword, 'New password');
  if (passwordError) return res.status(400).json({ error: passwordError });
  if (typeof confirmPassword !== 'string') {
    return res.status(400).json({ error: 'Confirm your new password' });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'The new passwords do not match' });
  }

  let connection;
  try {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [codes] = await connection.query(
      `SELECT code_hash, attempts, expires_at > UTC_TIMESTAMP() AS is_unexpired
       FROM password_reset_codes WHERE email = ? FOR UPDATE`,
      [email],
    );
    const reset = codes[0];
    if (!reset || !reset.is_unexpired) {
      if (reset) await connection.query('DELETE FROM password_reset_codes WHERE email = ?', [email]);
      await connection.commit();
      return res.status(400).json({ error: 'The verification code is invalid or expired. Request a new code.' });
    }

    const expectedHash = Buffer.from(reset.code_hash, 'hex');
    const submittedHash = Buffer.from(hashResetCode(email, code), 'hex');
    const validCode = expectedHash.length === submittedHash.length
      && crypto.timingSafeEqual(expectedHash, submittedHash);
    if (!validCode) {
      if (Number(reset.attempts) + 1 >= 5) {
        await connection.query('DELETE FROM password_reset_codes WHERE email = ?', [email]);
      } else {
        await connection.query(
          'UPDATE password_reset_codes SET attempts = attempts + 1 WHERE email = ?',
          [email],
        );
      }
      await connection.commit();
      return res.status(400).json({ error: 'The verification code is invalid or expired. Request a new code.' });
    }

    const [updated] = await connection.query(
      'UPDATE users SET password_hash = ? WHERE LOWER(TRIM(email)) = ?',
      [passwordHash, email],
    );
    await connection.query('DELETE FROM password_reset_codes WHERE email = ?', [email]);
    await connection.commit();
    if (!updated.affectedRows) {
      return res.status(400).json({ error: 'The verification code is invalid or expired. Request a new code.' });
    }
    return res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('[Auth API] Password reset submission error:', error.message);
    return res.status(500).json({ error: 'Unable to reset your password. Please try again later.' });
  } finally {
    if (connection) connection.release();
  }
});

router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    if (typeof currentPassword !== 'string' || !currentPassword
      || typeof newPassword !== 'string' || !newPassword
      || typeof confirmPassword !== 'string' || newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Current password and matching new passwords are required' });
    }
    const passwordError = validateAccountPassword(newPassword, 'New password');
    if (passwordError) return res.status(400).json({ error: passwordError });
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
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, user.id]);
    return res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error.message);
    return res.status(500).json({ error: 'Unable to change password' });
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
      `SELECT id, first_name, last_name, middle_initial, email, role, status, school_id, group_id, contact_number FROM users WHERE id = ? LIMIT 1`,
      [payload.id]
    );

    const user = rows && rows[0];
    if (!user) {
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