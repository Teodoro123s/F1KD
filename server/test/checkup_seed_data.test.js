const test = require('node:test');
const assert = require('node:assert/strict');

const { buildMotherCheckupSamples } = require('../checkup_seed_data.js');

test('seeded mother checkups use distinct realistic dates and varied referral states', () => {
  const rows = buildMotherCheckupSamples();
  assert.ok(rows.length >= 12, 'expected multiple seed rows');

  const seenDates = new Set();
  for (const row of rows) {
    assert.match(row[3], /^\d{4}-\d{2}-\d{2}$/, 'checkup date should be ISO-formatted');
    assert.ok(!seenDates.has(row[3]), `duplicate date found: ${row[3]}`);
    seenDates.add(row[3]);
  }

  const referralYes = rows.filter((row) => row[15] === 1 || row[15] === true);
  const referralNo = rows.filter((row) => row[15] === 0 || row[15] === false);
  assert.ok(referralYes.length > 0, 'expected some hospital referrals');
  assert.ok(referralNo.length > 0, 'expected some non-referral cases');
});
