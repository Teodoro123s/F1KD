const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const JWT_SECRET = require('../utils/jwtSecret');
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || '7d';
const { verifyToken, verifyTokenAllowUnconsented } = require('../middleware/auth');
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

const MAX_LOGIN_ATTEMPTS = Number(process.env.LOGIN_RATE_LIMIT_MAX || 5);
const LOGIN_LOCKOUT_SECONDS = Number(process.env.LOGIN_LOCKOUT_SECONDS || 30);
if (!Number.isSafeInteger(MAX_LOGIN_ATTEMPTS) || MAX_LOGIN_ATTEMPTS < 1) {
  throw new Error('LOGIN_RATE_LIMIT_MAX must be a positive integer');
}
if (!Number.isSafeInteger(LOGIN_LOCKOUT_SECONDS) || LOGIN_LOCKOUT_SECONDS < 1) {
  throw new Error('LOGIN_LOCKOUT_SECONDS must be a positive integer');
}
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), 10);

const loginStatusLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login status requests. Please try again later.' },
});

function hashResetCode(email, code) {
  return crypto.createHmac('sha256', JWT_SECRET).update(`${email}:${code}`).digest('hex');
}

function getLoginAttemptKey(email) {
  return crypto.createHmac('sha256', JWT_SECRET).update(email).digest('hex');
}

function getLoginAttemptStatus(row) {
  if (!row) {
    return {
      maxAttempts: MAX_LOGIN_ATTEMPTS,
      remainingAttempts: MAX_LOGIN_ATTEMPTS,
      retryAfterSeconds: 0,
      lockedUntil: null,
    };
  }

  const retryAfterSeconds = Math.max(0, Number(row.retry_after_seconds) || 0);
  const isLocked = retryAfterSeconds > 0;
  const lockedUntilMs = Number(row.locked_until_ms);
  const expiredLock = row.locked_until_ms !== null && row.locked_until_ms !== undefined
    && Number.isFinite(lockedUntilMs)
    && !isLocked;
  const failedAttempts = isLocked
    ? MAX_LOGIN_ATTEMPTS
    : expiredLock ? 0 : Number(row.failed_attempts || 0);
  return {
    maxAttempts: MAX_LOGIN_ATTEMPTS,
    remainingAttempts: isLocked
      ? 0
      : Math.max(0, MAX_LOGIN_ATTEMPTS - failedAttempts),
    retryAfterSeconds,
    lockedUntil: isLocked && Number.isFinite(lockedUntilMs)
      ? new Date(lockedUntilMs).toISOString()
      : null,
  };
}

async function loadLoginAttemptStatus(email) {
  const [rows] = await pool.query(
    `SELECT failed_attempts, locked_until,
        UNIX_TIMESTAMP(locked_until) * 1000 AS locked_until_ms,
        GREATEST(CEIL(TIMESTAMPDIFF(MICROSECOND, UTC_TIMESTAMP(6), locked_until) / 1000000), 0) AS retry_after_seconds
     FROM login_attempts
     WHERE email_key = ?`,
    [getLoginAttemptKey(email)],
  );
  return getLoginAttemptStatus(rows[0]);
}

async function authenticateLogin(email, password) {
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const emailKey = getLoginAttemptKey(email);
    await connection.query(
      'INSERT IGNORE INTO login_attempts (email_key, failed_attempts) VALUES (?, 0)',
      [emailKey],
    );
    const [attemptRows] = await connection.query(
      `SELECT failed_attempts, locked_until,
          UNIX_TIMESTAMP(locked_until) * 1000 AS locked_until_ms,
          GREATEST(CEIL(TIMESTAMPDIFF(MICROSECOND, UTC_TIMESTAMP(6), locked_until) / 1000000), 0) AS retry_after_seconds
       FROM login_attempts
       WHERE email_key = ?
       FOR UPDATE`,
      [emailKey],
    );
    const attemptRow = attemptRows[0];
    const attemptStatus = getLoginAttemptStatus(attemptRow);
    if (attemptStatus.retryAfterSeconds > 0) {
      await connection.rollback();
      transactionStarted = false;
      return { locked: true, attemptStatus };
    }
    if (attemptRow.locked_until) {
      await connection.query(
        'UPDATE login_attempts SET failed_attempts = 0, locked_until = NULL WHERE email_key = ?',
        [emailKey],
      );
      attemptRow.failed_attempts = 0;
      attemptRow.locked_until = null;
      attemptRow.locked_until_ms = null;
    }

    const [rows] = await connection.query(
      `SELECT id, first_name, last_name, middle_initial, email, role, status, archived_at, school_id, group_id, contact_number, password_hash, consent_accepted_at
       FROM users
       WHERE LOWER(TRIM(email)) = ?
       LIMIT 1`,
      [email],
    );
    const user = rows[0];
    const passwordMatches = await bcrypt.compare(password, user?.password_hash || DUMMY_PASSWORD_HASH);
    const normalizedStatus = String(user?.status || '').trim().toLowerCase();
    const accountIsActive = !user?.archived_at
      && !['inactive', 'pending', 'suspended', 'disabled'].includes(normalizedStatus);
    if (!user || !passwordMatches || !accountIsActive) {
      const failedAttempts = Number(attemptRow.failed_attempts || 0) + 1;
      if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
        await connection.query(
          `UPDATE login_attempts
           SET failed_attempts = ?, locked_until = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND)
           WHERE email_key = ?`,
          [MAX_LOGIN_ATTEMPTS, LOGIN_LOCKOUT_SECONDS, emailKey],
        );
        const [lockedRows] = await connection.query(
          `SELECT failed_attempts, locked_until,
              UNIX_TIMESTAMP(locked_until) * 1000 AS locked_until_ms,
              GREATEST(CEIL(TIMESTAMPDIFF(MICROSECOND, UTC_TIMESTAMP(6), locked_until) / 1000000), 0) AS retry_after_seconds
           FROM login_attempts
           WHERE email_key = ?`,
          [emailKey],
        );
        await connection.commit();
        transactionStarted = false;
        return { locked: true, attemptStatus: getLoginAttemptStatus(lockedRows[0]) };
      }

      await connection.query(
        `UPDATE login_attempts
         SET failed_attempts = ?, locked_until = NULL
         WHERE email_key = ?`,
        [failedAttempts, emailKey],
      );
      await connection.commit();
      transactionStarted = false;
      return {
        invalid: true,
        attemptStatus: {
          maxAttempts: MAX_LOGIN_ATTEMPTS,
          remainingAttempts: MAX_LOGIN_ATTEMPTS - failedAttempts,
          retryAfterSeconds: 0,
          lockedUntil: null,
        },
      };
    }

    await connection.query(
      'UPDATE login_attempts SET failed_attempts = 0, locked_until = NULL WHERE email_key = ?',
      [emailKey],
    );
    await connection.commit();
    transactionStarted = false;
    return { user };
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
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
    has_accepted_terms: Boolean(user.consent_accepted_at),
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

const hashRefreshToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const createRefreshToken = (userId, sessionId) => {
  const tokenId = crypto.randomUUID();
  const token = jwt.sign({ id: userId, type: 'refresh', sid: sessionId, jti: tokenId }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
  const { exp } = jwt.decode(token);
  return { token, tokenId, expiresAt: new Date(exp * 1000) };
};

const setRefreshCookie = (res, token, expiresAt) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    expires: expiresAt,
  });
};

const clearRefreshCookie = (res) => res.clearCookie('refreshToken', {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
});

const issueTokens = async (res, user) => {
  const payload = buildUserPayload(user);
  const sessionId = crypto.randomUUID();
  const refresh = createRefreshToken(payload.id, sessionId);
  const accessToken = jwt.sign({ ...payload, sid: sessionId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      `DELETE FROM auth_sessions
       WHERE expires_at <= UTC_TIMESTAMP()
          OR revoked_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY)`,
    );
    await connection.query(
      'INSERT INTO auth_sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
      [sessionId, payload.id, refresh.expiresAt],
    );
    await connection.query(
      'INSERT INTO auth_refresh_tokens (id, session_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      [refresh.tokenId, sessionId, hashRefreshToken(refresh.token), refresh.expiresAt],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  setRefreshCookie(res, refresh.token, refresh.expiresAt);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  return { token: accessToken, user: payload };
};

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

    const authentication = await authenticateLogin(email, password);
    if (authentication.locked) {
      const { attemptStatus } = authentication;
      res.setHeader('Retry-After', String(attemptStatus.retryAfterSeconds));
      return res.status(429).json({
        status: 429,
        code: 'LOGIN_LOCKED',
        message: 'Too many failed attempts. Please try again shortly.',
        ...attemptStatus,
        timestamp: new Date().toISOString(),
      });
    }
    if (authentication.invalid) {
      const { attemptStatus } = authentication;
      const message = attemptStatus.remainingAttempts === 1
        ? 'Warning: Only 1 login attempt remaining before temporary lockout.'
        : `Invalid credentials. You have ${attemptStatus.remainingAttempts} attempts remaining.`;
      return res.status(401).json({
        status: 401,
        code: 'INVALID_CREDENTIALS',
        message,
        ...attemptStatus,
        timestamp: new Date().toISOString(),
      });
    }
    const { user } = authentication;

    await recordActivity({
      actor: { ...user, name: [user.first_name, user.middle_initial, user.last_name].filter(Boolean).join(' ') },
      category: 'User Management',
      action: 'sign_in',
      entityType: 'user',
      entityId: user.id,
      description: 'Signed in',
    });
    const tokens = await issueTokens(res, user);
    res.json(tokens);
  } catch (err) {
    console.error('Auth login error:', err.message);
    res.status(500).json({ status: 500, code: 'SERVER_ERROR', message: 'Server error', timestamp: new Date().toISOString() });
  }
});

router.post('/login-status', loginStatusLimiter, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!isValidEmail(email)) {
    return res.status(400).json({ status: 400, code: 'VALIDATION_ERROR', message: 'Enter a valid email address', timestamp: new Date().toISOString() });
  }
  try {
    const attemptStatus = await loadLoginAttemptStatus(email);
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      ...attemptStatus,
      message: attemptStatus.retryAfterSeconds > 0
        ? 'Too many failed attempts. Please try again shortly.'
        : '',
    });
  } catch (error) {
    console.error('Auth login status error:', error.message);
    res.status(500).json({ status: 500, code: 'SERVER_ERROR', message: 'Unable to load login status', timestamp: new Date().toISOString() });
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
       FROM users WHERE LOWER(TRIM(email)) = ? AND archived_at IS NULL LIMIT 1`,
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
      'UPDATE users SET password_hash = ? WHERE LOWER(TRIM(email)) = ? AND archived_at IS NULL',
      [passwordHash, email],
    );
    await connection.query(
      `UPDATE auth_sessions s
       INNER JOIN users u ON u.id = s.user_id
       SET s.revoked_at = UTC_TIMESTAMP()
       WHERE LOWER(TRIM(u.email)) = ? AND s.revoked_at IS NULL`,
      [email],
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
    await pool.query(
      'UPDATE auth_sessions SET revoked_at = UTC_TIMESTAMP() WHERE user_id = ? AND id <> ? AND revoked_at IS NULL',
      [user.id, req.user.sid],
    );
    return res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error.message);
    return res.status(500).json({ error: 'Unable to change password' });
  }
});

router.post('/consent', verifyTokenAllowUnconsented, async (req, res) => {
  if (req.body?.accepted !== true) {
    return res.status(400).json({ error: 'Consent must be accepted to continue.' });
  }

  try {
    await pool.query(
      'UPDATE users SET consent_accepted_at = COALESCE(consent_accepted_at, CURRENT_TIMESTAMP) WHERE id = ?',
      [req.user.id],
    );
    return res.json({ has_accepted_terms: true });
  } catch (error) {
    console.error('[Auth API] Consent recording failed:', error.message);
    return res.status(500).json({ error: 'Unable to record consent. Please try again.' });
  }
});

router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies && req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(204).end();
  }

  let connection;
  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET, { algorithms: ['HS256'] });
    if (payload.type !== 'refresh' || !payload.sid || !payload.jti) {
      clearRefreshCookie(res);
      return res.status(401).json({ status: 401, code: 'INVALID_REFRESH_TOKEN', message: 'Invalid or expired session. Please sign in again.', timestamp: new Date().toISOString() });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT rt.token_hash, rt.revoked_at AS token_revoked_at, rt.expires_at AS token_expires_at,
              s.revoked_at AS session_revoked_at, s.expires_at AS session_expires_at,
              u.id, u.first_name, u.last_name, u.middle_initial, u.email, u.role, u.status, u.archived_at,
              u.school_id, u.group_id, u.contact_number, u.location, u.consent_accepted_at
       FROM auth_refresh_tokens rt
       INNER JOIN auth_sessions s ON s.id = rt.session_id
       INNER JOIN users u ON u.id = s.user_id
       WHERE rt.id = ? AND rt.session_id = ? AND s.user_id = ?
       FOR UPDATE`,
      [payload.jti, payload.sid, payload.id],
    );
    const row = rows[0];
    const presentedHash = hashRefreshToken(refreshToken);
    const storedHash = Buffer.from(row?.token_hash || '', 'hex');
    const submittedHash = Buffer.from(presentedHash, 'hex');
    const tokenMatches = storedHash.length === submittedHash.length
      && storedHash.length > 0
      && crypto.timingSafeEqual(storedHash, submittedHash);
    const accountStatus = String(row?.status || '').trim().toLowerCase();
    const active = row && tokenMatches
      && !row.token_revoked_at && !row.session_revoked_at
      && new Date(row.token_expires_at).getTime() > Date.now()
      && new Date(row.session_expires_at).getTime() > Date.now()
      && !row.archived_at
      && !['inactive', 'pending', 'suspended', 'disabled'].includes(accountStatus);

    if (!active) {
      const accountDisabled = row && !row.session_revoked_at
        && (row.archived_at || ['inactive', 'pending', 'suspended', 'disabled'].includes(accountStatus));
      if (accountDisabled) {
        await connection.query('UPDATE auth_sessions SET revoked_at = UTC_TIMESTAMP() WHERE id = ?', [payload.sid]);
        await connection.commit();
      } else {
        await connection.rollback();
      }
      clearRefreshCookie(res);
      return res.status(401).json({ status: 401, code: 'INVALID_REFRESH_TOKEN', message: 'Invalid or expired session. Please sign in again.', timestamp: new Date().toISOString() });
    }

    const payloadUser = buildUserPayload(row);
    const refresh = createRefreshToken(payloadUser.id, payload.sid);
    const accessToken = jwt.sign({ ...payloadUser, sid: payload.sid }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    await connection.query(
      'UPDATE auth_refresh_tokens SET revoked_at = UTC_TIMESTAMP() WHERE id = ? AND revoked_at IS NULL',
      [payload.jti],
    );
    await connection.query('UPDATE auth_sessions SET expires_at = ? WHERE id = ?', [refresh.expiresAt, payload.sid]);
    await connection.query(
      'INSERT INTO auth_refresh_tokens (id, session_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      [refresh.tokenId, payload.sid, hashRefreshToken(refresh.token), refresh.expiresAt],
    );
    await connection.commit();
    setRefreshCookie(res, refresh.token, refresh.expiresAt);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    return res.json({ token: accessToken, user: payloadUser });
  } catch (error) {
    if (connection) await connection.rollback();
    clearRefreshCookie(res);
    return res.status(401).json({ status: 401, code: 'INVALID_REFRESH_TOKEN', message: 'Invalid or expired session. Please sign in again.', timestamp: new Date().toISOString() });
  } finally {
    if (connection) connection.release();
  }
});

router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies && req.cookies.refreshToken;
  if (refreshToken) {
    try {
      const payload = jwt.verify(refreshToken, JWT_SECRET, { algorithms: ['HS256'] });
      if (payload.type === 'refresh' && payload.sid) {
        await pool.query(
          'UPDATE auth_sessions SET revoked_at = UTC_TIMESTAMP() WHERE id = ? AND user_id = ? AND revoked_at IS NULL',
          [payload.sid, payload.id],
        );
      }
    } catch (error) {
      // Clear invalid or expired cookies as part of logout too.
    }
  }
  clearRefreshCookie(res);
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ message: 'Signed out successfully' });
});

router.get('/me', verifyTokenAllowUnconsented, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
