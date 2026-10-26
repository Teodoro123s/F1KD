require('dotenv').config();

const jwtSecret = String(process.env.JWT_SECRET || '').trim();

if (process.env.NODE_ENV === 'production' && !jwtSecret) {
  throw new Error('JWT_SECRET must be configured in production');
}

module.exports = jwtSecret || 'dev-only-insecure-jwt-secret';
