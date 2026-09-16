const express = require('express');
const InterestGroupController = require('../controllers/interestGroup.controller');
const MembershipController = require('../controllers/interestGroupMembership.controller');
const authenticateAdmin = require('../middlewares/authenticate');
const { requireManageVerticals } = require('../middlewares/roles');
const router = express.Router();

// Public — Interest Groups
router.get('/api/public/interest-groups', InterestGroupController.getAll);
router.get('/api/public/interest-groups/by-department/:departmentId', InterestGroupController.getByDepartment);
router.get('/api/public/interest-groups/:id', InterestGroupController.getById);

// Public — Memberships
router.get('/api/public/interest-groups/:igId/members', MembershipController.getMembersOfGroup);
router.get('/api/public/members/:memberId/interest-groups', MembershipController.getGroupsOfMember);

// Admin — Interest Groups
router.post('/api/admin/interest-groups', authenticateAdmin, requireManageVerticals, InterestGroupController.create);
router.put('/api/admin/interest-groups/:id', authenticateAdmin, requireManageVerticals, InterestGroupController.update);
router.delete('/api/admin/interest-groups/:id', authenticateAdmin, requireManageVerticals, InterestGroupController.delete);

// NOTE: group membership is derived from User.interestGroup (login accounts).
// There is no separate roster to enroll into — assign the group on the person
// under Dashboard → People → Manage.

module.exports = router;
