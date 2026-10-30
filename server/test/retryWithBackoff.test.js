const test = require('node:test');
const assert = require('node:assert/strict');
const retryWithBackoff = require('../src/services/retryWithBackoff');

test('retries temporary failures with exponential delays', async () => {
  let attempts = 0;
  const delays = [];

  const result = await retryWithBackoff(
    async () => {
      attempts += 1;
      if (attempts < 3) {
        throw { code: 'ETIMEDOUT' };
      }
      return 'page response';
    },
    {
      shouldRetry: (error) => error.code === 'ETIMEDOUT',
      delay: async (milliseconds) => delays.push(milliseconds),
    },
  );

  assert.equal(result, 'page response');
  assert.equal(attempts, 3);
  assert.deepEqual(delays, [500, 1000]);
});

test('does not retry non-temporary errors', async () => {
  let attempts = 0;
  const failure = new Error('invalid request');

  await assert.rejects(
    retryWithBackoff(
      async () => {
        attempts += 1;
        throw failure;
      },
      {
        shouldRetry: () => false,
        delay: async () => {},
      },
    ),
    failure,
  );

  assert.equal(attempts, 1);
});

test('throws after reaching the attempt limit', async () => {
  let attempts = 0;
  const delays = [];

  await assert.rejects(
    retryWithBackoff(
      async () => {
        attempts += 1;
        throw { code: 'ETIMEDOUT' };
      },
      {
        maxAttempts: 2,
        shouldRetry: () => true,
        delay: async (milliseconds) => delays.push(milliseconds),
      },
    ),
    { code: 'ETIMEDOUT' },
  );

  assert.equal(attempts, 2);
  assert.deepEqual(delays, [500]);
});
