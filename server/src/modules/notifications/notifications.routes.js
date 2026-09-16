const express = require('express');
const controller = require('./notifications.controller');
const { authenticate } = require('../../middlewares/auth');

const router = express.Router();

router.get('/', authenticate, controller.list);
router.post('/read-all', authenticate, controller.markAllRead);
router.patch('/:id/read', authenticate, controller.markRead);

module.exports = router;
