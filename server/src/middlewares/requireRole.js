/**
 * Role-based access control.
 *
 * `requireRole('chair', 'hod')` — user must hold one of the listed roles.
 * `requireScope(...)` helpers encode the chapter's permission matrix:
 *
 *   manageUsers    exec only
 *   manageContent  exec + hod            (carousel, messages, team, roster, departments)
 *   manageVerticals exec + hod + expert  (interest groups, memberships)
 *   reviewEvents   exec + hod
 *   reviewReports  exec + hod (+ experts can file for their mentees)
 *   upload         any signed-in user
 */
const { ApiError } = require('../utils/http');
const { ROLES, EXEC_ROLES } = require('../constants/roles');

const roleOf = (req) => (req.auth && req.auth.role) || (req.user && req.user.role);

const requireRole = (...allowed) => (req, res, next) => {
  const role = roleOf(req);
  if (!role) return next(ApiError.unauthorized());
  if (!allowed.includes(role)) return next(ApiError.forbidden());
  return next();
};

const requireExec = requireRole(...EXEC_ROLES);
const requireManageContent = requireRole(...EXEC_ROLES, ROLES.HOD);
const requireManageVerticals = requireRole(...EXEC_ROLES, ROLES.HOD, ROLES.EXPERT);
const requireReviewEvents = requireRole(...EXEC_ROLES, ROLES.HOD);
const requireReviewReports = requireRole(...EXEC_ROLES, ROLES.HOD);
// Experts file/forward reports for their own mentees; exec + hod can act chapter-wide.
const requireReportFiling = requireRole(...EXEC_ROLES, ROLES.HOD, ROLES.EXPERT);

module.exports = {
  requireRole,
  requireExec,
  requireManageContent,
  requireManageVerticals,
  requireReviewEvents,
  requireReviewReports,
  requireReportFiling,
};
