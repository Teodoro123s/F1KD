const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'documents-authorization-test-secret';

const express = require('express');
const fs = require('fs');
const path = require('path');
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
const { verifyToken } = require('../middleware/auth');
const { authorizeOperational } = require('../middleware/authorize');
const { uploadDirectory } = require('../middleware/documentUpload');
const documentsRouter = require('../routes/documents');

test('beneficiary documents require authentication and match the user school scope', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const localFileName = `document-auth-test-${process.pid}.txt`;
  const localFilePath = path.join(uploadDirectory, localFileName);
  await fs.promises.writeFile(localFilePath, 'authorized local document');
  let documentType = 'mother';
  pool.query = async (sql, params) => {
    assert.match(sql, /birth_certificate_document_path = \?/);
    assert.deepEqual(params, [params[0], params[0], params[0], params[0], params[0]]);
    return [[{ community_id: 12, group_id: 5, document_type: documentType }]];
  };

  const app = express();
  app.use('/api/documents', verifyToken, authorizeOperational, documentsRouter);
  app.use('/uploads', verifyToken, authorizeOperational, documentsRouter);
  const server = app.listen(0);
  t.after(async () => {
    pool.query = originalQuery;
    await fs.promises.rm(localFilePath, { force: true });
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const documentUrlPath = '/api/documents/birth-certificate/private.pdf';
  const unauthorized = await fetch(`${baseUrl}${documentUrlPath}`);
  assert.equal(unauthorized.status, 401);
  const unauthorizedLocalFile = await fetch(`${baseUrl}/uploads/private.pdf`);
  assert.equal(unauthorizedLocalFile.status, 401);

  const schoolToken = jwt.sign({ id: 1, role: 'Community Coordinator', school_id: 12 }, process.env.JWT_SECRET);
  const authorized = await fetch(`${baseUrl}${documentUrlPath}`, {
    headers: { Authorization: `Bearer ${schoolToken}` },
  });
  assert.equal(authorized.status, 404);
  assert.deepEqual(await authorized.json(), { error: 'Document storage is not configured' });

  const superadminToken = jwt.sign({ id: 4, role: 'Superadmin' }, process.env.JWT_SECRET);
  const tokenHeaders = (token) => ({ Authorization: ['Bearer', token].join(' ') });
  const superadminCanReadBeneficiaryDocument = await fetch(`${baseUrl}${documentUrlPath}`, {
    headers: tokenHeaders(superadminToken),
  });
  assert.equal(superadminCanReadBeneficiaryDocument.status, 404);
  assert.deepEqual(await superadminCanReadBeneficiaryDocument.json(), {
    error: 'Document storage is not configured',
  });

  documentType = 'batch_evidence';
  const superadminBatchEvidence = await fetch(`${baseUrl}/api/documents/batch-evidence/private.png`, {
    headers: tokenHeaders(superadminToken),
  });
  assert.equal(superadminBatchEvidence.status, 404);
  assert.deepEqual(await superadminBatchEvidence.json(), { error: 'Document not found' });

  documentType = 'program_receipt_evidence';
  const superadminProgramEvidence = await fetch(`${baseUrl}/api/documents/program-receipt-evidence/private.png`, {
    headers: tokenHeaders(superadminToken),
  });
  assert.equal(superadminProgramEvidence.status, 404);
  assert.deepEqual(await superadminProgramEvidence.json(), { error: 'Document not found' });

  const authorizedLocalFile = await fetch(`${baseUrl}/uploads/${localFileName}`, {
    headers: { Authorization: `Bearer ${schoolToken}` },
  });
  assert.equal(authorizedLocalFile.status, 200);
  assert.equal(await authorizedLocalFile.text(), 'authorized local document');

  for (const role of ['Partner', 'Admin', 'Health Worker']) {
    const scopedToken = jwt.sign({
      id: 3,
      role,
      ...(role === 'Health Worker' ? { school_id: 12 } : {}),
    }, process.env.JWT_SECRET);
    const roleCanRead = await fetch(`${baseUrl}/uploads/${localFileName}`, {
      headers: { Authorization: `Bearer ${scopedToken}` },
    });
    assert.equal(roleCanRead.status, 200, `${role} should be able to view batch evidence images`);
  }

  const otherSchoolToken = jwt.sign({ id: 2, role: 'Community Coordinator', school_id: 13 }, process.env.JWT_SECRET);
  const forbidden = await fetch(`${baseUrl}${documentUrlPath}`, {
    headers: { Authorization: `Bearer ${otherSchoolToken}` },
  });
  assert.equal(forbidden.status, 404);
  assert.deepEqual(await forbidden.json(), { error: 'Document not found' });
  const forbiddenLocalFile = await fetch(`${baseUrl}/uploads/${localFileName}`, {
    headers: { Authorization: `Bearer ${otherSchoolToken}` },
  });
  assert.equal(forbiddenLocalFile.status, 404);
  assert.deepEqual(await forbiddenLocalFile.json(), { error: 'Document not found' });
});
