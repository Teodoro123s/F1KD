import test from 'node:test';
import assert from 'node:assert/strict';
import { getMotherIdentityErrors } from './motherIdentity.js';

const validForm = {
  firstName: 'Anne-Marie',
  middleName: 'B.',
  lastName: "O'Neil",
  maidenSurname: 'Santos Cruz',
  suffix: 'Jr.',
  dob: '10/17/2016',
  contactNumber: '09171234567',
};
const today = new Date(2026, 9, 17);

test('mother identity accepts valid names, a month-first DOB at age ten, and a PH contact number', () => {
  assert.deepEqual(getMotherIdentityErrors(validForm, today), {});
});

test('mother identity rejects missing required values and malformed names or contact numbers', () => {
  const errors = getMotherIdentityErrors({
    ...validForm,
    firstName: 'Anne2',
    middleName: 'Mary Jane',
    lastName: '',
    dob: '',
    contactNumber: '0917123456',
  }, today);

  assert.match(errors.firstName, /letters/);
  assert.match(errors.middleName, /single initial/);
  assert.match(errors.dob, /required/);
  assert.match(errors.contactNumber, /11 digits/);
  assert.equal(errors.lastName, undefined);
});

test('mother identity rejects invalid, future, and under-ten birth dates', () => {
  for (const dob of ['10/18/2026', '10/18/2016']) {
    assert.match(getMotherIdentityErrors({ ...validForm, dob }, today).dob, /past and indicate an age/);
  }
  for (const dob of ['02/30/2000', '13/01/2000']) {
    assert.match(getMotherIdentityErrors({ ...validForm, dob }, today).dob, /valid date/);
  }
});
