const jwt = require('jsonwebtoken');
const pool = require('../db');
const JWT_SECRET = require('../utils/jwtSecret');

async function verifyToken(req, res, next) {
  const auth = req.headers.authorization || req.headers.Authorization || '';
  const parts = auth.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    const token = parts[1];
    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    if (!payload.sid) return res.status(401).json({ error: 'Session is invalid or expired' });

    let rows;
    try {
      [rows] = await pool.query(
        `SELECT s.user_id, u.email, u.role, u.status, u.school_id, u.group_id, u.first_name,
                u.middle_initial, u.last_name, u.contact_number, u.location
         FROM auth_sessions s
         INNER JOIN users u ON u.id = s.user_id
         WHERE s.id = ? AND s.user_id = ? AND s.revoked_at IS NULL
           AND s.expires_at > UTC_TIMESTAMP()
           AND LOWER(TRIM(u.status)) NOT IN ('inactive', 'pending', 'suspended', 'disabled')
         LIMIT 1`,
        [payload.sid, payload.id],
      );
    } catch (err) {
      return next(err);
    }

    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Session is invalid or expired' });
    const name = [user.first_name, user.middle_initial, user.last_name].filter(Boolean).join(' ').trim();
    req.user = {
      ...payload,
      id: user.user_id,
      email: user.email,
      role: user.role,
      status: user.status,
      school_id: user.school_id,
      group_id: user.group_id,
      first_name: user.first_name,
      middle_initial: user.middle_initial,
      last_name: user.last_name,
      contact_number: user.contact_number,
      location: user.location,
      name: name || payload.name,
    };
    return next();
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
