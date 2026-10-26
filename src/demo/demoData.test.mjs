import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEMO_BENEFICIARIES,
  DEMO_NOTIFICATIONS,
  DEMO_PROGRAMS,
  DEMO_REPORTS,
  DEMO_SCHOOLS,
} from './demoData.mjs';

test('mock demo data is explicitly synthetic and references valid demo schools', () => {
  assert.equal(DEMO_BENEFICIARIES.length, 8);
  assert.ok(DEMO_BENEFICIARIES.every(({ name, school, id }) => (
    name.startsWith('Demo ')
    && ['child-', 'mother-'].some((prefix) => id.startsWith(prefix))
  )));
  assert.ok(DEMO_BENEFICIARIES.every(({ school }) => DEMO_SCHOOLS.some((demoSchool) => demoSchool.name === school)));
});

test('mock program and report collections have the expected demo shape', () => {
  assert.equal(DEMO_PROGRAMS.length, 2);
  assert.equal(DEMO_REPORTS.length, 3);
  assert.equal(DEMO_NOTIFICATIONS.length, 3);
  assert.ok(DEMO_PROGRAMS.every((program) => program.name.startsWith('Demo ')));
});
