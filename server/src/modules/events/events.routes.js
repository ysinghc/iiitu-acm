const express = require('express');
const controller = require('./events.controller');
const { authenticate } = require('../../middlewares/auth');

const router = express.Router();

// Public showcase (published/completed only, legacy docs included).
router.get('/', controller.listPublic);
router.get('/:id', controller.getPublic);

// Authenticated workflows.
router.get('/manage/queue', authenticate, controller.queue);
router.get('/manage/mine', authenticate, controller.mine);
router.post('/', authenticate, controller.propose);
router.patch('/:id', authenticate, controller.edit);
router.post('/:id/transition', authenticate, controller.transition);
router.delete('/:id', authenticate, controller.remove);

module.exports = router;
