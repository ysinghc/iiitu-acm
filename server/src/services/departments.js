/**
 * Departments are data, not constants. The Department collection is the
 * source of truth; this service exposes its slugs for validation and UI
 * dropdowns (60s in-memory cache — departments change rarely).
 * Falls back to the seed slugs on fresh installs.
 */
const Department = require('../../api/models/department.model');
const { DEPARTMENTS } = require('../constants/roles');

const TTL_MS = 60 * 1000;
let cache = { at: 0, slugs: [] };

async function getDepartmentSlugs() {
  if (Date.now() - cache.at < TTL_MS && cache.slugs.length > 0) return cache.slugs;
  try {
    const docs = await Department.find({}).select('slug name').lean();
    const slugs = docs.map((d) => d.slug).filter(Boolean);
    if (slugs.length > 0) {
      cache = { at: Date.now(), slugs };
      return slugs;
    }
  } catch {
    // DB hiccup — fall through to seed list
  }
  return [...DEPARTMENTS];
}

/** Full records for dropdowns: [{ slug, name }]. */
async function getDepartments() {
  try {
    const docs = await Department.find({}).select('slug name').sort({ slug: 1 }).lean();
    if (docs.length > 0) return docs;
  } catch {
    // fall through
  }
  return DEPARTMENTS.map((slug) => ({ slug, name: slug }));
}

/** Empty string means "no department" and is always allowed. */
async function isValidDepartment(slug) {
  if (!slug) return true;
  return (await getDepartmentSlugs()).includes(slug);
}

module.exports = { getDepartmentSlugs, getDepartments, isValidDepartment };
