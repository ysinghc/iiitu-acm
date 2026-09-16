const express = require('express');
const controller = require('./users.controller');
const { authenticate } = require('../../middlewares/auth');

const router = express.Router();

// Public directory (Teams + Members pages). Must precede /:id.
router.get('/directory', controller.directory);

// Any signed-in member can browse the directory and see mentee context;
// scoping rules live in the service.
router.get('/', authenticate, controller.list);
router.get('/mentees/mine', authenticate, controller.mentees);
router.get('/:id', authenticate, controller.get);
router.patch('/:id', authenticate, controller.update);
router.delete('/:id', authenticate, controller.remove);

module.exports = router;
