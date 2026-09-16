const express = require('express');
const router = express.Router();
const authenticateAdmin = require('../middlewares/authenticate');
const { uploadLimiter } = require('../../src/middlewares/rateLimit');
const { handleImageUpload } = require('../controllers/upload.controller');

// Any signed-in account may upload (chapter JWTs and legacy admin tokens);
// per-account throttled because uploads are expensive.
router.post('/api/admin/upload', authenticateAdmin, uploadLimiter, handleImageUpload);

module.exports = router;
