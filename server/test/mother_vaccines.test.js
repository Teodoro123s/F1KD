const test = require('node:test');
const assert = require('node:assert/strict');
const { getMotherVaccineRecords } = require('../utils/motherVaccines');

test('mother vaccine records accept a single dose with later doses blank', () => {
  assert.deepEqual(
    getMotherVaccineRecords({
      influenzaDate: '2026-10-17',
      influenzaDose2Date: '',
      influenzaDose3Date: '',
    }),
    [{ name: 'Influenza', date: '2026-10-17', remarks: null }],
  );
});

test('mother vaccine records persist each available dose independently', () => {
  assert.deepEqual(
    getMotherVaccineRecords({
      tt1Date: '2026-10-17',
      tt2Date: '',
      tt3Date: '2026-12-17',
      ttRemarks: '',
    }),
    [
      { name: 'TT1', date: '2026-10-17', remarks: null },
      { name: 'TT3', date: '2026-12-17', remarks: null },
    ],
  );
});

test('vaccine remarks can be stored without a dose date', () => {
  assert.deepEqual(
    getMotherVaccineRecords({ hepatitisARemarks: 'Clinic record' }),
    [{ name: 'Hepatitis A', date: null, remarks: 'Clinic record' }],
  );
});
