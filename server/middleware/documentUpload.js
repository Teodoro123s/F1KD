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

const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const minioEndpoint = process.env.MINIO_ENDPOINT || 'localhost';
const minioPort = Number(process.env.MINIO_PORT || 9000);
const minioUseSSL = String(process.env.MINIO_USE_SSL || 'false').toLowerCase() === 'true';
const minioAccessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
const minioSecretKey = process.env.MINIO_SECRET_KEY || 'minioadmin';
const minioBucket = process.env.MINIO_BUCKET || 'f1kd-documents';
const useMinio = Boolean(process.env.MINIO_ENDPOINT || process.env.MINIO_ACCESS_KEY || process.env.MINIO_SECRET_KEY);

const storage = useMinio
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: uploadDirectory,
      filename: (req, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();
        callback(null, `${file.fieldname}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension}`);
      },
    });

const documentUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (allowedTypes.has(file.mimetype)) return callback(null, true);
    return callback(new Error('Only PDF, JPG, PNG, and WEBP files are allowed.'));
  },
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

/**
 * Builds a deterministic object key for uploaded files kept in object storage.
 *
 * @param {string} fieldName - The form field name used for the upload.
 * @param {string} originalName - The original file name supplied by the client.
 * @returns {string} A safe, bucket-friendly object path.
 */
function buildObjectKey(fieldName, originalName) {
  const extension = path.extname(originalName || '').toLowerCase();
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).slice(2, 8);
  const safeField = String(fieldName || 'document').replace(/[^a-zA-Z0-9-_]+/g, '-');
  return `${safeField}/${timestamp}-${randomPart}${extension}`;
}

/**
 * Persists an uploaded document to MinIO when configured, otherwise falls back to the local disk store.
 *
 * @param {Express.Multer.File | null | undefined} file - The uploaded file instance.
 * @param {string} [fieldName='document'] - A label used to build the storage path.
 * @returns {Promise<{path: string, name: string, storage: string}>} Metadata for the stored file.
 */
async function uploadFileToStorage(file, fieldName = 'document') {
  if (!file) {
    return { path: '', name: '', storage: 'none' };
  }

  if (minioClient && file.buffer) {
    const objectKey = buildObjectKey(fieldName, file.originalname);
    try {
      await minioClient.putObject(minioBucket, objectKey, file.buffer, file.size, {
        'Content-Type': file.mimetype || 'application/octet-stream',
      });

      return {
        path: `/api/documents/${objectKey.split('/').map(encodeURIComponent).join('/')}`,
        name: file.originalname,
        storage: 'minio',
      };
    } catch (error) {
      console.warn('[MinIO] upload failed; falling back to local storage:', error.message || error);
      const extension = path.extname(file.originalname || '').toLowerCase();
      const filename = `${fieldName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension}`;
      await fs.promises.writeFile(path.join(uploadDirectory, filename), file.buffer);
      return {
        path: `/uploads/${filename}`,
        name: file.originalname || filename,
        storage: 'local-fallback',
      };
    }
  }

  const filename = file.filename || `${fieldName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${path.extname(file.originalname || '').toLowerCase()}`;
  const relativePath = `/uploads/${filename}`;
  return {
    path: relativePath,
    name: file.originalname || filename,
    storage: 'local',
  };
}

async function deleteFileFromStorage(filePath) {
  if (!filePath) return;

  const normalized = String(filePath).trim();
  if (!normalized || normalized === 'null' || normalized === 'undefined') return;

  if (/^https?:\/\//i.test(normalized)) {
    try {
      const url = new URL(normalized);
      const objectKey = decodeURIComponent((url.pathname || '').replace(/^\/api\/documents\//, '').replace(/^\//, ''));
      if (objectKey && minioClient && objectKey !== 'undefined') {
        await minioClient.removeObject(minioBucket, objectKey);
      }
      return;
    } catch (error) {
      // fall through to local-path handling below
    }
  }

  if (normalized.startsWith('/api/documents/')) {
    const objectKey = decodeURIComponent(normalized.replace(/^\/api\/documents\//, '')).replace(/^\//, '');
    if (objectKey && minioClient) {
      await minioClient.removeObject(minioBucket, objectKey);
      return;
    }
  }

  if (normalized.startsWith('/uploads/')) {
    const fileName = decodeURIComponent(normalized.split('/').pop() || '');
    if (!fileName) return;
    const fileDiskPath = path.join(uploadDirectory, fileName);
    await fs.promises.unlink(fileDiskPath).catch(() => null);
  }
}

module.exports = {
  documentUpload,
  uploadDirectory,
  uploadFileToStorage,
  deleteFileFromStorage,
  useMinio,
  minioClient,
  minioBucket,
};
