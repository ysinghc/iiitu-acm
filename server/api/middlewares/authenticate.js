/**
 * Legacy admin-auth upgraded for the chapter identity model.
 *
 * Accepts BOTH:
 *  1. New chapter JWTs  { sub: userId, role }  -> attaches req.user + req.auth
 *  2. Legacy admin JWTs { adminId }             -> attaches req.auth { role: 'chair', legacy: true }
 *
 * Response shapes are unchanged so old clients keep working.
 * Pair with ./roles guards to enforce RBAC on legacy admin endpoints.
 */
const jwt = require('jsonwebtoken');

const LEGACY_SECRET = process.env.JWT_SECRET || 'super_secret_acm_key_123';
const CHAPTER_SECRET = process.env.JWT_SECRET || 'super_secret_acm_key_123';

function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];

  // 1. New chapter token (checked first; lazily requires the User model so
  //    serverless bundling and route loading never break on import).
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'change-me-in-production');
    if (decoded && decoded.sub) {
      const User = require('../../src/models/user.model');
      User.findById(decoded.sub)
        .then((user) => {
          if (!user || !user.isActive) {
            return res.status(401).json({ message: 'Invalid or expired token' });
          }
          req.user = user;
          req.auth = { userId: String(user._id), role: user.role, legacy: false };
          next();
        })
        .catch(() => res.status(401).json({ message: 'Invalid or expired token' }));
      return;
    }
  } catch {
    // not a chapter token — try legacy below
  }

  // 2. Legacy single-admin token.
  try {
    const decoded = jwt.verify(token, LEGACY_SECRET || CHAPTER_SECRET);
    if (decoded && decoded.adminId) {
      req.adminId = decoded.adminId;
      req.auth = { userId: `legacy:${decoded.adminId}`, role: 'chair', legacy: true };
      req.user = null;
      return next();
    }
    return res.status(401).json({ message: 'Invalid or expired token' });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = authenticateAdmin;
