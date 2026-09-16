const express = require('express');
const DepartmentController = require('../controllers/department.controller');
const authenticateAdmin = require('../middlewares/authenticate');
const { requireManageContent, requireManageVerticals } = require('../middlewares/roles');
const router = express.Router();

// Public (public departments only — private ones stay off the site)
router.get('/api/public/departments', DepartmentController.getAll);
router.get('/api/public/departments/:slug', DepartmentController.getBySlug);

// Admin (sees everything, including private placement departments)
router.get('/api/admin/departments/all', authenticateAdmin, requireManageVerticals, DepartmentController.getAllAdmin);

// Admin
router.post('/api/admin/departments', authenticateAdmin, requireManageContent, DepartmentController.create);
router.put('/api/admin/departments/:id', authenticateAdmin, requireManageContent, DepartmentController.update);
router.delete('/api/admin/departments/:id', authenticateAdmin, requireManageContent, DepartmentController.delete);

module.exports = router;
