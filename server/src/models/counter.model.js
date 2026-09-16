/**
 * Atomic counters for human-readable IDs (Mongo has no sequences).
 * findOneAndUpdate with $inc is atomic even across serverless instances.
 */
const mongoose = require('mongoose');

const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. 'user'
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.models.Counter || mongoose.model('Counter', CounterSchema);
module.exports = Counter;
