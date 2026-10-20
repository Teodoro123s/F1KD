const express = require('express');
const path = require('path');
const pool = require('../db');
const { minioClient, minioBucket, uploadDirectory } = require('../middleware/documentUpload');

const router = express.Router();

async function findDocumentRecords(documentPath) {
  const [rows] = await pool.query(
    `SELECT community_id, group_id
     FROM mothers
     WHERE birth_certificate_document_path = ? OR consent_document_path = ?
     UNION ALL
     SELECT COALESCE(c.community_id, m.community_id) AS community_id,
            COALESCE(c.group_id, m.group_id) AS group_id
     FROM children c
     LEFT JOIN mothers m ON m.id = c.mother_id
     WHERE c.birth_document_path = ?`,
    [documentPath, documentPath, documentPath],
  );
  return rows;
}

router.get('/*', async (req, res) => {
  const rawObjectKey = String(req.params[0] || '').replace(/^\/+/, '');
  const isLocalUpload = req.baseUrl === '/uploads';
  const objectKey = isLocalUpload ? rawObjectKey : rawObjectKey.split('/').map((part) => {
    try {
      return decodeURIComponent(part);
    } catch {
      return '';
    }
  }).join('/');
  if (!objectKey || objectKey.split(/[\\/]/).some((part) => !part || part === '.' || part === '..')) {
    return res.status(400).json({ error: 'Invalid document path' });
  }

  const documentPath = isLocalUpload
    ? `/uploads/${objectKey}`
    : `/api/documents/${objectKey.split('/').map(encodeURIComponent).join('/')}`;

  try {
    const records = await findDocumentRecords(documentPath);
    const canAccessDocument = records.some((record) => (
      (req.schoolId == null || Number(record.community_id) === Number(req.schoolId))
      && (req.groupId == null || Number(record.group_id) === Number(req.groupId))
    ));
    if (!canAccessDocument) return res.status(404).json({ error: 'Document not found' });

    if (isLocalUpload) {
      if (objectKey.includes('/')) return res.status(400).json({ error: 'Invalid document path' });
      const filePath = path.resolve(uploadDirectory, objectKey);
      if (path.dirname(filePath) !== path.resolve(uploadDirectory)) {
        return res.status(400).json({ error: 'Invalid document path' });
      }
      return res.sendFile(filePath, (error) => {
        if (error && !res.headersSent) res.status(error.statusCode === 404 ? 404 : 500).json({
          error: error.statusCode === 404 ? 'Document not found' : 'Unable to load document',
        });
      });
    }

    if (!minioClient) return res.status(404).json({ error: 'Document storage is not configured' });
    const metadata = await minioClient.statObject(minioBucket, objectKey);
    res.setHeader('Content-Type', metadata.metaData?.['content-type'] || 'application/octet-stream');
    res.setHeader('Content-Disposition', 'inline');
    const stream = await minioClient.getObject(minioBucket, objectKey);
    stream.on('error', (error) => {
      if (!res.headersSent) res.status(404).json({ error: error.message || 'Document unavailable' });
      else res.destroy(error);
    });
    stream.pipe(res);
  } catch (error) {
    console.error('[Documents API] download error:', error.message || error);
    res.status(404).json({ error: 'Document not found' });
  }
});

module.exports = router;
