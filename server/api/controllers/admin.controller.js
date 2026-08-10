const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/admin.model');
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_acm_key_123';

const AdminController = {
  login: async (req, res) => {
    const { username, password } = req.body;
    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
      return res.status(400).json({ message: 'Invalid username or password format' });
    }
    try {
      const admin = await Admin.findOne({ username: username.trim() });
      if (!admin) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }

      const isValid = await bcrypt.compare(password, admin.password);
      if (!isValid) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }

      const token = jwt.sign({ adminId: admin._id }, JWT_SECRET, { expiresIn: '2h' });
      res.json({ token, username: admin.username });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  checkAuth: (req, res) => {
    res.json({ authenticated: true });
  }
};

module.exports = AdminController;
