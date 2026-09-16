const express = require('express');
const CarouselController = require('../controllers/carousel.controller');
const authenticateAdmin = require('../middlewares/authenticate');
const { requireManageContent } = require('../middlewares/roles');
const router = express.Router();

router.get('/api/public/carousel', CarouselController.getAllSlides);
router.post('/api/admin/carousel', authenticateAdmin, requireManageContent, CarouselController.createSlide);
router.put('/api/admin/carousel/:id', authenticateAdmin, requireManageContent, CarouselController.updateSlide);
router.delete('/api/admin/carousel/:id', authenticateAdmin, requireManageContent, CarouselController.deleteSlide);

module.exports = router;
