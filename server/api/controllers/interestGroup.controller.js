const mongoose = require('mongoose');
const InterestGroup = require('../models/interestGroup.model');
const { resolveUser } = require('../../src/services/lookup');

// Public lead profile fields (login accounts, never roster strings).
const IGL_SELECT = 'name role department avatarUrl github linkedin userId';

// A lead is an expert, or the HoD of the group's own department — HoDs act
// as experts inside their verticals. Cross-department leads are rejected.
async function resolveLead(igl, departmentId) {
  if (!igl) return null;
  const lead = await resolveUser(igl);
  if (!lead || !lead.isActive) throw new Error('Lead must be an existing account');
  const okRole = lead.role === 'expert' || lead.role === 'hod';
  if (!okRole) throw new Error('Lead must be an expert or HoD account');
  if (departmentId) {
    const Department = require('../models/department.model');
    const dept = await Department.findById(departmentId).select('slug').lean();
    if (dept && lead.department && lead.department !== dept.slug) {
      throw new Error('Lead must belong to the same department as the group');
    }
  }
  return lead._id;
}

const InterestGroupController = {
  // GET /api/public/interest-groups — groups under private departments
  // are hidden, just like their department.
  getAll: async (req, res) => {
    try {
      const groups = await InterestGroup.find()
        .populate('department', 'slug name visibility')
        .populate('igl', IGL_SELECT)
        .sort({ order: 1, name: 1 });
      res.json(groups.filter((g) => !g.department || g.department.visibility !== 'private'));
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
      const Department = require('../models/department.model');
      const dept = await Department.findById(req.params.departmentId).select('visibility').lean();
      if (!dept || dept.visibility === 'private') return res.json([]);
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
        .populate('department', 'slug name visibility')
        .populate('igl', IGL_SELECT);
      if (!group || (group.department && group.department.visibility === 'private')) {
        return res.status(404).json({ message: 'Interest group not found' });
      }
      res.json(group);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // POST /api/admin/interest-groups
  create: async (req, res) => {
    const { department, igl, name, description, areaOfInterest, order } = req.body;
    try {
      const leadId = await resolveLead(igl, department);
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
      const existing = await InterestGroup.findById(req.params.id).select('department').lean();
      if (!existing) return res.status(404).json({ message: 'Interest group not found' });
      const update = { department, name, description, areaOfInterest, order: order ?? 0 };
      if (igl !== undefined) update.igl = await resolveLead(igl, department || existing.department);
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
