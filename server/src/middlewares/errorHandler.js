/**
 * Central error handling. Legacy routes keep their own inline shapes;
 * everything under /api/v1 flows through here as { error: { message, details } }.
 */
const { ApiError } = require('../utils/http');

const notFound = (req, res) => {
  res.status(404).json({ error: { message: `Not found: ${req.method} ${req.path}` } });
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: { message: err.message, details: err.details } });
  }
  if (err && err.name === 'ValidationError') {
    return res.status(400).json({ error: { message: 'Validation failed', details: err.message } });
  }
  if (err && err.code === 11000) {
    return res.status(409).json({ error: { message: 'Duplicate value', details: err.keyValue } });
  }
  console.error('[api-error]', err);
  return res.status(500).json({ error: { message: 'Internal server error' } });
};

module.exports = { notFound, errorHandler };
