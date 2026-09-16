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

router.post('/register', registerLimiter, requireCaptcha('register'), controller.register);
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
