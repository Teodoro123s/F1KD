const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'philhealth-claim-api-test-secret';

const express = require('express');
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
mysql.createConnection = async () => ({
  query: async () => [[]],
  end: async () => {},
});

const pool = require('../db');
const mothersRouter = require('../routes/mothers');
const { verifyToken } = require('../middleware/auth');
const { authorizeOperational } = require('../middleware/authorize');

test('PhilHealth claim APIs validate, persist, update, and enforce school scope', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const claims = new Map();
  let nextClaimId = 1;
  pool.query = async (sql, params = []) => {
    if (sql.includes('SELECT id FROM mothers WHERE (id = ? OR mother_code = ?)')) {
      const [id, , schoolId] = params;
      return Number(id) === 123 && Number(schoolId) === 12 ? [[{ id: 123 }]] : [[]];
    }
    if (sql.includes('FROM philhealth_claims') && sql.includes('ORDER BY claim_date')) {
      return [[...claims.values()].filter((claim) => claim.motherId === Number(params[0]))];
    }
    if (sql.startsWith('INSERT INTO philhealth_claims')) {
      const [motherId, claimReference, claimDate, status, amount, notes, createdBy, updatedBy] = params;
      const claim = {
        id: nextClaimId++,
        motherId,
        claimReference,
        claimDate,
        status,
        amount,
        notes,
        createdBy,
        updatedBy,
      };
      claims.set(claim.id, claim);
      return [{ insertId: claim.id }];
    }
    if (sql.includes('FROM philhealth_claims WHERE id = ? AND mother_id = ?')) {
      const claim = claims.get(Number(params[0]));
      return claim && claim.motherId === Number(params[1]) ? [[claim]] : [[]];
    }
    if (sql.startsWith('UPDATE philhealth_claims')) {
      const [claimReference, claimDate, status, amount, notes, updatedBy, claimId, motherId] = params;
      const claim = claims.get(Number(claimId));
      if (!claim || claim.motherId !== Number(motherId)) return [{ affectedRows: 0 }];
      Object.assign(claim, { claimReference, claimDate, status, amount, notes, updatedBy });
      return [{ affectedRows: 1 }];
    }
    throw new Error(`Unexpected test SQL: ${sql}`);
  };

  const app = express();
  app.use(express.json());
  app.use('/api/mothers', verifyToken, authorizeOperational, mothersRouter);
  const server = app.listen(0);
  t.after(async () => {
    pool.query = originalQuery;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const url = `http://127.0.0.1:${server.address().port}/api/mothers/123/claims`;
  const tokenFor = (user) => jwt.sign(user, process.env.JWT_SECRET);
  const request = (token, path = '', options = {}) => fetch(`${url}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  const coordinatorToken = tokenFor({ id: 1, role: 'Community Coordinator', school_id: 12 });

  const emptyList = await request(coordinatorToken);
  assert.equal(emptyList.status, 200);
  assert.deepEqual((await emptyList.json()).claims, []);

  const invalidAmount = await request(coordinatorToken, '', {
    method: 'POST',
    body: JSON.stringify({ claimDate: '2026-10-17', amount: '-1' }),
  });
  assert.equal(invalidAmount.status, 400);
  assert.equal(claims.size, 0);

  const created = await request(coordinatorToken, '', {
    method: 'POST',
    body: JSON.stringify({
      claimReference: 'PH-100',
      claimDate: '2026-10-17',
      status: 'Submitted',
      amount: '50030.00',
      notes: 'Submitted for review',
    }),
  });
  assert.equal(created.status, 201);
  const createdClaim = (await created.json()).claim;
  assert.equal(createdClaim.claimReference, 'PH-100');
  assert.equal(createdClaim.status, 'Submitted');
  assert.equal(createdClaim.amount, '50030.00');

  const updated = await request(coordinatorToken, `/${createdClaim.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      claimReference: 'PH-100',
      claimDate: '2026-10-17',
      status: 'Paid',
      amount: '50030',
      notes: 'Payment confirmed',
    }),
  });
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).claim.status, 'Paid');

  const outOfScopeUrl = `${url.replace('/123/', '/999/')}`;
  const outOfScope = await fetch(outOfScopeUrl, {
    headers: { Authorization: `Bearer ${coordinatorToken}` },
  });
  assert.equal(outOfScope.status, 404);

  const adminToken = tokenFor({ id: 2, role: 'Admin' });
  const forbiddenWrite = await request(adminToken, '', {
    method: 'POST',
    body: JSON.stringify({ claimDate: '2026-10-17', amount: '100' }),
  });
  assert.equal(forbiddenWrite.status, 403);
});
