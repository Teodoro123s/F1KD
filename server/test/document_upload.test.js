const test = require('node:test');
const assert = require('node:assert/strict');
const { validateDocumentFile } = require('../middleware/documentUpload');

const makeFile = (mimetype, bytes) => ({
  mimetype,
  buffer: Buffer.from(bytes),
  originalname: 'document',
});

test('accepts files whose contents match the declared document type', () => {
  assert.equal(validateDocumentFile(makeFile('application/pdf', '%PDF-1.7')), true);
  assert.equal(validateDocumentFile(makeFile('image/jpeg', [0xff, 0xd8, 0xff, 0x00])), true);
  assert.equal(validateDocumentFile(makeFile('image/png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), true);
  assert.equal(validateDocumentFile(makeFile('image/webp', 'RIFFxxxxWEBP')), true);
});

test('rejects spoofed MIME types and unreadable upload bodies', () => {
  assert.throws(
    () => validateDocumentFile(makeFile('application/pdf', '<html>')),
    /content does not match/,
  );
  assert.throws(
    () => validateDocumentFile({ mimetype: 'image/png', buffer: null }),
    /could not be read/,
  );
});
