const crypto = require('node:crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(JWT_SECRET).digest();

function encryptCredential(credential) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(credential, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((value) => value.toString('base64url')).join('.');
}

function decryptCredential(value) {
  const parts = String(value || '').split('.');
  if (parts.length !== 3) throw new Error('Invalid encrypted credential');
  const [iv, authTag, encrypted] = parts.map((part) => Buffer.from(part, 'base64url'));
  if (iv.length !== 12 || authTag.length !== 16 || encrypted.length === 0) {
    throw new Error('Invalid encrypted credential');
  }
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

module.exports = { encryptCredential, decryptCredential };
