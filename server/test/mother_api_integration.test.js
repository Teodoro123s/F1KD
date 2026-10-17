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

test('mother create and update APIs accept beneficiary payloads without database writes', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  let mother = null;
  let insertValues = null;
  let updateValues = null;
  pool.query = async (sql, params = []) => {
    if (sql.startsWith('INSERT INTO mothers')) {
      insertValues = params;
      mother = {
        id: 123,
        mother_code: params[0],
        first_name: params[1],
        last_name: params[3],
        dob: params[6],
        contact_number: params[7],
        community_id: params[8],
        group_id: params[11],
        philhealth_member: params[47],
        philhealth_number: params[48],
      };
      return [{ insertId: mother.id }];
    }
    if (sql === 'SELECT * FROM mothers WHERE id = ?') return [[mother]];
    if (sql.startsWith('UPDATE mothers SET ? WHERE id = ?')) {
      updateValues = params[0];
      mother = { ...mother, ...updateValues };
      return [{ affectedRows: 1 }];
    }
    if (sql.includes('FROM mothers WHERE (id = ? OR mother_code = ?)')) return [[mother]];
    if (sql.includes('FROM mothers m') && sql.includes('LEFT JOIN groups')) return [[mother]];
    if (sql.startsWith('INSERT INTO notifications')) return [{ insertId: 1 }];
    if (sql.startsWith('DELETE FROM mother_')) return [{ affectedRows: 0 }];
    if (
      sql.startsWith('SELECT * FROM mother_ob_history')
      || sql.startsWith('SELECT * FROM mother_medical_conditions')
      || sql.startsWith('SELECT * FROM mother_dental_records')
      || sql.startsWith('SELECT * FROM mother_vaccinations')
      || sql.includes('FROM mother_checkups mc')
    ) return [[]];
    throw new Error(`Unexpected test SQL: ${sql}`);
  };

  const app = express();
  app.use(express.json());
  app.use('/api/mothers', mothersRouter);
  const server = app.listen(0);
  t.after(async () => {
    pool.query = originalQuery;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/mothers`;

  const invalidPinCreateResponse = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ philhealthMember: true, philhealthNumber: '1234' }),
  });
  assert.equal(invalidPinCreateResponse.status, 400);

  const createResponse = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Test',
      lastName: 'Mother',
      dob: '1990-01-01',
      contactNumber: '09171234567',
      communityId: 12,
      groupId: 20,
      philhealthMember: true,
      philhealthNumber: '123456789012',
    }),
  });
  assert.equal(createResponse.status, 201);
  assert.equal(insertValues[1], 'Test');
  assert.equal(insertValues[3], 'Mother');
  assert.equal(insertValues[6], '1990-01-01');
  assert.equal(insertValues[7], '09171234567');
  assert.equal(insertValues[47], 1);
  assert.equal(insertValues[48], '12-345678901-2');
  const createdProfile = (await createResponse.json()).mother;
  assert.equal(createdProfile.name, 'Test Mother');
  assert.equal(createdProfile.philhealthMember, true);
  assert.equal(createdProfile.philhealthNumber, '12-345678901-2');

  const invalidPinUpdateResponse = await fetch(`${baseUrl}/123`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ philhealthNumber: 'bad-pin' }),
  });
  assert.equal(invalidPinUpdateResponse.status, 400);

  const updateResponse = await fetch(`${baseUrl}/123`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Updated',
      lastName: 'Mother',
      contactNumber: '09171234567',
      philhealthNumber: '987654321098',
    }),
  });
  assert.equal(updateResponse.status, 200);
  assert.equal(updateValues.first_name, 'Updated');
  assert.equal(updateValues.philhealth_number, '98-765432109-8');
  const updatedProfile = (await updateResponse.json()).mother;
  assert.equal(updatedProfile.name, 'Updated Mother');
  assert.equal(updatedProfile.philhealthNumber, '98-765432109-8');
});
