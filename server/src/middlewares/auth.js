/**
 * Authentication.
 *
 * - `authenticate` validates the new chapter JWT ({ sub, role }) and loads
 *   the active User onto req.user.
 * - `authenticateCompat` additionally accepts legacy single-admin tokens
 *   ({ adminId }), exposed as a synthetic exec user, so old dashboard
 *   sessions keep working during migration.
 */
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { ApiError, asyncHandler } = require('../utils/http');
const User = require('../models/user.model');

const LEGACY_SECRET = process.env.JWT_SECRET || 'super_secret_acm_key_123';

function readBearer(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice(7);
}

const loadUserOr401 = async (id) => {
  const user = await User.findById(id);
  if (!user || !user.isActive) throw ApiError.unauthorized('Account is inactive or missing');
  return user;
};

const authenticate = asyncHandler(async (req, res, next) => {
  const token = readBearer(req);
  if (!token) throw ApiError.unauthorized('No token provided');
  let decoded;
  try {
    decoded = jwt.verify(token, env.jwtSecret);
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }
  if (!decoded.sub) throw ApiError.unauthorized('Invalid token payload');
  req.user = await loadUserOr401(decoded.sub);
  req.auth = { userId: String(req.user._id), role: req.user.role, legacy: false };
  next();
});

/** Accepts new chapter tokens AND legacy admin tokens (as chair). */
const authenticateCompat = asyncHandler(async (req, res, next) => {
  const token = readBearer(req);
  if (!token) throw ApiError.unauthorized('No token provided');

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (decoded.sub) {
      req.user = await loadUserOr401(decoded.sub);
      req.auth = { userId: String(req.user._id), role: req.user.role, legacy: false };
      return next();
    }
  } catch {
    // fall through to legacy check
  }

  try {
    const legacy = jwt.verify(token, LEGACY_SECRET);
    if (legacy.adminId) {
      req.auth = { userId: `legacy:${legacy.adminId}`, role: 'chair', legacy: true };
      req.user = null;
      return next();
    }
  } catch {
    // fall through
  }
  throw ApiError.unauthorized('Invalid or expired token');
});

const signToken = (user) =>
  jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

module.exports = { authenticate, authenticateCompat, signToken };
