const express = require('express');
const { minioClient, minioBucket } = require('../middleware/documentUpload');

const router = express.Router();

router.get('/*', async (req, res) => {
  if (!minioClient) return res.status(404).json({ error: 'Document storage is not configured' });

  const objectKey = String(req.params[0] || '').replace(/^\/+/, '');
  if (!objectKey || objectKey.includes('..')) {
    return res.status(400).json({ error: 'Invalid document path' });
  }

  try {
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
