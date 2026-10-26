const express = require('express');
const path = require('path');
const pool = require('../db');
const { normalizeRole } = require('../middleware/authorize');
const { minioClient, minioBucket, uploadDirectory } = require('../middleware/documentUpload');

const router = express.Router();

async function findDocumentRecords(documentPath) {
  const [rows] = await pool.query(
    `SELECT community_id, group_id, 'mother' AS document_type
     FROM mothers
     WHERE birth_certificate_document_path = ? OR consent_document_path = ?
     UNION ALL
     SELECT COALESCE(c.community_id, m.community_id) AS community_id,
            COALESCE(c.group_id, m.group_id) AS group_id,
            'child' AS document_type
     FROM children c
     LEFT JOIN mothers m ON m.id = c.mother_id
     WHERE c.birth_document_path = ?
     UNION ALL
     SELECT b.community_id, batch_groups.group_id, 'batch_evidence' AS document_type
     FROM batch_documentations d
     JOIN batches b ON b.id = d.batch_id
     LEFT JOIN (
       SELECT group_id, batch_id FROM group_batch
       UNION
       SELECT group_id, batch_id FROM mothers WHERE group_id IS NOT NULL AND batch_id IS NOT NULL
     ) batch_groups ON batch_groups.batch_id = b.id
     WHERE d.file_path = ?
     UNION ALL
     SELECT COALESCE(m.community_id, c.community_id, parent_m.community_id) AS community_id,
            COALESCE(m.group_id, c.group_id, parent_m.group_id) AS group_id,
            'program_receipt_evidence' AS document_type
     FROM program_receipt_documentations d
     INNER JOIN program_receipt_documentation_logs link ON link.documentation_set_id = d.documentation_set_id
     INNER JOIN monitoring_logs ml ON ml.id = link.monitoring_log_id
     LEFT JOIN mothers m
       ON LOWER(TRIM(ml.beneficiary_type)) = 'mother'
      AND (CAST(ml.beneficiary_id AS CHAR) = CAST(m.id AS CHAR)
        OR LOWER(TRIM(CAST(ml.beneficiary_id AS CHAR))) = LOWER(TRIM(CAST(m.mother_code AS CHAR))))
     LEFT JOIN children c
       ON LOWER(TRIM(ml.beneficiary_type)) = 'child'
      AND (CAST(ml.beneficiary_id AS CHAR) = CAST(c.id AS CHAR)
        OR LOWER(TRIM(CAST(ml.beneficiary_id AS CHAR))) = LOWER(TRIM(CAST(c.child_code AS CHAR))))
     LEFT JOIN mothers parent_m ON parent_m.id = c.mother_id
     WHERE d.file_path = ?`,
    [documentPath, documentPath, documentPath, documentPath, documentPath],
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
    if (normalizeRole(req.user?.role) === 'super_admin'
      && records.some((record) => ['batch_evidence', 'program_receipt_evidence'].includes(record.document_type))) {
      return res.status(404).json({ error: 'Document not found' });
    }
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
