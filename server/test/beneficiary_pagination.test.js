const test = require('node:test');
const assert = require('node:assert/strict');

const express = require('express');
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
const childrenRouter = require('../routes/children');

test('beneficiary lists validate bounded paging, preserve scope, and batch child checkups', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  const listQueries = [];
  let returnEmptyPage = false;
  pool.query = async (sql, params = []) => {
    const normalizedSql = sql.trimStart();
    if (normalizedSql.startsWith('SELECT COUNT(*) AS total FROM mothers m')) {
      return [[{ total: returnEmptyPage ? 0 : 3 }]];
    }
    if (normalizedSql.startsWith('SELECT m.*')) {
      listQueries.push({ type: 'mothers', sql, params });
      const limit = params.at(-2);
      const offset = params.at(-1);
      return [Array.from(
        { length: returnEmptyPage ? 0 : Math.min(limit, Math.max(0, 3 - offset)) },
        (_, index) => {
          const id = 21 + offset + index;
          return {
            id,
            mother_code: `MTH-${id}`,
            first_name: 'Jamie',
            last_name: 'Santos',
            community_id: 12,
            group_id: 20,
            batch_id: 30,
            community: 'Test Community',
            group_name: 'Test Group',
            batch_name: 'Test Batch',
            lmp_date: null,
            children_count: 1,
          };
        },
      )];
    }
    if (normalizedSql.startsWith('SELECT mc.*')) {
      listQueries.push({ type: 'mother-checkups', sql, params });
      return [[]];
    }
    if (normalizedSql.startsWith('SELECT COUNT(*) AS total FROM children c')) {
      return [[{ total: returnEmptyPage ? 0 : 3 }]];
    }
    if (normalizedSql.startsWith('SELECT c.*, COALESCE(c.batch_id')) {
      listQueries.push({ type: 'children', sql, params });
      const limit = params.at(-2);
      const offset = params.at(-1);
      return [Array.from(
        { length: returnEmptyPage ? 0 : Math.min(limit, Math.max(0, 3 - offset)) },
        (_, index) => {
          const id = 31 + offset + index;
          return {
            id,
            child_code: `CHD-${id}`,
            mother_id: 21,
            first_name: 'Jamie',
            last_name: 'Santos',
            community_id: 12,
            group_id: 20,
            batch_id: 30,
            effective_batch_id: 30,
            community_name: 'Test Community',
            group_name: 'Test Group',
            batch_name: 'Test Batch',
          };
        },
      )];
    }
    if (normalizedSql.startsWith('SELECT cc.*')) {
      listQueries.push({ type: 'child-checkups', sql, params });
      return [[]];
    }
    throw new Error(`Unexpected pagination test SQL: ${sql}`);
  };

  const app = express();
  app.use((req, res, next) => {
    req.schoolId = 12;
    next();
  });
  app.use('/api/mothers', mothersRouter);
  app.use('/api/children', childrenRouter);
  const server = app.listen(0);
  t.after(async () => {
    pool.query = originalQuery;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  const invalidPageResponse = await fetch(`${baseUrl}/mothers?page=0`);
  assert.equal(invalidPageResponse.status, 400);
  assert.equal(listQueries.length, 0, 'invalid pagination is rejected before database access');
  const invalidPageSizeResponse = await fetch(`${baseUrl}/children?perPage=101`);
  assert.equal(invalidPageSizeResponse.status, 400);
  assert.equal(listQueries.length, 0, 'oversized pages are rejected before database access');

  const firstMotherPageResponse = await fetch(`${baseUrl}/mothers?page=1&perPage=1`);
  assert.equal(firstMotherPageResponse.status, 200);
  assert.equal((await firstMotherPageResponse.json()).mothers.length, 1);
  const mothersResponse = await fetch(
    `${baseUrl}/mothers?page=2&perPage=1&search=Santos+June&groupId=20&sortBy=name&sortOrder=asc`,
  );
  assert.equal(mothersResponse.status, 200);
  const motherPayload = await mothersResponse.json();
  assert.equal(motherPayload.mothers.length, 1);
  assert.deepEqual(motherPayload.pagination, { page: 2, perPage: 1, total: 3, totalPages: 3 });
  const motherListQuery = listQueries.find(
    (query) => query.type === 'mothers' && query.params.includes('%june%'),
  );
  assert.match(motherListQuery.sql, /m\.archived_at IS NULL/);
  assert.match(motherListQuery.sql, /LIMIT \? OFFSET \?/);
  assert.match(motherListQuery.sql, /ORDER BY m\.last_name ASC, m\.id ASC/);
  assert.deepEqual(motherListQuery.params.slice(0, 2), [12, 20]);
  assert.ok(motherListQuery.params.includes('%june%'));
  assert.ok(motherListQuery.params.includes('%santos%'));
  assert.ok(motherListQuery.sql.includes(') AND ('));
  assert.equal(motherListQuery.params.at(-2), 1);
  assert.equal(motherListQuery.params.at(-1), 1);
  assert.match(motherListQuery.sql, /m\.address/);
  const motherCheckupQuery = listQueries.find((query) => query.type === 'mother-checkups');
  assert.match(motherCheckupQuery.sql, /mc\.mother_id IN \(\?\)/);
  assert.deepEqual(motherCheckupQuery.params, [21]);
  const finalMotherPageResponse = await fetch(`${baseUrl}/mothers?page=3&perPage=1`);
  assert.equal(finalMotherPageResponse.status, 200);
  assert.equal((await finalMotherPageResponse.json()).mothers.length, 1);

  const childrenResponse = await fetch(
    `${baseUrl}/children?page=2&perPage=2&search=Santos+Jamie&groupId=20&batchId=30&sortBy=name&sortOrder=asc`,
  );
  assert.equal(childrenResponse.status, 200);
  const childPayload = await childrenResponse.json();
  assert.equal(childPayload.children.length, 1);
  assert.deepEqual(childPayload.pagination, { page: 2, perPage: 2, total: 3, totalPages: 2 });
  const childListQuery = listQueries.find((query) => query.type === 'children');
  assert.match(childListQuery.sql, /c\.archived_at IS NULL/);
  assert.match(childListQuery.sql, /LIMIT \? OFFSET \?/);
  assert.match(childListQuery.sql, /ORDER BY c\.last_name ASC, c\.id ASC/);
  assert.deepEqual(childListQuery.params.slice(0, 4), [12, 20, 20, 30]);
  assert.ok(childListQuery.params.includes('%jamie%'));
  assert.ok(childListQuery.params.includes('%santos%'));
  assert.ok(childListQuery.sql.includes(') AND ('));
  assert.equal(childListQuery.params.at(-2), 2);
  assert.equal(childListQuery.params.at(-1), 2);
  assert.match(childListQuery.sql, /c\.address/);
  assert.match(childListQuery.sql, /m\.address/);
  const childCheckupQueries = listQueries.filter((query) => query.type === 'child-checkups');
  assert.equal(childCheckupQueries.length, 1, 'one checkup query hydrates all children on the page');
  assert.deepEqual(childCheckupQueries[0].params, [33]);
  assert.match(childCheckupQueries[0].sql, /cc\.child_id IN \(\?\)/);
  const firstChildPageResponse = await fetch(`${baseUrl}/children?page=1&perPage=2`);
  assert.equal(firstChildPageResponse.status, 200);
  const firstChildPage = await firstChildPageResponse.json();
  assert.equal(firstChildPage.children.length, 2);
  assert.deepEqual(listQueries.filter((query) => query.type === 'child-checkups').at(-1).params, [31, 32]);
  const finalChildPageResponse = await fetch(`${baseUrl}/children?page=2&perPage=2`);
  assert.equal(finalChildPageResponse.status, 200);
  assert.equal((await finalChildPageResponse.json()).children.length, 1);

  returnEmptyPage = true;
  const emptyChildrenResponse = await fetch(`${baseUrl}/children?page=1&perPage=1`);
  assert.equal(emptyChildrenResponse.status, 200);
  const emptyChildPayload = await emptyChildrenResponse.json();
  assert.deepEqual(emptyChildPayload.children, []);
  assert.deepEqual(emptyChildPayload.pagination, { page: 1, perPage: 1, total: 0, totalPages: 0 });
  assert.equal(listQueries.filter((query) => query.type === 'child-checkups').length, 3);
});
