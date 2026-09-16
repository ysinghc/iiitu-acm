const express = require('express');
const AdminController = require('../controllers/admin.controller');
const authenticateAdmin = require('../middlewares/authenticate');
const { loginLimiter } = require('../../src/middlewares/rateLimit');
const router = express.Router();

// Legacy single-admin login — per-account throttled like the v1 login.
router.post('/login', loginLimiter, AdminController.login);
router.get('/check-auth', authenticateAdmin, AdminController.checkAuth);

module.exports = router;
