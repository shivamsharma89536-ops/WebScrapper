const test = require('node:test');
const assert = require('node:assert/strict');
const { chat } = require('../src/controllers/chat.controller');

test('rejects an empty chatbot message', async () => {
  let response;
  await chat({ body: { message: ' ' } }, {
    status(code) {
      response = code;
      return this;
    },
    json(body) {
      return body;
    },
  });

  assert.equal(response, 400);
});
