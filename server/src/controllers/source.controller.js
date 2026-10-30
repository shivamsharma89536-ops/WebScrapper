const Source = require('../models/Source');
const { validateSourceInput } = require('../validators/source.validator');
const { previewSelector } = require('../services/selectorPreview.service');
const { scheduleSource, stopSourceSchedule } = require('../services/scheduler.service');

async function testSelector(req, res) {
  const validationError = validateSourceInput(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const preview = await previewSelector(req.body);
  return res.json(preview);
}

async function listSources(req, res) {
  const filter = {};
  if (req.query.category) {
    filter.category = req.query.category;
  }

  const sources = await Source.find(filter).sort({ createdAt: -1 }).lean();
  return res.json({ sources });
}

async function createSource(req, res) {
  const validationError = validateSourceInput(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const source = await Source.create(req.body);
  scheduleSource(source);
  return res.status(201).json({ source });
}

async function getSource(req, res) {
  const source = await Source.findById(req.params.id).lean();
  if (!source) {
    return res.status(404).json({ error: 'Source not found' });
  }

  return res.json({ source });
}

async function updateSource(req, res) {
  const validationError = validateSourceInput(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const source = await Source.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!source) {
    return res.status(404).json({ error: 'Source not found' });
  }

  scheduleSource(source);
  return res.json({ source });
}

async function deleteSource(req, res) {
  const source = await Source.findByIdAndDelete(req.params.id);
  if (!source) {
    return res.status(404).json({ error: 'Source not found' });
  }

  stopSourceSchedule(source._id);
  return res.json({ message: 'Source deleted' });
}

module.exports = {
  testSelector,
  listSources,
  createSource,
  getSource,
  updateSource,
  deleteSource,
};
