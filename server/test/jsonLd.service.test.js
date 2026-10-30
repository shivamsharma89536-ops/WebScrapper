const test = require('node:test');
const assert = require('node:assert/strict');
const cheerio = require('cheerio');
const { extractJsonLd } = require('../src/services/jsonLd.service');

test('extracts fields from JSON-LD objects and nested paths', () => {
  const $ = cheerio.load(`
    <script type="application/ld+json">
      {"@type":"Product","name":"Notebook","offers":{"price":"12.50"}}
    </script>
  `);

  assert.deepEqual(
    extractJsonLd(
      $,
      [
        { name: 'title', path: 'name' },
        { name: 'price', path: 'offers.price' },
      ],
      'Product',
    ),
    [{ title: 'Notebook', price: '12.50' }],
  );
});
