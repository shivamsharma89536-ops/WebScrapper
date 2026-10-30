const cron = require('node-cron');
const Source = require('../models/Source');
const { scrapeSource } = require('./scraper.service');

const tasks = new Map();

function stopSourceSchedule(sourceId) {
  const task = tasks.get(sourceId.toString());
  if (task) {
    task.stop();
    tasks.delete(sourceId.toString());
  }
}

function scheduleSource(source) {
  const sourceId = source._id.toString();
  stopSourceSchedule(sourceId);

  if (!source.enabled || !source.schedule || !cron.validate(source.schedule)) {
    return;
  }

  const task = cron.schedule(source.schedule, async () => {
    try {
      await scrapeSource(source);
      console.log(`Scheduled scrape completed for ${source.name}`);
    } catch (error) {
      console.error(`Scheduled scrape failed for ${source.name}:`, error.message);
    }
  });

  tasks.set(sourceId, task);
}

async function startScheduler() {
  const sources = await Source.find({ enabled: true }).lean();
  sources.forEach(scheduleSource);
  console.log(`Scheduler started for ${sources.length} enabled source(s)`);
}

function stopAllSchedules() {
  tasks.forEach((task) => task.stop());
  tasks.clear();
}

module.exports = {
  scheduleSource,
  stopSourceSchedule,
  startScheduler,
  stopAllSchedules,
};
