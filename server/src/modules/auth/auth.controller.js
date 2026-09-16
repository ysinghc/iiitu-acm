const { asyncHandler } = require('../../utils/http');
const { COOKIE_NAME } = require('../../middlewares/auth');
const env = require('../../config/env');
const service = require('./auth.service');

const cookieOpts = () => {
  const m = /^(\d+)([smhd])$/.exec(env.jwtExpiresIn || '8h') || ['8h', '8', 'h'];
  const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[m[2]] || 3600000;
  return {
    httpOnly: true, // JS can't read it — XSS can't steal sessions
    secure: process.env.NODE_ENV === 'production', // https-only in prod
    sameSite: 'lax', // sent on same-site navigations + API calls, never cross-site
    maxAge: Number(m[1]) * mult,
    path: '/',
  };
};

const setAuthCookie = (res, token) => res.cookie(COOKIE_NAME, token, cookieOpts());

const register = asyncHandler(async (req, res) => {
  const result = await service.register(req.body);
  setAuthCookie(res, result.token);
  res.status(201).json(result);
});

const login = asyncHandler(async (req, res) => {
  const result = await service.login(req.body);
  setAuthCookie(res, result.token);
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

const logout = asyncHandler(async (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

const forgotPassword = asyncHandler(async (req, res) => {
  await service.requestPasswordReset(req.body?.email);
  res.json({ ok: true, message: 'If an account exists for this email, a reset link was sent.' });
});

const resetPassword = asyncHandler(async (req, res) => {
  await service.resetPassword(req.body?.token, req.body?.newPassword);
  res.json({ ok: true, message: 'Password has been reset. Please sign in.' });
});

module.exports = { register, login, me, updateMe, changePassword, inviteUser, forgotPassword, resetPassword, logout };
