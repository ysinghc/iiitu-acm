const mongoose = require('mongoose');
const InterestGroup = require('../models/interestGroup.model');
const InterestGroupMembership = require('../models/interestGroupMembership.model');

const InterestGroupController = {
  // GET /api/public/interest-groups
  getAll: async (req, res) => {
    try {
      const groups = await InterestGroup.find()
        .populate('department', 'slug name')
        .populate('igl', 'name role imageUrl github linkedin research')
        .sort({ order: 1, name: 1 });
      res.json(groups);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // GET /api/public/interest-groups/by-department/:departmentId
  getByDepartment: async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.departmentId)) {
      return res.status(400).json({ error: 'Invalid department ID format' });
    }
    try {
      const groups = await InterestGroup.find({ department: req.params.departmentId })
        .populate('igl', 'name role imageUrl github linkedin research')
        .sort({ order: 1, name: 1 });
      res.json(groups);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // GET /api/public/interest-groups/:id
  getById: async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid interest group ID format' });
    }
    try {
      const group = await InterestGroup.findById(req.params.id)
        .populate('department', 'slug name')
        .populate('igl', 'name role imageUrl github linkedin research');
      if (!group) return res.status(404).json({ message: 'Interest group not found' });
      res.json(group);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // POST /api/admin/interest-groups
  create: async (req, res) => {
    const { department, igl, name, description, areaOfInterest, order } = req.body;
    try {
      const group = await InterestGroup.create({ department, igl: igl || null, name, description, areaOfInterest, order: order || 0 });
      const populated = await group.populate([
        { path: 'department', select: 'slug name' },
        { path: 'igl', select: 'name role imageUrl github linkedin research' }
      ]);
      res.status(201).json(populated);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  // PUT /api/admin/interest-groups/:id
  update: async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid interest group ID format' });
    }
    const { department, igl, name, description, areaOfInterest, order } = req.body;
    try {
      const group = await InterestGroup.findByIdAndUpdate(
        req.params.id,
        { department, igl: igl || null, name, description, areaOfInterest, order: order ?? 0 },
        { returnDocument: 'after', runValidators: true }
      ).populate([
        { path: 'department', select: 'slug name' },
        { path: 'igl', select: 'name role imageUrl github linkedin research' }
      ]);
      if (!group) return res.status(404).json({ message: 'Interest group not found' });
      res.json(group);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  // DELETE /api/admin/interest-groups/:id
  delete: async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid interest group ID format' });
    }
    try {
      const group = await InterestGroup.findByIdAndDelete(req.params.id);
      if (!group) return res.status(404).json({ message: 'Interest group not found' });
      // Also remove memberships for this group
      await InterestGroupMembership.deleteMany({ interestGroup: req.params.id });
      res.json({ message: 'Interest group deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = InterestGroupController;
