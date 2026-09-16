/**
 * Group membership, derived from login accounts — no separate roster.
 * A member belongs to a vertical via User.interestGroup, so this controller
 * is pure reads over the User collection.
 */
const mongoose = require('mongoose');
const User = require('../../src/models/user.model');
const InterestGroup = require('../models/interestGroup.model');
const { resolveUser } = require('../../src/services/lookup');

const PUBLIC_FIELDS = 'name role department batch avatarUrl bio userId interestGroup';

const MembershipController = {
  // GET /api/public/interest-groups/:igId/members
  getMembersOfGroup: async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.igId)) {
      return res.status(400).json({ error: 'Invalid interest group ID format' });
    }
    try {
      const members = await User.find({ interestGroup: req.params.igId, isActive: true })
        .select(PUBLIC_FIELDS)
        .populate('interestGroup', 'name')
        .sort({ name: 1 })
        .lean();
      res.json(members);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // GET /api/public/members/:memberId/interest-groups  (memberId = _id or ACM-… ID)
  getGroupsOfMember: async (req, res) => {
    try {
      const user = await resolveUser(req.params.memberId);
      if (!user || !user.isActive) return res.status(404).json({ message: 'Member not found' });
      await user.populate({ path: 'interestGroup', populate: { path: 'department', select: 'slug name' } });
      res.json(user.interestGroup ? [user.interestGroup] : []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = MembershipController;
