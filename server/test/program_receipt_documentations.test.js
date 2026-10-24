const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'program-receipt-documentations-test-secret';
delete process.env.MINIO_ENDPOINT;
delete process.env.MINIO_ACCESS_KEY;
delete process.env.MINIO_SECRET_KEY;

const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');
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
const { uploadDirectory } = require('../middleware/documentUpload');
const { verifyToken } = require('../middleware/auth');
const { authorizeOperational } = require('../middleware/authorize');
const programsRouter = require('../routes/programs');

test('program check-in evidence is shared across beneficiaries and manageable only by Community Organizers', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const originalGetConnection = pool.getConnection;
  const storedImages = [];
  const linkedReceipts = [];
  const imagePaths = [];
  const reportRows = [
    { receipt_id: 501, date: '2026-10-23', beneficiary_id: '100', beneficiary_type: 'mother' },
    { receipt_id: 502, date: '2026-10-23', beneficiary_id: '101', beneficiary_type: 'mother' },
  ];

  pool.query = async (sql, params = []) => {
    if (sql.includes('SELECT pc.scope_type, pc.scope_name')) {
      return [[{ scope_type: 'School', scope_name: 'School 12', owned_by_school: 1 }]];
    }
    if (sql.includes('SELECT id FROM communities WHERE id = ? AND name = ?')) return [[{ id: 12 }]];
    if (sql.includes('SELECT ml.id, ml.beneficiary_id, LOWER(TRIM(ml.beneficiary_type))')) {
      return [reportRows.map((row) => ({
        id: row.receipt_id,
        beneficiary_id: row.beneficiary_id,
        beneficiary_type: row.beneficiary_type,
      }))];
    }
    if (sql.includes('SELECT ml.id AS receipt_id')) return [[reportRows[0]]];
    if (sql.includes('FROM program_receipt_documentation_logs link')) {
      const requestedIds = params.map(String);
      return [linkedReceipts
        .filter((receiptId) => requestedIds.includes(String(receiptId)))
        .flatMap((receiptId) => storedImages.map((image) => ({
          receipt_id: receiptId,
          id: image.id,
          set_id: image.set_id,
          file_name: image.file_name,
          file_path: image.file_path,
        })))];
    }
    throw new Error(`Unexpected pool SQL: ${sql}`);
  };

  let documentationSetExists = false;
  let nextImageId = 1;
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release() {},
    query: async (sql, params = []) => {
      if (sql.startsWith('INSERT INTO program_receipt_documentation_sets')) {
        documentationSetExists = true;
        return [{ insertId: 77 }];
      }
      if (sql.startsWith('INSERT INTO program_receipt_documentations')) {
        const image = {
          id: nextImageId++,
          set_id: params[0],
          file_name: params[1],
          file_path: params[2],
        };
        storedImages.push(image);
        imagePaths.push(path.join(uploadDirectory, path.basename(image.file_path)));
        return [{ insertId: image.id }];
      }
      if (sql.startsWith('INSERT INTO program_receipt_documentation_logs')) {
        linkedReceipts.push(params[1]);
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith('SELECT id FROM program_receipt_documentation_sets')) {
        return [documentationSetExists ? [{ id: 77 }] : []];
      }
      if (sql.startsWith('SELECT id, file_path FROM program_receipt_documentations')) {
        const image = storedImages.find((candidate) => String(candidate.id) === String(params[0]));
        return [image ? [{ id: image.id, file_path: image.file_path }] : []];
      }
      if (sql.startsWith('DELETE FROM program_receipt_documentations')) {
        const index = storedImages.findIndex((image) => String(image.id) === String(params[0]));
        if (index < 0) return [{ affectedRows: 0 }];
        storedImages.splice(index, 1);
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith('SELECT COUNT(*) AS image_count FROM program_receipt_documentations')) {
        return [[{ image_count: storedImages.length }]];
      }
      if (sql.startsWith('DELETE FROM program_receipt_documentation_sets')) {
        documentationSetExists = false;
        linkedReceipts.splice(0, linkedReceipts.length);
        return [{ affectedRows: 1 }];
      }
      throw new Error(`Unexpected connection SQL: ${sql}`);
    },
  });

  const app = express();
  app.use('/api/programs', verifyToken, authorizeOperational, programsRouter);
  const server = app.listen(0);
  t.after(async () => {
    pool.query = originalQuery;
    pool.getConnection = originalGetConnection;
    await Promise.all(imagePaths.map((filePath) => fs.promises.rm(filePath, { force: true })));
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const baseUrl = `http://127.0.0.1:${server.address().port}/api/programs/5/monitoring`;
  const headersFor = (role) => ({
    Authorization: `Bearer ${jwt.sign({
      id: 7,
      role,
      ...(role === 'Community Organizer' ? { school_id: 12 } : {}),
    }, process.env.JWT_SECRET)}`,
  });

  const deniedUpload = await fetch(`${baseUrl}/evidence`, {
    method: 'POST',
    headers: headersFor('Partner'),
    body: new FormData(),
  });
  assert.equal(deniedUpload.status, 403);
  const deniedDelete = await fetch(`${baseUrl}/evidence/77/images/1`, {
    method: 'DELETE',
    headers: headersFor('Partner'),
  });
  assert.equal(deniedDelete.status, 403);

  const superadminReport = await fetch(`${baseUrl}/report/mother/100`, {
    headers: headersFor('Superadmin'),
  });
  assert.equal(superadminReport.status, 403);

  const oversizedSubmission = new FormData();
  oversizedSubmission.append('date', '2026-10-23');
  oversizedSubmission.append('checkins', JSON.stringify([{ id: '100', type: 'mother' }]));
  for (let index = 0; index < 5; index += 1) {
    oversizedSubmission.append(
      'images',
      new Blob([new Uint8Array(5 * 1024 * 1024)], { type: 'image/png' }),
      `large-${index}.png`,
    );
  }
  oversizedSubmission.append('images', new Blob([new Uint8Array(1)], { type: 'image/png' }), 'extra.png');
  const oversizedResponse = await fetch(`${baseUrl}/evidence`, {
    method: 'POST',
    headers: headersFor('Community Organizer'),
    body: oversizedSubmission,
  });
  assert.equal(oversizedResponse.status, 400);
  assert.deepEqual(await oversizedResponse.json(), { error: 'The combined photo size must not exceed 25 MB' });

  const formData = new FormData();
  formData.append('date', '2026-10-23');
  formData.append('checkins', JSON.stringify([
    { id: '100', type: 'mother' },
    { id: '101', type: 'mother' },
  ]));
  for (let index = 0; index < 3; index += 1) {
    formData.append('images', new Blob([`photo ${index}`], { type: 'image/png' }), `check-in-${index}.png`);
  }
  const uploadResponse = await fetch(`${baseUrl}/evidence`, {
    method: 'POST',
    headers: headersFor('Community Organizer'),
    body: formData,
  });
  assert.equal(uploadResponse.status, 201);
  const { documentation } = await uploadResponse.json();
  assert.deepEqual(documentation.receipt_ids, [501, 502]);
  assert.equal(documentation.images.length, 3);
  assert.deepEqual(linkedReceipts, [501, 502]);
  assert.ok(imagePaths.every((filePath) => fs.existsSync(filePath)));

  const reportResponse = await fetch(`${baseUrl}/report/mother/100`, {
    headers: headersFor('Partner'),
  });
  assert.equal(reportResponse.status, 200);
  const report = await reportResponse.json();
  assert.equal(report.report[0].evidence_images.length, 3);

  const deleteResponse = await fetch(`${baseUrl}/evidence/77/images/${documentation.images[0].id}`, {
    method: 'DELETE',
    headers: headersFor('Community Organizer'),
  });
  assert.equal(deleteResponse.status, 200);
  assert.deepEqual(await deleteResponse.json(), {
    success: true,
    deleted: true,
    documentationDeleted: false,
  });
  assert.equal(fs.existsSync(imagePaths[0]), false);
  assert.equal(storedImages.length, 2);
});
