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

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    if (roles.length === 0) return next();
    if (roles.includes(req.user.role)) return next();
    return res.status(403).json({ error: 'Forbidden' });
  };
}

module.exports = { verifyToken, requireRole };