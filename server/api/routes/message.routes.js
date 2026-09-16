const express = require('express');
const MessageController = require('../controllers/message.controller');
const authenticateAdmin = require('../middlewares/authenticate');
const { requireManageContent } = require('../middlewares/roles');
const router = express.Router();

router.get('/api/public/messages', MessageController.getAllMessages);
router.put('/api/admin/messages/:role', authenticateAdmin, requireManageContent, MessageController.updateMessage);

module.exports = router;
