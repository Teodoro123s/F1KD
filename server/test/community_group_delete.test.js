const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const mysql = require('mysql2/promise');

const fakePool = {
  query: async () => [[]],
  getConnection: async () => ({ query: async () => [[]], release() {} }),
};
mysql.createPool = () => fakePool;
mysql.createConnection = async () => ({ query: async () => [[]], end: async () => {} });

const pool = require('../db');
const { authorizeOperational } = require('../middleware/authorize');
const communityRouter = require('../routes/community');

test('legacy group deletion is disabled in favor of archival', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  let databaseQueries = 0;
  pool.query = async () => {
    databaseQueries += 1;
    throw new Error('Legacy delete must not access the database');
  };

  const app = express();
  app.use('/api/community', (req, res, next) => {
    req.user = { id: 7, role: 'Community Coordinator', school_id: 91 };
    next();
  }, authorizeOperational, communityRouter);
  const server = app.listen(0);
  t.after(async () => {
    pool.query = originalQuery;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/community/groups/12`, { method: 'DELETE' });
  assert.equal(response.status, 405);
  assert.match((await response.json()).error, /archive workflow/i);
  assert.equal(databaseQueries, 0);
});
