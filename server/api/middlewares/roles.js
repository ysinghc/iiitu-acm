/**
 * RBAC guards for legacy admin routes. Single re-export so the permission
 * matrix lives in exactly one place (src/middlewares/requireRole).
 */
module.exports = require('../../src/middlewares/requireRole');
