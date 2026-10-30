const { askGemini } = require('../services/gemini.service');

async function chat(req, res) {
  const { message } = req.body || {};

  if (typeof message !== 'string' || !message.trim() || message.length > 1000) {
    return res.status(400).json({
      error: 'Message must be a non-empty string of at most 1000 characters',
    });
  }

  const answer = await askGemini(message.trim());
  return res.json({ answer });
}

module.exports = { chat };
