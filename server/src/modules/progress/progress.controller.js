const { asyncHandler } = require('../../utils/http');
const service = require('./progress.service');

// Monthly reports
const createReport = asyncHandler(async (req, res) => {
  res.status(201).json(await service.createReport(req.user, req.body));
});
const updateReport = asyncHandler(async (req, res) => {
  res.json(await service.updateReport(req.user, req.params.id, req.body));
});
const submitReport = asyncHandler(async (req, res) => {
  res.json(await service.submitReportToStudent(req.user, req.params.id));
});
const signReport = asyncHandler(async (req, res) => {
  res.json(await service.signReport(req.user, req.params.id, req.body));
});
const decideReport = asyncHandler(async (req, res) => {
  res.json(await service.decideReport(req.user, req.params.id, req.body));
});
const listReports = asyncHandler(async (req, res) => {
  res.json(await service.listReports(req.user, req.query));
});
const getReport = asyncHandler(async (req, res) => {
  res.json(await service.getReport(req.user, req.params.id));
});

// Month-end summaries
const createSummary = asyncHandler(async (req, res) => {
  res.status(201).json(await service.createSummary(req.user, req.body));
});
const updateSummary = asyncHandler(async (req, res) => {
  res.json(await service.updateSummary(req.user, req.params.id, req.body));
});
const advanceSummary = asyncHandler(async (req, res) => {
  res.json(await service.submitSummary(req.user, req.params.id, req.body?.mentorNote));
});
const decideSummary = asyncHandler(async (req, res) => {
  res.json(await service.decideSummary(req.user, req.params.id, req.body));
});
const listSummaries = asyncHandler(async (req, res) => {
  res.json(await service.listSummaries(req.user, req.query));
});
const getSummary = asyncHandler(async (req, res) => {
  res.json(await service.getSummary(req.user, req.params.id));
});

module.exports = {
  createReport,
  updateReport,
  submitReport,
  signReport,
  decideReport,
  listReports,
  getReport,
  createSummary,
  updateSummary,
  advanceSummary,
  decideSummary,
  listSummaries,
  getSummary,
};
