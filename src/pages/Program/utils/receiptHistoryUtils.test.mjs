import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calendarDays,
  getReceiptEvidenceSelectionError,
  getReceivedReceiptsByDate,
  isValidRecipient,
} from './receiptHistoryUtils.mjs';

test('calendarDays returns a complete six-week calendar beginning on Sunday', () => {
  const days = calendarDays(new Date(2025, 1, 15));

  assert.equal(days.length, 42);
  assert.equal(days[0].getDay(), 0);
  assert.equal(days[0].getDate(), 26);
  assert.equal(days[0].getMonth(), 0);
});

test('receipt dates deduplicate repeated rows by beneficiary', () => {
  const receipts = getReceivedReceiptsByDate([
    { date: '2025-02-01', monitored: true, beneficiary_key: 'mother:1' },
    { date: '2025-02-01', monitored: true, beneficiary_key: 'mother:1' },
    { date: '2025-02-01', monitored: true, beneficiary_key: 'child:2' },
    { date: '2025-02-02', monitored: false, beneficiary_key: 'child:2' },
  ]);

  assert.equal(receipts.get('2025-02-01').length, 2);
  assert.equal(receipts.has('2025-02-02'), false);
});

test('evidence selection preserves file, count, and combined-size limits', () => {
  assert.match(
    getReceiptEvidenceSelectionError([{ name: 'large.jpg', size: 5 * 1024 * 1024 + 1, type: 'image/jpeg' }], []),
    /5 MB per-photo limit/,
  );
  assert.match(
    getReceiptEvidenceSelectionError([{ name: 'file.gif', size: 1, type: 'image/gif' }], []),
    /not a supported image/,
  );
  assert.match(
    getReceiptEvidenceSelectionError(Array.from({ length: 11 }, () => ({ size: 1, type: 'image/jpeg' })), []),
    /no more than 10 photos/,
  );
  assert.match(
    getReceiptEvidenceSelectionError([{ size: 1, type: 'image/jpeg' }], [{ size: 25 * 1024 * 1024, type: 'image/jpeg' }]),
    /combined photo size/,
  );
});

test('recipient validation requires an ID and supported beneficiary type', () => {
  assert.equal(isValidRecipient({ id: 1, type: 'mother' }), true);
  assert.equal(isValidRecipient({ id: 0, type: 'child' }), false);
  assert.equal(isValidRecipient({ id: 1, type: 'school' }), false);
  assert.equal(isValidRecipient({ type: 'child' }), false);
});
