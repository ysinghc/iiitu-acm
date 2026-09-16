/**
 * Resolve a user reference given EITHER a Mongo ObjectId OR a readable
 * member ID (ACM-2026-0007, case-insensitive). Returns the User doc or null.
 * This is what lets the whole UI run on readable IDs.
 */
const mongoose = require('mongoose');
const User = require('../models/user.model');
const { normalizeUid } = require('./ids');

async function resolveUser(value, { includePassword = false } = {}) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  let query;
  if (/^[0-9a-fA-F]{24}$/.test(raw)) {
    if (!mongoose.Types.ObjectId.isValid(raw)) return null;
    query = User.findById(raw);
  } else {
    query = User.findOne({ userId: normalizeUid(raw) });
  }
  if (includePassword) query = query.select('+passwordHash');
  return query;
}

module.exports = { resolveUser };
