const test = require('node:test');
const assert = require('node:assert/strict');
const { validateSourceInput } = require('../src/validators/source.validator');
const { previewSelector } = require('../src/services/selectorPreview.service');

const validSource = {
  name: 'Books to Scrape',
  url: 'https://books.toscrape.com/',
  extractionRules: {
    itemSelector: 'article.product_pod',
    fields: [
      { name: 'title', selector: 'h3 a', attribute: 'title' },
      { name: 'price', selector: '.price_color' },
    ],
  },
};

test('accepts a complete public HTTP source definition', () => {
  assert.equal(validateSourceInput(validSource), null);
});

test('rejects private and non-HTTP source URLs', () => {
  for (const url of [
    'http://localhost:5000/',
    'http://192.168.1.10/',
    'ftp://books.toscrape.com/',
    'https://user:password@books.toscrape.com/',
  ]) {
    assert.notEqual(validateSourceInput({ ...validSource, url }), null);
  }
});

test('rejects duplicate extraction field names', () => {
  const duplicateFields = {
    ...validSource,
    extractionRules: {
      ...validSource.extractionRules,
      fields: [
        { name: 'title', selector: 'h3 a' },
        { name: 'TITLE', selector: '.title' },
      ],
    },
  };

  assert.match(validateSourceInput(duplicateFields), /unique/);
});

test('rejects unsupported source properties', () => {
  assert.match(
    validateSourceInput({ ...validSource, isAdmin: true }),
    /unsupported/,
  );
});

test('accepts an optional enabled cron schedule', () => {
  assert.equal(
    validateSourceInput({
      ...validSource,
      category: 'government-job',
      schedule: '*/15 * * * *',
      enabled: true,
    }),
    null,
  );
});

test('rejects an unsupported source category', () => {
  assert.match(
    validateSourceInput({ ...validSource, category: 'sports' }),
    /Category/,
  );
});

test('rejects an invalid cron schedule', () => {
  assert.match(
    validateSourceInput({ ...validSource, schedule: 'every fifteen minutes' }),
    /cron/,
  );
});

test('accepts JSON-LD extraction fields', () => {
  assert.equal(
    validateSourceInput({
      name: 'JSON-LD source',
      url: 'https://example.com/',
      extractionRules: {
        mode: 'jsonld',
        jsonLdType: 'Product',
        fields: [{ name: 'title', path: 'name' }],
      },
    }),
    null,
  );
});

test('accepts an RSS source without CSS fields', () => {
  assert.equal(
    validateSourceInput({
      name: 'Daily news',
      url: 'https://example.com/news.xml',
      category: 'news',
      extractionRules: { mode: 'rss', fields: [] },
    }),
    null,
  );
});

test('accepts an API source with a collection path', () => {
  assert.equal(
    validateSourceInput({
      name: 'Greenhouse placements',
      url: 'https://boards-api.greenhouse.io/v1/boards/stripe/jobs?content=true',
      category: 'placement',
      extractionRules: {
        mode: 'api',
        collectionPath: 'jobs',
        fields: [{ name: 'title', path: 'title' }],
      },
    }),
    null,
  );
});

test('selector preview refuses private network destinations', async () => {
  await assert.rejects(
    previewSelector({
      ...validSource,
      url: 'http://127.0.0.1/',
    }),
    { statusCode: 400 },
  );
});
