const express = require('express');
const controller = require('./auth.controller');
const { authenticate } = require('../../middlewares/auth');
const { requireReportFiling } = require('../../middlewares/requireRole');
const {
  loginLimiter,
  registerLimiter,
  forgotLimiter,
  resetLimiter,
} = require('../../middlewares/rateLimit');
const { requireCaptcha } = require('../../middlewares/requireCaptcha');

const router = express.Router();

// Public self-signup is disabled — all accounts are invite-only via POST /users.
// Kept as an explicit 403 (instead of deleting the route) so old clients get
// a clear message rather than a 404.
router.post('/register', registerLimiter, (req, res) => {
  res.status(403).json({
    error: 'Public signup is disabled. Please ask an exec member, HoD or expert to invite you.',
  });
});
router.post('/login', loginLimiter, requireCaptcha('login'), controller.login);
router.post('/logout', controller.logout);
router.post('/forgot-password', forgotLimiter, requireCaptcha('forgot'), controller.forgotPassword);
router.post('/reset-password', resetLimiter, requireCaptcha('reset'), controller.resetPassword);

router.get('/me', authenticate, controller.me);
router.patch('/me', authenticate, controller.updateMe);
router.post('/change-password', authenticate, controller.changePassword);

// Privileged invite: exec + hod + expert (matrix enforced in service).
router.post('/users', authenticate, requireReportFiling, controller.inviteUser);

module.exports = router;
