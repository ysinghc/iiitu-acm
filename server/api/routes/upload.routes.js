const express = require('express');
const router = express.Router();
const authenticateAdmin = require('../middlewares/authenticate');
const { handleImageUpload } = require('../controllers/upload.controller');

// Admin protected route for image upload
router.post('/api/admin/upload', authenticateAdmin, handleImageUpload);

module.exports = router;
