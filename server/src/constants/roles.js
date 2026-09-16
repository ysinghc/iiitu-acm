/**
 * Role & permission model for the IIITU ACM chapter platform.
 *
 * Hierarchy:
 *   Executive board  -> chair, vice_chair, secretary, treasurer (full control)
 *   HoD              -> hod (scoped to one department: engineering | research)
 *   Experts          -> expert (mentor, scoped to a department / interest group)
 *   Learners         -> scholar | fellow (assigned exactly one mentor)
 *   General          -> member (no mentor required)
 *
 * Departments: engineering | research  (HoDs exist per department)
 */

const ROLES = Object.freeze({
  CHAIR: 'chair',
  VICE_CHAIR: 'vice_chair',
  SECRETARY: 'secretary',
  TREASURER: 'treasurer',
  HOD: 'hod',
  EXPERT: 'expert',
  SCHOLAR: 'scholar',
  FELLOW: 'fellow',
  MEMBER: 'member',
});

const EXEC_ROLES = Object.freeze([ROLES.CHAIR, ROLES.VICE_CHAIR, ROLES.TREASURER, ROLES.SECRETARY]);

// Display order for the executive board: Chair → Vice Chair → Treasurer → Secretary.
const EXEC_RANK = Object.freeze({
  [ROLES.CHAIR]: 0,
  [ROLES.VICE_CHAIR]: 1,
  [ROLES.TREASURER]: 2,
  [ROLES.SECRETARY]: 3,
});

const LEARNER_ROLES = Object.freeze([ROLES.SCHOLAR, ROLES.FELLOW]);

const DEPARTMENTS = Object.freeze(['engineering', 'research']);

const SELF_SIGNUP_ROLES = Object.freeze([ROLES.MEMBER, ROLES.SCHOLAR, ROLES.FELLOW]);

const isExec = (role) => EXEC_ROLES.includes(role);
const isLearner = (role) => LEARNER_ROLES.includes(role);

module.exports = {
  ROLES,
  EXEC_ROLES,
  EXEC_RANK,
  LEARNER_ROLES,
  DEPARTMENTS,
  SELF_SIGNUP_ROLES,
  isExec,
  isLearner,
};
