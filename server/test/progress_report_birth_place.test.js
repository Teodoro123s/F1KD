const test = require('node:test');
const assert = require('node:assert/strict');
const { splitBirthPlace } = require('../utils/birthPlace');
const { validateReportProposal } = require('../utils/progressReportAI');

test('splits a saved city and province for report columns', () => {
  assert.deepEqual(splitBirthPlace('Cebu City, Cebu'), {
    birthPlaceCity: 'Cebu City',
    birthPlaceProvince: 'Cebu',
  });
});

test('keeps legacy city-only values and empty locations safe', () => {
  assert.deepEqual(splitBirthPlace(' Davao City '), {
    birthPlaceCity: 'Davao City',
    birthPlaceProvince: '',
  });
  assert.deepEqual(splitBirthPlace(''), {
    birthPlaceCity: '',
    birthPlaceProvince: '',
  });
});

test('allows city and province as profile report fields for mothers and children', () => {
  for (const beneficiaryType of ['mother', 'child']) {
    assert.deepEqual(validateReportProposal({
      reportCategory: 'profile',
      beneficiaryType,
      metricIds: ['birthPlaceCity', 'birthPlaceProvince'],
    }).metricIds, ['birthPlaceCity', 'birthPlaceProvince']);
  }
});
