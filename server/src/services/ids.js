/**
 * Human-readable IDs. Every account gets one automatically (ACM-2026-0007),
 * assigned by an atomic counter so concurrent signups can never collide.
 * Shown across the UI and accepted anywhere an ID is expected.
 */
const Counter = require('../models/counter.model');

async function nextSequence(key) {
  const doc = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  ).lean();
  return doc.seq;
}

async function generateUserId() {
  const year = new Date().getFullYear();
  const n = await nextSequence('user');
  return `ACM-${year}-${String(n).padStart(4, '0')}`;
}

const normalizeUid = (value) => String(value || '').trim().toUpperCase();

module.exports = { nextSequence, generateUserId, normalizeUid };
