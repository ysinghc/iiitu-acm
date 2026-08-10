const mongoose = require('mongoose');
const TeamMember = require('../models/team.model');

const TeamController = {
  getAllTeamMembers: async (req, res) => {
    try {
      const team = await TeamMember.find();
      res.json(team);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  createTeamMember: async (req, res) => {
    const { name, role, imageUrl, github, linkedin, research } = req.body;
    try {
      const teamMember = await TeamMember.create({ name, role, imageUrl, github, linkedin, research });
      res.status(201).json(teamMember);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  updateTeamMember: async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid team member ID format' });
    }
    const { name, role, imageUrl, github, linkedin, research } = req.body;
    try {
      const teamMember = await TeamMember.findByIdAndUpdate(
        req.params.id,
        { name, role, imageUrl, github, linkedin, research },
        { new: true, runValidators: true }
      );
      if (!teamMember) return res.status(404).json({ message: 'Team member not found' });
      res.json(teamMember);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  deleteTeamMember: async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid team member ID format' });
    }
    try {
      const teamMember = await TeamMember.findByIdAndDelete(req.params.id);
      if (!teamMember) return res.status(404).json({ message: 'Team member not found' });
      res.json({ message: 'Team member deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = TeamController;
