require('dotenv').config();

const mongoose = require('mongoose');
const Source = require('../models/Source');
const connectDB = require('../config/db');

const sources = [
  {
    name: 'Stripe Greenhouse Jobs',
    category: 'placement',
    url: 'https://boards-api.greenhouse.io/v1/boards/stripe/jobs?content=true',
    schedule: '0 */6 * * *',
    enabled: true,
    extractionRules: {
      mode: 'api',
      collectionPath: 'jobs',
      fields: [
        { name: 'title', path: 'title' },
        { name: 'location', path: 'location.name' },
        { name: 'link', path: 'absolute_url' },
        { name: 'updated', path: 'updated_at' },
      ],
    },
  },
  {
    name: 'Sarkari Result Updates',
    category: 'government-job',
    url: 'https://www.sarkariresult.com/feed/',
    schedule: '0 */6 * * *',
    enabled: true,
    extractionRules: {
      mode: 'rss',
      fields: [],
    },
  },
  {
    name: 'Y Combinator Hacker News',
    category: 'news',
    url: 'https://news.ycombinator.com/rss',
    schedule: '0 * * * *',
    enabled: true,
    extractionRules: {
      mode: 'rss',
      fields: [],
    },
  },
];

async function seedSources() {
  await connectDB();

  await Source.updateOne(
    { url: 'https://www.sarkariresult.com/feed_rss.xml' },
    { $set: { url: 'https://www.sarkariresult.com/feed/' } },
  );

  for (const source of sources) {
    await Source.updateOne(
      { url: source.url },
      { $set: source },
      { upsert: true, runValidators: true },
    );
    console.log(`Source saved: ${source.name}`);
  }
}

seedSources()
  .catch((error) => {
    console.error('Source seeding failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
