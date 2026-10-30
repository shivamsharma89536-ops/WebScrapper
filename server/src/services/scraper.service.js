const crypto = require('node:crypto');
const Item = require('../models/Item');
const Run = require('../models/Run');
const { previewSelector } = require('./selectorPreview.service');

function createItemHash(data) {
  const stableData = Object.keys(data)
    .sort()
    .reduce((sorted, key) => {
      sorted[key] = data[key];
      return sorted;
    }, {});

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(stableData))
    .digest('hex');
}

async function scrapeSource(source) {
  const startedAt = new Date();

  try {
    const preview = await previewSelector(source, { limit: 0 });
    let newItems = 0;

    for (const data of preview.results) {
      const hash = createItemHash(data);
      const result = await Item.updateOne(
        { source: source._id, hash },
        {
          $setOnInsert: {
            source: source._id,
            data,
            hash,
          },
        },
        { upsert: true }
      );

      if (result.upsertedCount === 1) {
        newItems += 1;
      }
    }

    const result = { found: preview.count, newItems };
    await Run.create({
      source: source._id,
      status: 'success',
      ...result,
      startedAt,
      finishedAt: new Date(),
    });
    return result;
  } catch (error) {
    await Run.create({
      source: source._id,
      status: 'failed',
      error: error.message,
      startedAt,
      finishedAt: new Date(),
    });
    throw error;
  }
}

module.exports = { createItemHash, scrapeSource };
