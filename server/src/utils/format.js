const slugify = (text = '') =>
  String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120);

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const isMonthKey = (value) => MONTH_RE.test(String(value || ''));

const isObjectId = (value) => /^[0-9a-fA-F]{24}$/.test(String(value || ''));

module.exports = { slugify, isMonthKey, isObjectId };
