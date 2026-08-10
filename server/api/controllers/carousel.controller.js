const mongoose = require('mongoose');
const CarouselSlide = require('../models/carousel.model');

const CarouselController = {
  getAllSlides: async (req, res) => {
    try {
      const slides = await CarouselSlide.find().sort({ order: 1 });
      res.json(slides);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  createSlide: async (req, res) => {
    const { imageUrl, title, description, order } = req.body;
    try {
      const slide = await CarouselSlide.create({ imageUrl, title, description, order });
      res.status(201).json(slide);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  updateSlide: async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid slide ID format' });
    }
    const { imageUrl, title, description, order } = req.body;
    try {
      const slide = await CarouselSlide.findByIdAndUpdate(
        req.params.id,
        { imageUrl, title, description, order },
        { new: true, runValidators: true }
      );
      if (!slide) return res.status(404).json({ message: 'Slide not found' });
      res.json(slide);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  deleteSlide: async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid slide ID format' });
    }
    try {
      const slide = await CarouselSlide.findByIdAndDelete(req.params.id);
      if (!slide) return res.status(404).json({ message: 'Slide not found' });
      res.json({ message: 'Slide deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = CarouselController;
