const express = require('express');
const EventController = require('../controllers/event.controller');
const authenticateAdmin = require('../middlewares/authenticate');
const { requireReviewEvents } = require('../middlewares/roles');
const router = express.Router();

// Public routes
router.get('/api/public/events', EventController.getAllEvents);
router.get('/api/public/events/:id', EventController.getEventById);

// Protected Admin routes (direct-write path for reviewers;
// members propose through the /api/v1/events approval workflow)
router.post('/api/admin/events', authenticateAdmin, requireReviewEvents, EventController.createEvent);
router.put('/api/admin/events/:id', authenticateAdmin, requireReviewEvents, EventController.updateEvent);
router.delete('/api/admin/events/:id', authenticateAdmin, requireReviewEvents, EventController.deleteEvent);

module.exports = router;
