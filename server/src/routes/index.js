const express = require('express');
const authRoutes = require('../modules/auth/auth.routes');
const usersRoutes = require('../modules/users/users.routes');
const eventsRoutes = require('../modules/events/events.routes');
const progressRoutes = require('../modules/progress/progress.routes');
const notificationsRoutes = require('../modules/notifications/notifications.routes');

const router = express.Router();

router.get('/health', (req, res) => res.json({ ok: true, version: 'v1' }));
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/events', eventsRoutes);
router.use('/progress', progressRoutes);
router.use('/notifications', notificationsRoutes);

module.exports = router;
