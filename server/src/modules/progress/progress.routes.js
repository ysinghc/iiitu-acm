const express = require('express');
const controller = require('./progress.controller');
const { authenticate } = require('../../middlewares/auth');

const router = express.Router();

// Monthly KPI reports: mentor -> student signature -> HoD
router.get('/reports', authenticate, controller.listReports);
router.post('/reports', authenticate, controller.createReport);
router.get('/reports/:id', authenticate, controller.getReport);
router.patch('/reports/:id', authenticate, controller.updateReport);
router.post('/reports/:id/submit', authenticate, controller.submitReport);
router.post('/reports/:id/sign', authenticate, controller.signReport);
router.post('/reports/:id/decision', authenticate, controller.decideReport);

// Month-end accomplishment summaries: student -> mentor -> HoD
router.get('/summaries', authenticate, controller.listSummaries);
router.post('/summaries', authenticate, controller.createSummary);
router.get('/summaries/:id', authenticate, controller.getSummary);
router.patch('/summaries/:id', authenticate, controller.updateSummary);
router.post('/summaries/:id/advance', authenticate, controller.advanceSummary);
router.post('/summaries/:id/decision', authenticate, controller.decideSummary);

module.exports = router;
