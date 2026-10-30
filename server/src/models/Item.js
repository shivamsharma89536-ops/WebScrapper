const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
    source: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Source',
      required: true,
    },
    data: {
      type: Map,
      of: String,
      required: true,
    },
    hash: {
      type: String,
      required: true,
    },
    scrapedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

itemSchema.index({ source: 1, hash: 1 }, { unique: true });

module.exports = mongoose.model('Item', itemSchema);
