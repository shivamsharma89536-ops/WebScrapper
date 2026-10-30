const mongoose = require('mongoose');

const runSchema = new mongoose.Schema(
  {
    source: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Source',
      required: true,
    },
    status: {
      type: String,
      enum: ['success', 'failed'],
      required: true,
    },
    found: { type: Number, default: 0 },
    newItems: { type: Number, default: 0 },
    error: { type: String, default: '' },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Run', runSchema);
