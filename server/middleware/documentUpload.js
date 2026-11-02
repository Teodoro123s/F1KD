const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

let Minio;
try {
  Minio = require('minio');
} catch (error) {
  Minio = null;
}

const uploadDirectory = path.join(__dirname, '..', 'data', 'uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });

const fileTypes = {
  'application/pdf': { extensions: ['.pdf'], disposition: 'attachment' },
  'image/jpeg': { extensions: ['.jpg', '.jpeg'], disposition: 'inline' },
  'image/png': { extensions: ['.png'], disposition: 'inline' },
  'image/webp': { extensions: ['.webp'], disposition: 'inline' },
};
const documentTypes = new Set(Object.keys(fileTypes));
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const minioEndpoint = process.env.MINIO_ENDPOINT || 'localhost';
const minioPort = Number(process.env.MINIO_PORT || 9000);
const minioUseSSL = String(process.env.MINIO_USE_SSL || 'false').toLowerCase() === 'true';
const minioAccessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
const minioSecretKey = process.env.MINIO_SECRET_KEY || 'minioadmin';
const minioBucket = process.env.MINIO_BUCKET || 'f1kd-documents';
const useMinio = Boolean(process.env.MINIO_ENDPOINT || process.env.MINIO_ACCESS_KEY || process.env.MINIO_SECRET_KEY);

function getDetectedFileType(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;
  if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') return 'application/pdf';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 12
    && buffer.toString('ascii', 0, 4) === 'RIFF'
    && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

function sanitizeOriginalFilename(originalName) {
  const basename = path.win32.basename(path.posix.basename(String(originalName || '')));
  const sanitized = basename
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[<>:"|?*]/g, '_')
    .trim()
    .slice(0, 200);
  return sanitized || 'uploaded-file';
}

function validateUploadFile(file, allowedTypes) {
  const detectedType = getDetectedFileType(file.buffer);
  const claimedType = String(file.mimetype || '').trim().toLowerCase();
  const extension = path.extname(sanitizeOriginalFilename(file.originalname)).toLowerCase();
  const typeInfo = detectedType && fileTypes[detectedType];
  if (!typeInfo
    || !allowedTypes.has(detectedType)
    || claimedType !== detectedType
    || !typeInfo.extensions.includes(extension)) {
    throw new Error(allowedTypes === imageTypes
      ? 'Only valid JPG, PNG, and WEBP image files with matching file types are allowed.'
      : 'Only valid PDF, JPG, PNG, and WEBP files with matching file types are allowed.');
  }
  file.detectedMimeType = detectedType;
  file.detectedExtension = extension === '.jpeg' ? '.jpg' : extension;
  file.originalname = sanitizeOriginalFilename(file.originalname);
}

function getUploadErrorMessage(error, maxMegabytes, allowedTypes) {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return allowedTypes === imageTypes
      ? `Each photo must be ${maxMegabytes} MB or smaller`
      : `Each file must be ${maxMegabytes} MB or smaller.`;
  }
  if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') {
    return 'Too many files were attached.';
  }
  return error.message || (allowedTypes === imageTypes
    ? 'Only JPG, PNG, and WEBP image files are allowed.'
    : 'Only PDF, JPG, PNG, and WEBP files are allowed.');
}

function createSecureUpload({ limits, maxMegabytes, allowedTypes }) {
  const uploader = multer({
    storage: multer.memoryStorage(),
    limits,
  });

  const secure = (configure) => (req, res, next) => {
    configure(req, res, (error) => {
      if (error) {
        return res.status(400).json({ error: getUploadErrorMessage(error, maxMegabytes, allowedTypes) });
      }

      const files = req.file
        ? [req.file]
        : Object.values(req.files || {}).flat();
      try {
        files.forEach((file) => validateUploadFile(file, allowedTypes));
      } catch (validationError) {
        return res.status(400).json({ error: validationError.message });
      }
      return next();
    });
  };

  return {
    single: (...args) => secure(uploader.single(...args)),
    fields: (...args) => secure(uploader.fields(...args)),
    array: (...args) => secure(uploader.array(...args)),
  };
}

const documentUpload = createSecureUpload({
  limits: { fileSize: 10 * 1024 * 1024 },
  maxMegabytes: 10,
  allowedTypes: documentTypes,
});
const batchEvidenceUpload = createSecureUpload({
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  maxMegabytes: 5,
  allowedTypes: imageTypes,
});

const minioClient = useMinio && Minio
  ? new Minio.Client({
      endPoint: minioEndpoint,
      port: minioPort,
      useSSL: minioUseSSL,
      accessKey: minioAccessKey,
      secretKey: minioSecretKey,
    })
  : null;

if (minioClient) {
  minioClient.bucketExists(minioBucket)
    .then((exists) => {
      if (!exists) return minioClient.makeBucket(minioBucket, 'us-east-1');
      return null;
    })
    .catch((error) => {
      console.warn('[MinIO] unable to initialize bucket:', error.message || error);
    });
}

function getStoredExtension(file) {
  if (file.detectedExtension && fileTypes[file.detectedMimeType]) return file.detectedExtension;
  const detectedType = getDetectedFileType(file.buffer);
  if (!detectedType || !fileTypes[detectedType]) {
    throw new Error('Uploaded file content is not a supported document type.');
  }
  return fileTypes[detectedType].extensions[0];
}

function buildObjectKey(fieldName, extension) {
  const safeField = String(fieldName || 'document').replace(/[^a-zA-Z0-9-_]+/g, '-').slice(0, 64) || 'document';
  return `${safeField}/${crypto.randomBytes(20).toString('hex')}${extension}`;
}

async function uploadFileToStorage(file, fieldName = 'document') {
  if (!file) return { path: '', name: '', storage: 'none' };

  validateUploadFile(file, documentTypes);
  const extension = getStoredExtension(file);
  const detectedType = file.detectedMimeType || getDetectedFileType(file.buffer);
  const safeName = sanitizeOriginalFilename(file.originalname);
  if (!Buffer.isBuffer(file.buffer)) {
    throw new Error('Uploaded file content is unavailable.');
  }

  if (minioClient) {
    const objectKey = buildObjectKey(fieldName, extension);
    try {
      await minioClient.putObject(minioBucket, objectKey, file.buffer, file.size, {
        'Content-Type': detectedType,
      });
      return {
        path: `/api/documents/${objectKey.split('/').map(encodeURIComponent).join('/')}`,
        name: safeName,
        storage: 'minio',
      };
    } catch (error) {
      console.warn('[MinIO] upload failed; falling back to local storage:', error.message || error);
    }
  }

  const filename = `${crypto.randomBytes(20).toString('hex')}${extension}`;
  await fs.promises.writeFile(path.join(uploadDirectory, filename), file.buffer, {
    flag: 'wx',
    mode: 0o600,
  });
  return {
    path: `/uploads/${filename}`,
    name: safeName,
    storage: minioClient ? 'local-fallback' : 'local',
  };
}

async function deleteFileFromStorage(filePath) {
  if (!filePath) return;

  const normalized = String(filePath).trim();
  if (!normalized || normalized === 'null' || normalized === 'undefined') return;

  if (/^https?:\/\//i.test(normalized)) {
    const url = new URL(normalized);
    const objectKey = decodeURIComponent((url.pathname || '').replace(/^\/api\/documents\//, '').replace(/^\//, ''));
    if (!objectKey || !minioClient || objectKey === 'undefined') {
      throw new Error('Unable to delete an external stored file without its object-storage configuration');
    }
    await minioClient.removeObject(minioBucket, objectKey);
    return;
  }

  if (normalized.startsWith('/api/documents/')) {
    const objectKey = decodeURIComponent(normalized.replace(/^\/api\/documents\//, '')).replace(/^\//, '');
    if (!objectKey || !minioClient) {
      throw new Error('Unable to delete an object-storage file without its object-storage configuration');
    }
    await minioClient.removeObject(minioBucket, objectKey);
    return;
  }

  if (normalized.startsWith('/uploads/')) {
    const fileName = decodeURIComponent(normalized.split('/').pop() || '');
    if (!fileName) throw new Error('Unable to delete a stored file with an invalid path');
    const fileDiskPath = path.join(uploadDirectory, fileName);
    try {
      await fs.promises.unlink(fileDiskPath);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    return;
  }

  throw new Error('Unable to delete a stored file with an unsupported path');
}

module.exports = {
  documentUpload,
  batchEvidenceUpload,
  uploadDirectory,
  uploadFileToStorage,
  deleteFileFromStorage,
  useMinio,
  minioClient,
  minioBucket,
  fileTypes,
  getDetectedFileType,
  sanitizeOriginalFilename,
  validateUploadFile,
};
