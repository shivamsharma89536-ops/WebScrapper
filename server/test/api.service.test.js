const test = require('node:test');
const assert = require('node:assert/strict');
const { extractApiItems } = require('../src/services/api.service');

test('extracts fields from an API collection', () => {
  const payload = {
    jobs: [{
      title: 'Backend Intern',
      location: { name: 'Remote' },
      absolute_url: 'https://example.com/job/1',
    }],
  };

  assert.deepEqual(
    extractApiItems(payload, 'jobs', [
      { name: 'title', path: 'title' },
      { name: 'location', path: 'location.name' },
      { name: 'link', path: 'absolute_url' },
    ]),
    [{
      title: 'Backend Intern',
      location: 'Remote',
      link: 'https://example.com/job/1',
    }],
  );
});
