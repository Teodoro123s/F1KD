const crypto = require('crypto');

function generateTemporaryPassword() {
  return crypto.randomBytes(6).toString('base64url');
}

module.exports = { generateTemporaryPassword };
