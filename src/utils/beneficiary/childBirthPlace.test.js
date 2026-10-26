import test from 'node:test';
import assert from 'node:assert/strict';
import { joinChildBirthPlace, splitChildBirthPlace } from './childBirthPlace.js';

test('splits a saved city and province and preserves legacy city-only values', () => {
  assert.deepEqual(splitChildBirthPlace('Cebu City, Cebu'), {
    birthPlaceCity: 'Cebu City',
    birthPlaceProvince: 'Cebu',
  });
  assert.deepEqual(splitChildBirthPlace('Cebu City'), {
    birthPlaceCity: 'Cebu City',
    birthPlaceProvince: '',
  });
});

test('joins city and province for storage while allowing a single location value', () => {
  assert.equal(joinChildBirthPlace('Cebu City', 'Cebu'), 'Cebu City, Cebu');
  assert.equal(joinChildBirthPlace('Cebu City', ''), 'Cebu City');
  assert.equal(joinChildBirthPlace('', 'Cebu'), 'Cebu');
});
