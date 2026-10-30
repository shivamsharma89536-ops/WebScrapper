const Item = require('../models/Item');
const Run = require('../models/Run');
const Source = require('../models/Source');
const { scrapeSource } = require('../services/scraper.service');

async function scrapeSourceNow(req, res) {
  const source = await Source.findById(req.params.id).lean();
  if (!source) {
    return res.status(404).json({ error: 'Source not found' });
  }

  const result = await scrapeSource(source);
  return res.json({ message: 'Scrape completed', ...result });
}

async function listItems(req, res) {
  const filter = {};
  if (req.query.source) {
    filter.source = req.query.source;
  }
  if (req.query.category) {
    const sources = await Source.find({ category: req.query.category }).select('_id').lean();
    filter.source = { $in: sources.map((source) => source._id) };
  }

  const items = await Item.find(filter)
    .sort({ scrapedAt: -1 })
    .limit(100)
    .lean();

  return res.json({ items });
}

async function listRuns(req, res) {
  const filter = {};
  if (req.query.source) {
    filter.source = req.query.source;
  }

  const runs = await Run.find(filter)
    .sort({ startedAt: -1 })
    .limit(50)
    .lean();

  return res.json({ runs });
}

module.exports = { scrapeSourceNow, listItems, listRuns };
