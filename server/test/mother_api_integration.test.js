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

test('mother registration saves initial monitoring measurements as a completed check-up', async (t) => {
  await pool.ready;
  const originalQuery = pool.query;
  let mother = null;
  let insertValues = null;
  let initialCheckupValues = null;
  let savedCheckupValues = null;
  let savedCheckupSql = '';
  let updateValues = null;
  let obHistoryInsertValues = null;
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
    if (sql.startsWith('INSERT INTO mother_checkups')) {
      if (sql.includes('developmental_status')) {
        savedCheckupSql = sql;
        savedCheckupValues = params;
      } else initialCheckupValues = params;
      return [{ insertId: 456 }];
    }
    if (sql.startsWith('SELECT id FROM mother_checkups')) return [[]];
    if (sql.startsWith('UPDATE mothers m SET progress =')) {
      mother.progress = 11;
      return [{ affectedRows: 1 }];
    }
    if (sql === 'SELECT * FROM mothers WHERE id = ?') return [[mother]];
    if (sql.startsWith('UPDATE mothers SET ? WHERE id = ?')) {
      updateValues = params[0];
      mother = { ...mother, ...updateValues };
      return [{ affectedRows: 1 }];
    }
    if (sql.startsWith('INSERT INTO mother_ob_history')) {
      obHistoryInsertValues = params;
      return [{ insertId: 789 }];
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
    ) return [[]];
    if (sql.includes('FROM mother_checkups mc')) {
      const values = savedCheckupValues || initialCheckupValues;
      return [values ? [{
        id: 456,
        mother_id: values[0],
        trimester: values[1],
        checkup_number: values[2],
        checkup_date: values[3],
        gestational_age_weeks: values[4],
        blood_pressure: values[5],
        weight_kg: values[6],
        height_cm: values[7],
        bmi: values[8],
        developmental_status: savedCheckupValues ? values[9] : null,
        nutritional_status: values[savedCheckupValues ? 10 : 9],
        fundal_height_cm: values[savedCheckupValues ? 11 : 10],
        fetal_heart_rate_bpm: values[savedCheckupValues ? 12 : 11],
      }] : []];
    }
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

  const invalidBloodPressureCreateResponse = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Test',
      lastName: 'Mother',
      dob: '1990-01-01',
      contactNumber: '09171234567',
      communityId: 12,
      groupId: 20,
      batchId: 30,
      prenatalBp: '120',
    }),
  });
  assert.equal(invalidBloodPressureCreateResponse.status, 400);
  assert.match((await invalidBloodPressureCreateResponse.json()).error, /systolic\/diastolic/i);

  const missingBatchResponse = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Test',
      lastName: 'Mother',
      dob: '1990-01-01',
      contactNumber: '09171234567',
      communityId: 12,
      groupId: 20,
    }),
  });
  assert.equal(missingBatchResponse.status, 400);
  assert.match((await missingBatchResponse.json()).error, /batch is required/i);

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
      batchId: 30,
      prenatalRegDate: '2026-10-18',
      trimester: '2nd Trimester',
      gestationalAge: 20,
      prenatalWeight: '58',
      prenatalBp: '120/80',
      prenatalHeight: '155',
      fundalHeight: '',
      fhr: '',
      obHistory: [{ event: 'G1', gestationalAge: '12', outcome: 'Normal' }],
      philhealthMember: true,
      philhealthNumber: '123456789012',
    }),
  });
  assert.equal(createResponse.status, 201);
  assert.deepEqual(obHistoryInsertValues, [123, 'G1', 'G1', '12', 'Normal', 1]);
  assert.equal(insertValues[1], 'Test');
  assert.equal(insertValues[3], 'Mother');
  assert.equal(insertValues[6], '1990-01-01');
  assert.equal(insertValues[7], '09171234567');
  assert.equal(insertValues[12], 30);
  assert.equal(insertValues[47], 1);
  assert.equal(insertValues[48], '12-345678901-2');
  assert.deepEqual(initialCheckupValues, [123, '2nd Trimester', 2, '2026-10-18', 20, '120/80', '58', '155', 24.1, 'Normal', null, null, null, null, null]);
  const createdProfile = (await createResponse.json()).mother;
  assert.equal(createdProfile.name, 'Test Mother');
  assert.equal(createdProfile.philhealthMember, true);
  assert.equal(createdProfile.philhealthNumber, '12-345678901-2');
  assert.deepEqual(createdProfile.checkups[0], [null, null, null]);
  assert.equal(createdProfile.checkups[1][1].completed, true);
  assert.equal(createdProfile.checkups[1][1].weight, '58');
  assert.equal(createdProfile.checkups[1][1].bp, '120/80');
  assert.equal(createdProfile.progress, 11);

  const invalidCheckupAmountResponse = await fetch(`${baseUrl}/123/checkups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trimester: '1st Trimester', checkupNumber: 1, bp: '120/80', amount: '100000000' }),
  });
  assert.equal(invalidCheckupAmountResponse.status, 400);
  assert.match((await invalidCheckupAmountResponse.json()).error, /99,999,999\.99/);

  const invalidBloodPressureCheckupResponse = await fetch(`${baseUrl}/123/checkups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trimester: '1st Trimester', checkupNumber: 1, bp: '80/80' }),
  });
  assert.equal(invalidBloodPressureCheckupResponse.status, 400);
  assert.match((await invalidBloodPressureCheckupResponse.json()).error, /higher than diastolic/i);

  const invalidScreeningResponse = await fetch(`${baseUrl}/123/checkups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trimester: '1st Trimester', checkupNumber: 1, bp: '120/80', developmentalStatus: 'Unknown' }),
  });
  assert.equal(invalidScreeningResponse.status, 400);

  const screeningCheckupResponse = await fetch(`${baseUrl}/123/checkups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trimester: '1st Trimester', checkupNumber: 1, bp: '120/80', developmentalStatus: 'At Risk' }),
  });
  assert.equal(screeningCheckupResponse.status, 200);
  assert.equal(savedCheckupValues[9], 'At Risk');
  assert.equal((savedCheckupSql.match(/\?/g) || []).length, savedCheckupValues.length);
  assert.equal((await screeningCheckupResponse.json()).success, true);

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
