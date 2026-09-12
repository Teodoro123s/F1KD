const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function verifyToken(req, res, next) {
  const auth = req.headers.authorization || req.headers.Authorization || '';
  const parts = auth.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    const token = parts[1];
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload;
      return next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  }
  return res.status(401).json({ error: 'Authorization header missing or invalid' });
}

function normalizeRole(role) {
  const value = String(role || '').trim().toLowerCase();
  const aliases = {
    superadmin: 'super_admin',
    'super admin': 'super_admin',
    administrator: 'admin',
    admin: 'admin',
    'community organizer': 'partner',
    communityorganizer: 'partner',
    partner: 'partner',
    'health worker': 'partner',
    healthworker: 'partner',
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