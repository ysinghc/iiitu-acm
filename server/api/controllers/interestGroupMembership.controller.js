const mongoose = require('mongoose');
const InterestGroupMembership = require('../models/interestGroupMembership.model');

const MembershipController = {
  // GET /api/public/interest-groups/:igId/members
  getMembersOfGroup: async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.igId)) {
      return res.status(400).json({ error: 'Invalid interest group ID format' });
    }
    try {
      const memberships = await InterestGroupMembership.find({ interestGroup: req.params.igId })
        .populate('member', 'name email batch role imageUrl')
        .sort({ joinedAt: 1 });
      res.json(memberships.map(m => m.member).filter(Boolean));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // POST /api/admin/interest-groups/:igId/members  { memberId }
  addMember: async (req, res) => {
    const { memberId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(req.params.igId) || !mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ error: 'Invalid group or member ID format' });
    }
    try {
      const membership = await InterestGroupMembership.create({
        interestGroup: req.params.igId,
        member: memberId,
      });
      const populated = await membership.populate('member', 'name email batch role imageUrl');
      res.status(201).json(populated);
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ error: 'Member already in this interest group' });
      }
      res.status(400).json({ error: err.message });
    }
  },

  // DELETE /api/admin/interest-groups/:igId/members/:memberId
  removeMember: async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.igId) || !mongoose.Types.ObjectId.isValid(req.params.memberId)) {
      return res.status(400).json({ error: 'Invalid group or member ID format' });
    }
    try {
      const result = await InterestGroupMembership.findOneAndDelete({
        interestGroup: req.params.igId,
        member: req.params.memberId,
      });
      if (!result) return res.status(404).json({ message: 'Membership not found' });
      res.json({ message: 'Member removed from interest group' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // GET /api/public/members/:memberId/interest-groups  (for member profile use)
  getGroupsOfMember: async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.memberId)) {
      return res.status(400).json({ error: 'Invalid member ID format' });
    }
    try {
      const memberships = await InterestGroupMembership.find({ member: req.params.memberId })
        .populate({ path: 'interestGroup', populate: { path: 'department', select: 'slug name' } });
      res.json(memberships.map(m => m.interestGroup).filter(Boolean));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = MembershipController;
