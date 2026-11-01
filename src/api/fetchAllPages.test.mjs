import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchAllPages } from './fetchAllPages.mjs';

test('fetchAllPages combines bounded pages while preserving the first response metadata', async () => {
  const requestedPages = [];
  const result = await fetchAllPages(async ({ page, perPage, search }) => {
    requestedPages.push(page);
    return {
      records: [`${search}-${page}`],
      pagination: { page, perPage, total: 5, totalPages: 3 },
    };
  }, 'records', { perPage: 2, search: 'item' });

  assert.deepEqual(requestedPages, [1, 2, 3]);
  assert.deepEqual(result.records, ['item-1', 'item-2', 'item-3']);
  assert.equal('pagination' in result, false, 'aggregated responses do not advertise first-page metadata');
});

test('fetchAllPages rejects malformed pagination and accepts a valid empty result', async () => {
  await assert.rejects(
    fetchAllPages(async () => ({ records: [], pagination: {} }), 'records'),
    /invalid records pagination metadata/,
  );
  const result = await fetchAllPages(async () => ({
    records: [],
    pagination: { page: 1, perPage: 100, total: 0, totalPages: 0 },
  }), 'records');
  assert.deepEqual(result.records, []);
});
