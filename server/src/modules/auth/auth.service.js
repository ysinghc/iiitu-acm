/**
 * Auth domain: registration, login, profile, privileged user creation.
 * All policy decisions live here; controllers only translate HTTP.
 */
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { ApiError } = require('../../utils/http');
const { ROLES, SELF_SIGNUP_ROLES, isExec, isLearner } = require('../../constants/roles');
const User = require('../../models/user.model');
const { signToken } = require('../../middlewares/auth');
const { notify } = require('../../services/notifications');
const { Templates } = require('../../services/mailer');
const { resolveUser } = require('../../services/lookup');
const { isValidDepartment } = require('../../services/departments');

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

async function register({ name, email, password, role = ROLES.MEMBER, batch = '', department = '' }) {
  if (!name || !email || !password) throw ApiError.badRequest('Name, email and password are required');
  if (!SELF_SIGNUP_ROLES.includes(role)) throw ApiError.badRequest('Invalid signup role');
  if (isLearner(role)) {
    if (!department) throw ApiError.badRequest('Scholars and fellows must choose a department');
    if (!await isValidDepartment(department)) throw ApiError.badRequest('Unknown department');
  } else if (department && !await isValidDepartment(department)) {
    throw ApiError.badRequest('Unknown department');
  }
  if (String(password).length < 8) throw ApiError.badRequest('Password must be at least 8 characters');

  const emailNorm = normalizeEmail(email);
  const exists = await User.findOne({ email: emailNorm });
  if (exists) throw ApiError.conflict('An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name: name.trim(),
    email: emailNorm,
    passwordHash,
    role,
    batch,
    department: department || '',
  });
  return { token: signToken(user), user: user.toSafeJSON() };
}

async function login({ email, password }) {
  if (!email || !password) throw ApiError.badRequest('Email and password are required');
  const user = await User.findOne({ email: normalizeEmail(email) }).select('+passwordHash');
  if (!user || !user.isActive) throw ApiError.unauthorized('Invalid email or password');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized('Invalid email or password');
  user.passwordHash = undefined;
  return { token: signToken(user), user: user.toSafeJSON() };
}

/** Privileged creation (invite). Returns the user + temp password when generated. */
async function createUser(actor, data) {
  const { name, email, password, role = ROLES.MEMBER, department = '', interestGroup = null, mentor = null, batch = '' } = data;
  if (!name || !email || !role) throw ApiError.badRequest('Name, email and role are required');
  if (!Object.values(ROLES).includes(role)) throw ApiError.badRequest('Invalid role');

  // --- authorization matrix ---
  const actorRole = actor.role;
  if (isExec(actorRole)) {
    // full control
  } else if (actorRole === ROLES.HOD) {
    if (isExec(role) || role === ROLES.HOD) throw ApiError.forbidden('HoDs cannot create exec or HoD accounts');
    if (department !== actor.department) throw ApiError.forbidden('HoDs can only add members of their own department');
  } else if (actorRole === ROLES.EXPERT) {
    if (![ROLES.SCHOLAR, ROLES.FELLOW, ROLES.MEMBER].includes(role)) {
      throw ApiError.forbidden('Experts can only add scholars, fellows or members');
    }
    if (department !== actor.department) throw ApiError.forbidden('Experts can only add members of their own department');
  } else {
    throw ApiError.forbidden();
  }

  if ((role === ROLES.HOD || role === ROLES.EXPERT || isLearner(role)) && !department) {
    throw ApiError.badRequest('This role requires a department');
  }
  if (department && !await isValidDepartment(department)) {
    throw ApiError.badRequest('Unknown department');
  }
  if (isLearner(role) && mentor) {
    const m = await resolveUser(mentor);
    if (!m || m.role !== ROLES.EXPERT || !m.isActive) throw ApiError.badRequest('Mentor must be an active expert');
    if (department && m.department !== department) throw ApiError.badRequest('Mentor must belong to the same department');
    mentor = m._id;
  }

  const emailNorm = normalizeEmail(email);
  if (await User.findOne({ email: emailNorm })) throw ApiError.conflict('An account with this email already exists');

  const tempPassword = password && String(password).length >= 8
    ? String(password)
    : crypto.randomBytes(5).toString('hex');
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  const user = await User.create({
    name: name.trim(),
    email: emailNorm,
    passwordHash,
    role,
    department: department || '',
    interestGroup: interestGroup || null,
    mentor: mentor || null,
    batch: batch || '',
  });

  await notify({
    to: { users: [user] },
    type: 'invite',
    title: 'Welcome to IIITU ACM',
    body: `Your ${role} account was created by ${actor.name}.`,
    email: {
      subject: 'Your IIITU ACM account',
      html: Templates.invite(user.name, user.email, tempPassword),
    },
  });

  return { user: user.toSafeJSON(), tempPassword: password ? undefined : tempPassword };
}

async function updateOwnProfile(userId, patch) {
  const allowed = ['name', 'avatarUrl', 'bio', 'github', 'linkedin', 'batch'];
  const update = {};
  for (const key of allowed) {
    if (patch[key] !== undefined) update[key] = patch[key];
  }
  if (update.name !== undefined && !String(update.name).trim()) {
    throw ApiError.badRequest('Name cannot be empty');
  }
  const user = await User.findByIdAndUpdate(userId, update, { new: true, runValidators: true });
  if (!user) throw ApiError.notFound('User not found');
  return user.toSafeJSON();
}

async function changePassword(userId, { currentPassword, newPassword }) {
  if (!newPassword || String(newPassword).length < 8) {
    throw ApiError.badRequest('New password must be at least 8 characters');
  }
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw ApiError.notFound('User not found');
  const ok = await bcrypt.compare(currentPassword || '', user.passwordHash);
  if (!ok) throw ApiError.unauthorized('Current password is incorrect');
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.tokenVersion = (user.tokenVersion || 0) + 1; // kill all other sessions
  await user.save();
  return { ok: true };
}

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * Forgot-password step 1. Always resolves { ok: true } so callers cannot
 * enumerate registered emails. The reset link carries a single-use token;
 * only its SHA-256 hash is stored.
 */
async function requestPasswordReset(email) {
  const emailNorm = normalizeEmail(email);
  const user = await User.findOne({ email: emailNorm });
  if (user && user.isActive) {
    const token = crypto.randomBytes(32).toString('hex');
    user.passwordReset = {
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    };
    await user.save();
    const link = `${require('../../config/env').clientUrl}/reset-password?token=${token}`;
    await notify({
      to: { users: [user] },
      type: 'password_reset',
      title: 'Reset your IIITU ACM password',
      body: 'A password reset was requested. The link expires in 1 hour.',
      link,
      email: {
        subject: 'Reset your IIITU ACM password',
        html: Templates.passwordReset(user.name, link),
      },
    });
  }
  return { ok: true };
}

/** Forgot-password step 2: exchange a valid token for a new password. */
async function resetPassword(token, newPassword) {
  if (!token) throw ApiError.badRequest('Reset token is required');
  if (!newPassword || String(newPassword).length < 8) {
    throw ApiError.badRequest('New password must be at least 8 characters');
  }
  const user = await User.findOne({
    'passwordReset.tokenHash': hashToken(token),
    'passwordReset.expiresAt': { $gt: new Date() },
  }).select('+passwordHash');
  if (!user || !user.isActive) throw ApiError.badRequest('Reset link is invalid or expired');
  user.passwordHash = await bcrypt.hash(String(newPassword), 10);
  user.passwordReset = { tokenHash: '', expiresAt: null };
  user.tokenVersion = (user.tokenVersion || 0) + 1; // stolen sessions die with the reset
  await user.save();
  return { ok: true };
}

module.exports = { register, login, createUser, updateOwnProfile, changePassword, normalizeEmail, requestPasswordReset, resetPassword };
