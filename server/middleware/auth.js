const jwt = require('jsonwebtoken');
const pool = require('../db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

async function verifyToken(req, res, next) {
  const auth = req.headers.authorization || req.headers.Authorization || '';
  const parts = auth.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    const token = parts[1];
    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    try {
      const [users] = await pool.query('SELECT auth_version FROM users WHERE id = ? LIMIT 1', [payload.id]);
      if (!users.length || Number(users[0].auth_version || 0) !== Number(payload.auth_version || 0)) {
        return res.status(401).json({ error: 'Session expired. Please sign in again.' });
      }
      req.user = payload;
      return next();
    } catch (err) {
      console.error('[Auth] Unable to validate session version:', err.message);
      return res.status(503).json({ error: 'Authentication service is temporarily unavailable.' });
    }
  }
  return res.status(401).json({ error: 'Authorization header missing or invalid' });
}

function normalizeRole(role) {
  const value = String(role || '').trim().toLowerCase();
  const aliases = {
    superadmin: 'super_admin',
    'super admin': 'super_admin',
    super_admin: 'super_admin',
    administrator: 'admin',
    admin: 'admin',
    'community organizer': 'community_coordinator',
    communityorganizer: 'community_coordinator',
    'community coordinator': 'community_coordinator',
    community_coordinator: 'community_coordinator',
    communitycoordinator: 'community_coordinator',
    coordinator: 'community_coordinator',
    co: 'community_coordinator',
    partner: 'partner',
    'health worker': 'health_worker',
    healthworker: 'health_worker',
    health_worker: 'health_worker',
  };
  return aliases[value] || value;
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    if (roles.length === 0) return next();
    const userRole = normalizeRole(req.user.role);
    const permitted = roles.some((role) => normalizeRole(role) === userRole);
    if (permitted) return next();
    return res.status(403).json({ error: 'Forbidden' });
  };
}

module.exports = { verifyToken, requireRole, normalizeRole };