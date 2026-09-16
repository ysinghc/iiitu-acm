const { asyncHandler } = require('../../utils/http');
const service = require('./events.service');

const listPublic = asyncHandler(async (req, res) => {
  res.json(await service.listPublic(req.query));
});

const getPublic = asyncHandler(async (req, res) => {
  res.json(await service.getPublic(req.params.id));
});

const queue = asyncHandler(async (req, res) => {
  res.json(await service.listQueue(req.user));
});

const mine = asyncHandler(async (req, res) => {
  res.json(await service.myProposals(req.user));
});

const propose = asyncHandler(async (req, res) => {
  const event = await service.propose(req.user, req.body);
  res.status(201).json(event);
});

const edit = asyncHandler(async (req, res) => {
  res.json(await service.editDraft(req.user, req.params.id, req.body));
});

const transition = asyncHandler(async (req, res) => {
  const { to, note } = req.body;
  res.json(await service.transition(req.user, req.params.id, to, note));
});

const remove = asyncHandler(async (req, res) => {
  res.json(await service.remove(req.user, req.params.id));
});

module.exports = { listPublic, getPublic, queue, mine, propose, edit, transition, remove };
