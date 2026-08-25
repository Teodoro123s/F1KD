const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadDirectory = path.join(__dirname, '..', 'data', 'uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${file.fieldname}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension}`);
  },
});

const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

const documentUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (allowedTypes.has(file.mimetype)) return callback(null, true);
    return callback(new Error('Only PDF, JPG, PNG, and WEBP files are allowed.'));
  },
});

module.exports = { documentUpload, uploadDirectory };
