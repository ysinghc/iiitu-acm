const mongoose = require('mongoose');
const InterestGroup = require('../models/interestGroup.model');
const { resolveUser } = require('../../src/services/lookup');

// Public lead profile fields (login accounts, never roster strings).
const IGL_SELECT = 'name role department avatarUrl github linkedin userId';

// IGL must be an active expert account — leads are logically connected,
// never free-text names.
async function resolveLead(igl) {
  if (!igl) return null;
  const lead = await resolveUser(igl);
  if (!lead || !lead.isActive) throw new Error('Lead must be an existing account');
  if (lead.role !== 'expert') throw new Error('Lead must be an expert account');
  return lead._id;
}

const InterestGroupController = {
  // GET /api/public/interest-groups
  getAll: async (req, res) => {
    try {
      const groups = await InterestGroup.find()
        .populate('department', 'slug name')
        .populate('igl', IGL_SELECT)
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
        .populate('igl', IGL_SELECT)
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
        .populate('igl', IGL_SELECT);
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
      const leadId = await resolveLead(igl);
      const group = await InterestGroup.create({ department, igl: leadId, name, description, areaOfInterest, order: order || 0 });
      const populated = await group.populate([
        { path: 'department', select: 'slug name' },
        { path: 'igl', select: IGL_SELECT }
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
      const update = { department, name, description, areaOfInterest, order: order ?? 0 };
      if (igl !== undefined) update.igl = await resolveLead(igl);
      const group = await InterestGroup.findByIdAndUpdate(
        req.params.id,
        update,
        { returnDocument: 'after', runValidators: true }
      ).populate([
        { path: 'department', select: 'slug name' },
        { path: 'igl', select: IGL_SELECT }
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
      res.json({ message: 'Interest group deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = InterestGroupController;
