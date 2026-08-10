const mongoose = require('mongoose');
const Member = require('../models/member.model');

const MemberController = {
  getAllMembers: async (req, res) => {
    try {
      const members = await Member.find();
      res.json(members);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  createMember: async (req, res) => {
    const { name, role, email, batch, imageUrl } = req.body;
    try {
      const member = await Member.create({ name, role, email, batch, imageUrl });
      res.status(201).json(member);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  updateMember: async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid member ID format' });
    }
    const { name, role, email, batch, imageUrl } = req.body;
    try {
      const member = await Member.findByIdAndUpdate(
        req.params.id,
        { name, role, email, batch, imageUrl },
        { new: true, runValidators: true }
      );
      if (!member) return res.status(404).json({ message: 'Member not found' });
      res.json(member);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  deleteMember: async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid member ID format' });
    }
    try {
      const member = await Member.findByIdAndDelete(req.params.id);
      if (!member) return res.status(404).json({ message: 'Member not found' });
      res.json({ message: 'Member deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = MemberController;
