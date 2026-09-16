const { asyncHandler } = require('../../utils/http');
const service = require('./auth.service');

const register = asyncHandler(async (req, res) => {
  const result = await service.register(req.body);
  res.status(201).json(result);
});

const login = asyncHandler(async (req, res) => {
  const result = await service.login(req.body);
  res.json(result);
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

const updateMe = asyncHandler(async (req, res) => {
  const user = await service.updateOwnProfile(req.user._id, req.body);
  res.json({ user });
});

const changePassword = asyncHandler(async (req, res) => {
  await service.changePassword(req.user._id, req.body);
  res.json({ message: 'Password changed successfully' });
});

const inviteUser = asyncHandler(async (req, res) => {
  const result = await service.createUser(req.user, req.body);
  res.status(201).json(result);
});

const forgotPassword = asyncHandler(async (req, res) => {
  await service.requestPasswordReset(req.body?.email);
  res.json({ ok: true, message: 'If an account exists for this email, a reset link was sent.' });
});

const resetPassword = asyncHandler(async (req, res) => {
  await service.resetPassword(req.body?.token, req.body?.newPassword);
  res.json({ ok: true, message: 'Password has been reset. Please sign in.' });
});

module.exports = { register, login, me, updateMe, changePassword, inviteUser, forgotPassword, resetPassword };
