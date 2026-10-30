const test = require('node:test');
const assert = require('node:assert/strict');
const { createItemHash } = require('../src/services/scraper.service');

test('creates the same hash when object keys have different order', () => {
  assert.equal(
    createItemHash({ title: 'Book', price: '$10' }),
    createItemHash({ price: '$10', title: 'Book' }),
  );
});

test('creates different hashes when item data changes', () => {
  assert.notEqual(
    createItemHash({ title: 'Book', price: '$10' }),
    createItemHash({ title: 'Book', price: '$12' }),
  );
});
