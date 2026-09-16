/**
 * User directory & administration.
 * Visibility: exec sees all; hod sees own department (+ everyone for experts? no —
 * hod sees own department); expert sees own department members + own mentees;
 * learners/members see a basic directory (name, role, department, avatar).
 */
const { ApiError } = require('../../utils/http');
const { ROLES, EXEC_ROLES, EXEC_RANK, isExec, isLearner } = require('../../constants/roles');
const User = require('../../models/user.model');
const { resolveUser } = require('../../services/lookup');
const { isValidDepartment } = require('../../services/departments');

// Public fields only — never emails, never hashes. Used by the Teams and
// Members pages, so every person shown is a login account with a position.
const DIRECTORY_SELECT = 'name role department batch avatarUrl bio github linkedin userId interestGroup';

/**
 * Public chapter directory, grouped for display. Single source of truth:
 * exec board, HoDs and experts (Teams page) plus scholars/fellows/members
 * (Members page) — all login accounts, no separate roster.
 */
async function getDirectory() {
  const InterestGroup = require('../../../api/models/interestGroup.model');
  const [people, groups] = await Promise.all([
    User.find({ isActive: true })
      .select(DIRECTORY_SELECT)
      .populate('interestGroup', 'name slug')
      .lean(),
    InterestGroup.find({}).select('name igl').lean(),
  ]);
  const leadOf = new Map(); // userId -> group name they lead
  groups.forEach((g) => {
    if (g.igl) leadOf.set(String(g.igl), g.name);
  });
  const withLead = (p) => ({ ...p, leads: leadOf.get(String(p._id)) || null });
  const byName = (a, b) => a.name.localeCompare(b.name);
  const byDeptName = (a, b) =>
    (a.department || '').localeCompare(b.department || '') || byName(a, b);

  return {
    exec: people.filter((p) => EXEC_ROLES.includes(p.role))
      .sort((a, b) => (EXEC_RANK[a.role] ?? 9) - (EXEC_RANK[b.role] ?? 9))
      .map(withLead),
    hod: people.filter((p) => p.role === ROLES.HOD).sort(byDeptName).map(withLead),
    experts: people.filter((p) => p.role === ROLES.EXPERT).sort(byDeptName).map(withLead),
    members: people.filter((p) => ['member', 'scholar', 'fellow'].includes(p.role)).sort(byName),
  };
}

const PUBLIC_FIELDS = 'name role department batch avatarUrl bio interestGroup';

function scopeFilter(actor) {
  if (isExec(actor.role)) return {};
  if (actor.role === ROLES.HOD || actor.role === ROLES.EXPERT) {
    return { department: actor.department };
  }
  return { isActive: true };
}

async function listUsers(actor, { q = '', role = '', department = '', page = 1, limit = 20 }) {
  const filter = scopeFilter(actor);
  if (role) filter.role = role;
  // Exec may narrow to any department; others are already scoped.
  if (department && isExec(actor.role)) filter.department = department;
  if (q) {
    const rx = new RegExp(q.trim(), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { userId: rx }];
  }
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const [items, total] = await Promise.all([
    User.find(filter)
      .populate('mentor', 'name email role userId')
      .populate('interestGroup', 'name')
      .sort({ role: 1, name: 1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    User.countDocuments(filter),
  ]);
  const safe = items.map((u) => {
    delete u.passwordHash;
    return u;
  });
  return { items: safe, total, page: pageNum, limit: limitNum };
}

async function getUser(actor, id) {
  const resolved = await resolveUser(id);
  if (!resolved) throw ApiError.notFound('User not found');
  await resolved.populate('mentor', 'name email role department userId');
  const user = resolved.toObject();
  delete user.passwordHash;
  const scope = scopeFilter(actor);
  if (scope.department && user.department !== scope.department && String(user._id) !== String(actor._id)) {
    throw ApiError.forbidden('Outside your department scope');
  }
  // Basic directory view for plain members/learners hides emails of others.
  if (!isExec(actor.role) && ![ROLES.HOD, ROLES.EXPERT].includes(actor.role) && String(user._id) !== String(actor._id)) {
    delete user.email;
  }
  return user;
}

/**
 * Update rules:
 * - self: handled by auth.updateOwnProfile (no role/department/mentor changes)
 * - exec: anything (except demoting the last chair — guarded below)
 * - hod: profile fields + mentor assignment within own department
 * - expert: mentor assignment for learners within own department only
 */
async function adminUpdate(actor, id, patch) {
  const target = await resolveUser(id);
  if (!target) throw ApiError.notFound('User not found');

  const actorRole = actor.role;
  const privilegedFields = ['role', 'department', 'interestGroup', 'mentor', 'isActive', 'batch'];
  const profileFields = ['name', 'avatarUrl', 'bio', 'github', 'linkedin', 'batch'];
  const mentorFields = ['mentor'];

  let allowed;
  if (isExec(actorRole)) {
    allowed = [...profileFields, ...privilegedFields];
    if (target.role === ROLES.CHAIR && patch.role && patch.role !== ROLES.CHAIR) {
      const chairs = await User.countDocuments({ role: ROLES.CHAIR, isActive: true });
      if (chairs <= 1) throw ApiError.badRequest('Cannot demote the last active chair');
    }
  } else if (actorRole === ROLES.HOD) {
    if (target.department !== actor.department) throw ApiError.forbidden('Outside your department scope');
    if (patch.role && (isExec(patch.role) || patch.role === ROLES.HOD)) {
      throw ApiError.forbidden('HoDs cannot grant exec or HoD roles');
    }
    allowed = [...profileFields, 'interestGroup', 'mentor', 'isActive', 'batch'];
    if (patch.department && patch.department !== actor.department) {
      throw ApiError.forbidden('HoDs cannot move members out of their department');
    }
  } else if (actorRole === ROLES.EXPERT) {
    if (!isLearner(target.role)) throw ApiError.forbidden('Experts can only manage scholars and fellows');
    if (target.department !== actor.department) throw ApiError.forbidden('Outside your department scope');
    allowed = mentorFields;
  } else {
    throw ApiError.forbidden();
  }

  const update = {};
  for (const key of allowed) {
    if (patch[key] !== undefined) update[key] = patch[key];
  }
  if (update.department !== undefined && update.department && !await isValidDepartment(update.department)) {
    throw ApiError.badRequest('Unknown department');
  }
  if (update.mentor) {
    const m = await resolveUser(update.mentor);
    if (!m || m.role !== ROLES.EXPERT || !m.isActive) throw ApiError.badRequest('Mentor must be an active expert');
    const dept = update.department || target.department;
    if (dept && m.department !== dept) throw ApiError.badRequest('Mentor must belong to the same department');
    update.mentor = m._id;
  }
  if (update.role && !Object.values(ROLES).includes(update.role)) {
    throw ApiError.badRequest('Invalid role');
  }

  Object.assign(target, update);
  await target.save();
  return target.toSafeJSON();
}

async function deactivate(actor, id) {
  if (!isExec(actor.role)) throw ApiError.forbidden('Only the executive board can deactivate accounts');
  const target = await resolveUser(id);
  if (!target) throw ApiError.notFound('User not found');
  if (String(target._id) === String(actor._id)) throw ApiError.badRequest('You cannot deactivate your own account');
  if (target.role === ROLES.CHAIR) {
    const chairs = await User.countDocuments({ role: ROLES.CHAIR, isActive: true });
    if (chairs <= 1) throw ApiError.badRequest('Cannot deactivate the last active chair');
  }
  target.isActive = false;
  await target.save();
  return target.toSafeJSON();
}

/** Mentees visible to the caller: expert -> own; hod -> dept learners; exec -> all learners. */
async function myMentees(actor) {
  if (actor.role === ROLES.EXPERT) {
    return User.find({ mentor: actor._id, isActive: true }).sort({ name: 1 }).lean();
  }
  if (actor.role === ROLES.HOD) {
    return User.find({ department: actor.department, role: { $in: ['scholar', 'fellow'] }, isActive: true })
      .populate('mentor', 'name email userId')
      .sort({ name: 1 })
      .lean();
  }
  if (isExec(actor.role)) {
    return User.find({ role: { $in: ['scholar', 'fellow'] }, isActive: true })
      .populate('mentor', 'name email userId')
      .sort({ department: 1, name: 1 })
      .lean();
  }
  if (isLearner(actor.role)) {
    const me = await User.findById(actor._id).populate('mentor', 'name email department userId').lean();
    return me && me.mentor ? [me.mentor] : [];
  }
  throw ApiError.forbidden('No mentees for this role');
}

module.exports = { listUsers, getUser, adminUpdate, deactivate, myMentees, getDirectory };
