import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getAllBarangays,
  getAllProvinces,
  getMunicipalitiesByProvince,
} from '@aivangogh/ph-address';
import {
  getPhilippineBarangays,
  getPhilippineCities,
  getPhilippineProvinceName,
  PHILIPPINE_PROVINCES,
} from './philippineLocations.js';

test('lists the current PSGC provinces and standalone geographic areas', () => {
  assert.equal(getAllProvinces().length, 82);
  assert.equal(PHILIPPINE_PROVINCES.length, 85);
  assert.ok(PHILIPPINE_PROVINCES.includes('Negros Occidental'));
  assert.ok(PHILIPPINE_PROVINCES.includes('Maguindanao del Norte'));
  assert.ok(PHILIPPINE_PROVINCES.includes('National Capital Region (NCR)'));
  assert.ok(PHILIPPINE_PROVINCES.includes('Bangsamoro Special Geographic Area'));
  assert.ok(PHILIPPINE_PROVINCES.includes('Isabela City (Independent City)'));
  assert.equal(getPhilippineProvinceName('Metro Manila (NCR)'), 'National Capital Region (NCR)');
});

test('returns every barangay for a city and resolves legacy city names', async () => {
  assert.ok(getPhilippineCities('Ilocos Norte').includes('Bacarra'));
  assert.equal((await getPhilippineBarangays('Ilocos Norte', 'Bacarra')).length, 43);
  assert.ok((await getPhilippineBarangays('Ilocos Norte', 'Bacarra')).includes('Bani'));
  assert.ok((await getPhilippineBarangays('Metro Manila', 'Manila City')).length > 0);
});

test('includes NCR, BARMM special-area, and independent-city localities', async () => {
  assert.ok(getPhilippineCities('NCR').includes('Manila'));
  assert.ok(getPhilippineCities('Bangsamoro Special Geographic Area').includes('Kadayangan'));
  assert.ok((await getPhilippineBarangays('Bangsamoro Special Geographic Area', 'Kadayangan')).length > 0);
  assert.deepEqual(
    getPhilippineCities('Isabela City (Independent City)'),
    ['Isabela City']
  );
  assert.ok((await getPhilippineBarangays('Isabela City', 'Isabela City')).length > 0);
});

test('covers all barangays in the current PSGC snapshot through the form lookups', async () => {
  const listedBarangays = [];
  for (const province of PHILIPPINE_PROVINCES) {
    for (const city of getPhilippineCities(province)) {
      listedBarangays.push(...await getPhilippineBarangays(province, city));
    }
  }

  const expectedBarangays = getAllBarangays().map((barangay) => barangay.name);

  assert.equal(expectedBarangays.length, 42010);
  assert.deepEqual(
    [...listedBarangays].sort((a, b) => a.localeCompare(b)),
    [...expectedBarangays].sort((a, b) => a.localeCompare(b))
  );
});

test('includes Manila barangays from its PSGC district subdivisions', async () => {
  const districts = getMunicipalitiesByProvince('1380600000');
  const expectedBarangays = districts.flatMap((district) =>
    getAllBarangays()
      .filter((barangay) => barangay.municipalCityCode === district.psgcCode)
      .map((barangay) => barangay.name)
  );

  assert.ok(districts.length > 0);
  assert.deepEqual(
    await getPhilippineBarangays('NCR', 'Manila'),
    expectedBarangays.sort((a, b) => a.localeCompare(b))
  );
});
