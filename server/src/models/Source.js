const mongoose = require('mongoose');

const extractionFieldSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    selector: { type: String, trim: true, default: '' },
    path: { type: String, trim: true, default: '' },
    attribute: { type: String, default: 'text' },
  },
  { _id: false }
);

const sourceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, unique: true, trim: true },
    category: {
      type: String,
      enum: ['placement', 'government-job', 'news'],
      default: 'placement',
    },
    schedule: { type: String, default: '' },
    enabled: { type: Boolean, default: false },
    extractionRules: {
      mode: { type: String, enum: ['css', 'jsonld', 'rss', 'api'], default: 'css' },
      jsonLdType: { type: String, trim: true, default: '' },
      collectionPath: { type: String, trim: true, default: '' },
      itemSelector: { type: String, trim: true, default: '' },
      fields: {
        type: [extractionFieldSchema],
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Source', sourceSchema);