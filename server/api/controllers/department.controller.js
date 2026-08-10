const mongoose = require('mongoose');
const Department = require('../models/department.model');
const InterestGroup = require('../models/interestGroup.model');

const DepartmentController = {
  // GET /api/public/departments
  getAll: async (req, res) => {
    try {
      const departments = await Department.find().sort({ slug: 1 });
      res.json(departments);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // GET /api/public/departments/:slug
  getBySlug: async (req, res) => {
    try {
      const department = await Department.findOne({ slug: req.params.slug });
      if (!department) return res.status(404).json({ message: 'Department not found' });

      // Fetch interest groups for this department, populating IGL TeamMember
      const interestGroups = await InterestGroup.find({ department: department._id })
        .populate('igl', 'name role imageUrl github linkedin research')
        .sort({ order: 1, name: 1 });

      res.json({ department, interestGroups });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // POST /api/admin/departments
  create: async (req, res) => {
    const { slug, name, description, bannerImageUrl, mission } = req.body;
    try {
      const department = await Department.create({ slug, name, description, bannerImageUrl, mission });
      res.status(201).json(department);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  // PUT /api/admin/departments/:id
  update: async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid department ID format' });
    }
    const { slug, name, description, bannerImageUrl, mission } = req.body;
    try {
      const department = await Department.findByIdAndUpdate(
        req.params.id,
        { slug, name, description, bannerImageUrl, mission },
        { returnDocument: 'after', runValidators: true }
      );
      if (!department) return res.status(404).json({ message: 'Department not found' });
      res.json(department);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  // DELETE /api/admin/departments/:id
  delete: async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid department ID format' });
    }
    try {
      const department = await Department.findByIdAndDelete(req.params.id);
      if (!department) return res.status(404).json({ message: 'Department not found' });
      res.json({ message: 'Department deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = DepartmentController;
