const test = require('node:test');
const assert = require('node:assert/strict');

delete process.env.MINIO_ENDPOINT;
delete process.env.MINIO_ACCESS_KEY;
delete process.env.MINIO_SECRET_KEY;

const express = require('express');
const fs = require('node:fs/promises');
const mysql = require('mysql2/promise');

const testPool = {
  query: async () => [[]],
  getConnection: async () => ({
    query: async () => [[]],
    release() {},
  }),
};
mysql.createPool = () => testPool;
mysql.createConnection = async () => ({ query: async () => [[]], end: async () => {} });

const pool = require('../db');
const {
  documentUpload,
  uploadDirectory,
  uploadFileToStorage,
  deleteFileFromStorage,
} = require('../middleware/documentUpload');
const documentsRouter = require('../routes/documents');

test('uploads validate content and naming before storage and serve only safe content types', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const storedPaths = [];
  let authorizedSchoolId = null;
  const app = express();
  app.post('/upload', documentUpload.single('file'), async (req, res) => {
    try {
      const file = await uploadFileToStorage(req.file, 'test-document');
      storedPaths.push(file.path);
      return res.status(201).json(file);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  });
  app.use('/uploads', (req, res, next) => {
    req.user = { role: 'Admin' };
    req.schoolId = authorizedSchoolId;
    req.groupId = null;
    next();
  }, documentsRouter);

  pool.query = async (_sql, params = []) => {
    const storedPath = params[0];
    return [[storedPaths.includes(storedPath)
      ? { community_id: 12, group_id: 5, document_type: 'mother' }
      : null].filter(Boolean)];
  };

  const server = app.listen(0);
  t.after(async () => {
    pool.query = originalQuery;
    await Promise.all(storedPaths.map((filePath) => deleteFileFromStorage(filePath)));
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const upload = async (bytes, filename, contentType) => {
    const form = new FormData();
    form.append('file', new Blob([bytes], { type: contentType }), filename);
    return fetch(`${baseUrl}/upload`, { method: 'POST', body: form });
  };

  const pdfResponse = await upload(Buffer.from('%PDF-1.7\nsynthetic test document'), '../../outside.pdf', 'application/pdf');
  assert.equal(pdfResponse.status, 201);
  const pdf = await pdfResponse.json();
  assert.match(pdf.path, /^\/uploads\/[a-f0-9]{40}\.pdf$/);
  assert.equal(pdf.name, 'outside.pdf');
  assert.equal(await fs.readFile(`${uploadDirectory}\\${pdf.path.split('/').pop()}`, 'utf8'), '%PDF-1.7\nsynthetic test document');

  const imageBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/r4sAAAAASUVORK5CYII=', 'base64');
  const imageResponse = await upload(imageBytes, 'check-in.png', 'image/png');
  assert.equal(imageResponse.status, 201);
  const image = await imageResponse.json();
  assert.match(image.path, /^\/uploads\/[a-f0-9]{40}\.png$/);

  const mismatchResponse = await upload(Buffer.from('%PDF-1.7\nsynthetic'), 'document.pdf', 'text/plain');
  assert.equal(mismatchResponse.status, 400);
  assert.match((await mismatchResponse.json()).error, /matching file types/i);

  const extensionMismatchResponse = await upload(Buffer.from('%PDF-1.7\nsynthetic'), 'document.png', 'application/pdf');
  assert.equal(extensionMismatchResponse.status, 400);
  assert.match((await extensionMismatchResponse.json()).error, /matching file types/i);

  const malformedResponse = await upload(Buffer.from('not a document'), 'document.pdf', 'application/pdf');
  assert.equal(malformedResponse.status, 400);
  assert.match((await malformedResponse.json()).error, /matching file types/i);

  const oversizedResponse = await upload(Buffer.alloc(10 * 1024 * 1024 + 1), 'large.pdf', 'application/pdf');
  assert.equal(oversizedResponse.status, 400);
  assert.match((await oversizedResponse.json()).error, /10 MB or smaller/i);

  const pdfDownload = await fetch(`${baseUrl}${pdf.path}`);
  assert.equal(pdfDownload.status, 200);
  assert.equal(pdfDownload.headers.get('content-type'), 'application/pdf');
  assert.match(pdfDownload.headers.get('content-disposition'), /^attachment;/);
  assert.equal(pdfDownload.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(pdfDownload.headers.get('cache-control'), 'private, no-store');

  const imagePreview = await fetch(`${baseUrl}${image.path}`);
  assert.equal(imagePreview.status, 200);
  assert.equal(imagePreview.headers.get('content-type'), 'image/png');
  assert.match(imagePreview.headers.get('content-disposition'), /^inline;/);

  authorizedSchoolId = 13;
  const crossSchoolDownload = await fetch(`${baseUrl}${pdf.path}`);
  assert.equal(crossSchoolDownload.status, 404);
});
