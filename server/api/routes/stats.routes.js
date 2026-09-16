const express = require('express');
const StatsController = require('../controllers/stats.controller');
const authenticateAdmin = require('../middlewares/authenticate');
const router = express.Router();

router.get('/api/admin/stats', authenticateAdmin, StatsController.getSystemOverview);
router.get('/api/admin/search', authenticateAdmin, StatsController.globalSearch);

module.exports = router;
