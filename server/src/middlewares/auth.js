/**
 * Authentication.
 *
 * Token sources (in order): httpOnly `acm_token` cookie, then the
 * Authorization Bearer header (kept for older sessions and non-browser
 * API clients).
 *
 * - `authenticate` validates the chapter JWT ({ sub, role, tv }) and loads
 *   the active User onto req.user. `tv` must match the user's tokenVersion —
 *   password/role changes bump it and instantly revoke old tokens.
 * - `authenticateCompat` additionally accepts legacy single-admin tokens
 *   ({ adminId }), exposed as a synthetic exec user.
 */
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { ApiError, asyncHandler } = require('../utils/http');
const User = require('../models/user.model');

const LEGACY_SECRET = process.env.JWT_SECRET || 'super_secret_acm_key_123';
const COOKIE_NAME = 'acm_token';

function readToken(req) {
  if (req.cookies && req.cookies[COOKIE_NAME]) return req.cookies[COOKIE_NAME];
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

const loadUserOr401 = async (id) => {
  const user = await User.findById(id);
  if (!user || !user.isActive) throw ApiError.unauthorized('Account is inactive or missing');
  return user;
};

const checkVersion = (decoded, user) => {
  if ((decoded.tv ?? 0) !== (user.tokenVersion || 0)) {
    throw ApiError.unauthorized('Session revoked. Please sign in again.');
  }
};

const authenticate = asyncHandler(async (req, res, next) => {
  const token = readToken(req);
  if (!token) throw ApiError.unauthorized('No token provided');
  let decoded;
  try {
    decoded = jwt.verify(token, env.jwtSecret);
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }
  if (!decoded.sub) throw ApiError.unauthorized('Invalid token payload');
  req.user = await loadUserOr401(decoded.sub);
  checkVersion(decoded, req.user);
  req.auth = { userId: String(req.user._id), role: req.user.role, legacy: false };
  next();
});

/** Accepts new chapter tokens AND legacy admin tokens (as chair). */
const authenticateCompat = asyncHandler(async (req, res, next) => {
  const token = readToken(req);
  if (!token) throw ApiError.unauthorized('No token provided');

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (decoded.sub) {
      const user = await loadUserOr401(decoded.sub);
      checkVersion(decoded, user);
      req.user = user;
      req.auth = { userId: String(user._id), role: user.role, legacy: false };
      return next();
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
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
  jwt.sign(
    { sub: String(user._id), role: user.role, tv: user.tokenVersion || 0 },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );

module.exports = { authenticate, authenticateCompat, signToken, COOKIE_NAME };
