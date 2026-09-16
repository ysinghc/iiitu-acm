const { asyncHandler } = require('../../utils/http');
const service = require('./users.service');

const directory = asyncHandler(async (req, res) => {
  res.json(await service.getDirectory());
});

const list = asyncHandler(async (req, res) => {
  const result = await service.listUsers(req.user, req.query);
  res.json(result);
});

const mentees = asyncHandler(async (req, res) => {
  const items = await service.myMentees(req.user);
  res.json({ items });
});

const get = asyncHandler(async (req, res) => {
  const user = await service.getUser(req.user, req.params.id);
  res.json(user);
});

const update = asyncHandler(async (req, res) => {
  const user = await service.adminUpdate(req.user, req.params.id, req.body);
  res.json({ user });
});

const remove = asyncHandler(async (req, res) => {
  const result = await service.deactivate(req.user, req.params.id);
  res.json({ ...result, message: 'Account permanently deleted' });
});

module.exports = { directory, list, mentees, get, update, remove };
