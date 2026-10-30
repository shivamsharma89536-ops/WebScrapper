const test = require('node:test');
const assert = require('node:assert/strict');
const cheerio = require('cheerio');
const { extractRss } = require('../src/services/rss.service');

test('extracts basic RSS item fields', () => {
  const $ = cheerio.load(`
    <rss><channel>
      <item>
        <title>New recruitment update</title>
        <link>https://example.com/update</link>
        <pubDate>Sat, 31 Oct 2026 10:00:00 GMT</pubDate>
        <description>Details</description>
      </item>
    </channel></rss>
  `, { xmlMode: true });

  assert.deepEqual(extractRss($), [{
    title: 'New recruitment update',
    link: 'https://example.com/update',
    publishedAt: 'Sat, 31 Oct 2026 10:00:00 GMT',
    description: 'Details',
  }]);
});
