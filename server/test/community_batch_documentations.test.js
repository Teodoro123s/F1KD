const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'community-batch-documentations-test-secret';

const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

delete process.env.MINIO_ENDPOINT;
delete process.env.MINIO_ACCESS_KEY;
delete process.env.MINIO_SECRET_KEY;

const testPool = {
  query: async () => [[]],
  getConnection: async () => ({
    query: async () => [[]],
    release() {},
  }),
};
mysql.createPool = () => testPool;
mysql.createConnection = async () => ({
  query: async () => [[]],
  end: async () => {},
});

const pool = require('../db');
const { uploadDirectory } = require('../middleware/documentUpload');
const { verifyToken } = require('../middleware/auth');
const { authorizeOperational } = require('../middleware/authorize');
const communityRouter = require('../routes/community');

test('batch evidence has bounded uploads and organizers can remove individual photos', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const originalGetConnection = pool.getConnection;
  let batchAccessible = true;
  let documentationSetId = 41;
  let documentationSetExists = false;
  const storedImages = [];
  const transactionQueries = [];

  pool.query = async (sql, params = []) => {
    if (sql.includes('FROM batches b WHERE')) {
      return [batchAccessible ? [{ id: 5 }] : []];
    }
    if (sql.includes('FROM batch_documentation_sets s')) {
      return [[{
        id: documentationSetId,
        batch_id: 5,
        evidence_date: '2026-10-20',
        created_at: '2026-10-20 10:00:00',
        uploaded_by: 'Community Organizer',
      }]];
    }
    if (sql.includes('documentation_set_id IS NOT NULL')) {
      return [storedImages.map((image, index) => ({
        id: index + 1,
        documentation_set_id: documentationSetId,
        file_name: image.file_name,
        file_path: image.file_path,
      }))];
    }
    if (sql.includes('documentation_set_id IS NULL')) return [[]];
    throw new Error(`Unexpected pool SQL: ${sql} (${params.join(', ')})`);
  };

  pool.getConnection = async () => ({
    beginTransaction: async () => transactionQueries.push('BEGIN'),
    commit: async () => transactionQueries.push('COMMIT'),
    rollback: async () => transactionQueries.push('ROLLBACK'),
    release() {},
    query: async (sql, params = []) => {
      transactionQueries.push(sql);
      if (sql.startsWith('INSERT INTO batch_documentation_sets')) {
        documentationSetId += 1;
        documentationSetExists = true;
        return [{ insertId: documentationSetId }];
      }
      if (sql.startsWith('INSERT INTO batch_documentations')) {
        storedImages.push({ id: storedImages.length + 1, file_name: params[2], file_path: params[3] });
        return [{ insertId: storedImages.length }];
      }
      if (sql.startsWith('SELECT id FROM batch_documentation_sets')) {
        return [documentationSetExists ? [{ id: documentationSetId }] : []];
      }
      if (sql.startsWith('SELECT id, file_path FROM batch_documentations WHERE id = ? AND documentation_set_id')) {
        const image = storedImages.find(
          (candidate) => String(candidate.id) === String(params[0]),
        );
        return [image ? [{ id: image.id, file_path: image.file_path }] : []];
      }
      if (sql.startsWith('DELETE FROM batch_documentations WHERE id = ? AND documentation_set_id')) {
        const index = storedImages.findIndex((image) => String(image.id) === String(params[0]));
        if (index < 0) return [{ affectedRows: 0 }];
        storedImages.splice(index, 1);
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith('SELECT COUNT(*) AS image_count FROM batch_documentations')) {
        return [[{ image_count: storedImages.length }]];
      }
      if (sql.startsWith('DELETE FROM batch_documentation_sets')) {
        documentationSetExists = false;
        return [{ affectedRows: 1 }];
      }
      throw new Error(`Unexpected transaction SQL: ${sql}`);
    },
  });

  const app = express();
  app.use('/api/community', verifyToken, authorizeOperational, communityRouter);
  const server = app.listen(0);
  t.after(async () => {
    pool.query = originalQuery;
    pool.getConnection = originalGetConnection;
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const baseUrl = `http://127.0.0.1:${server.address().port}/api/community/batches/5/documentations`;
  const tokenFor = (role) => jwt.sign({
    id: 7,
    role,
    ...(role === 'Community Organizer' || role === 'Health Worker' ? { school_id: 91 } : {}),
  }, process.env.JWT_SECRET);
  const headersFor = (role) => ({ Authorization: `Bearer ${tokenFor(role)}` });

  for (const role of ['Community Organizer', 'Partner', 'Admin', 'Health Worker']) {
    const response = await fetch(baseUrl, { headers: headersFor(role) });
    assert.equal(response.status, 200, `${role} should be able to view evidence`);
  }

  const superadminDocumentationResponse = await fetch(baseUrl, {
    headers: headersFor('Superadmin'),
  });
  assert.equal(superadminDocumentationResponse.status, 403);

  batchAccessible = false;
  const inaccessibleResponse = await fetch(baseUrl, { headers: headersFor('Community Organizer') });
  assert.equal(inaccessibleResponse.status, 404);
  batchAccessible = true;

  for (const role of ['Partner', 'Admin', 'Health Worker']) {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: headersFor(role),
      body: new FormData(),
    });
    assert.equal(response.status, 403, `${role} must not create evidence`);
    const deleteResponse = await fetch(`${baseUrl}/41/images/1`, {
      method: 'DELETE',
      headers: headersFor(role),
    });
    assert.equal(deleteResponse.status, 403, `${role} must not remove evidence`);
  }

  const organizerHeaders = headersFor('Community Organizer');
  const twoPhotos = new FormData();
  twoPhotos.append('evidenceDate', '2026-10-23');
  for (let index = 0; index < 2; index += 1) {
    twoPhotos.append('images', new Blob(['test image bytes'], { type: 'image/png' }), `photo-${index}.png`);
  }
  const tooFewResponse = await fetch(baseUrl, { method: 'POST', headers: organizerHeaders, body: twoPhotos });
  assert.equal(tooFewResponse.status, 400);
  assert.match((await tooFewResponse.json()).error, /at least 3 photos/);

  const invalidDate = new FormData();
  invalidDate.append('evidenceDate', '2026-02-31');
  for (let index = 0; index < 3; index += 1) {
    invalidDate.append('images', new Blob(['test image bytes'], { type: 'image/png' }), `invalid-${index}.png`);
  }
  const invalidDateResponse = await fetch(baseUrl, { method: 'POST', headers: organizerHeaders, body: invalidDate });
  assert.equal(invalidDateResponse.status, 400);
  assert.deepEqual(await invalidDateResponse.json(), { error: 'Enter a valid evidence date' });

  const oversizedPhoto = new FormData();
  oversizedPhoto.append('evidenceDate', '2026-10-23');
  oversizedPhoto.append(
    'images',
    new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'image/png' }),
    'oversized.png',
  );
  const oversizedResponse = await fetch(baseUrl, {
    method: 'POST',
    headers: organizerHeaders,
    body: oversizedPhoto,
  });
  assert.equal(oversizedResponse.status, 400);
  assert.deepEqual(await oversizedResponse.json(), { error: 'Each photo must be 5 MB or smaller' });

  const oversizedSet = new FormData();
  oversizedSet.append('evidenceDate', '2026-10-23');
  for (let index = 0; index < 6; index += 1) {
    oversizedSet.append(
      'images',
      new Blob([new Uint8Array(5 * 1024 * 1024)], { type: 'image/png' }),
      `large-${index}.png`,
    );
  }
  const oversizedSetResponse = await fetch(baseUrl, {
    method: 'POST',
    headers: organizerHeaders,
    body: oversizedSet,
  });
  assert.equal(oversizedSetResponse.status, 400);
  assert.deepEqual(await oversizedSetResponse.json(), { error: 'The combined photo size must not exceed 25 MB' });

  const evidencePhotos = new FormData();
  evidencePhotos.append('evidenceDate', '2026-10-23');
  for (let index = 0; index < 3; index += 1) {
    evidencePhotos.append('images', new Blob([`test image ${index}`], { type: 'image/png' }), `evidence-${index}.png`);
  }
  const uploadResponse = await fetch(baseUrl, {
    method: 'POST',
    headers: organizerHeaders,
    body: evidencePhotos,
  });
  assert.equal(uploadResponse.status, 201);
  const { documentation } = await uploadResponse.json();
  assert.equal(documentation.evidence_date, '2026-10-23');
  assert.equal(documentation.images.length, 3);
  assert.equal(storedImages.length, 3);
  const imagePaths = storedImages.map((image) => path.join(uploadDirectory, path.basename(image.file_path)));
  assert.ok(imagePaths.every((imagePath) => fs.existsSync(imagePath)));
  assert.equal(transactionQueries.filter((query) => query === 'COMMIT').length, 1);

  const groupDeleteResponse = await fetch(`${baseUrl}/${documentation.id}`, {
    method: 'DELETE',
    headers: organizerHeaders,
  });
  assert.equal(groupDeleteResponse.status, 404);

  const firstImage = documentation.images[0];
  const deleteResponse = await fetch(`${baseUrl}/${documentation.id}/images/${firstImage.id}`, {
    method: 'DELETE',
    headers: organizerHeaders,
  });
  assert.equal(deleteResponse.status, 200);
  assert.deepEqual(await deleteResponse.json(), {
    success: true,
    deleted: true,
    documentationDeleted: false,
  });
  assert.equal(storedImages.length, 2);
  assert.equal(fs.existsSync(imagePaths[0]), false);
  assert.ok(imagePaths.slice(1).every((imagePath) => fs.existsSync(imagePath)));

  for (const image of documentation.images.slice(1)) {
    const imageDeleteResponse = await fetch(`${baseUrl}/${documentation.id}/images/${image.id}`, {
      method: 'DELETE',
      headers: organizerHeaders,
    });
    assert.equal(imageDeleteResponse.status, 200);
  }
  assert.equal(storedImages.length, 0);
  assert.equal(documentationSetExists, false);
  assert.ok(imagePaths.every((imagePath) => !fs.existsSync(imagePath)));
});
