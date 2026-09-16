/**
 * Scholar/fellow progress tracking.
 *
 * Monthly report pipeline (mentor files Week 1–4 KPIs):
 *   draft -> pending_student -> pending_hod -> approved
 * Month-end summary pipeline (student files accomplishments):
 *   draft -> pending_mentor -> pending_hod -> approved
 * Either side can bounce back with changes_requested, or reject with a note.
 * Exec board has read access to everything; all transitions notify + email.
 */
const { ApiError } = require('../../utils/http');
const { isMonthKey } = require('../../utils/format');
const { ROLES, isExec, isLearner } = require('../../constants/roles');
const { REVIEW_WORKFLOW } = require('../../constants/workflows');
const User = require('../../models/user.model');
const MonthlyReport = require('../../models/monthlyReport.model');
const MonthSummary = require('../../models/monthSummary.model');
const { notify, execPlusHods } = require('../../services/notifications');
const { Templates } = require('../../services/mailer');
const { resolveUser } = require('../../services/lookup');
const env = require('../../config/env');

const R = REVIEW_WORKFLOW;
const dashLink = `${env.clientUrl}/dashboard?tab=progress`;

/* ------------------------------ helpers ------------------------------ */

async function mustBeLearner(studentId) {
  const student = await resolveUser(studentId);
  if (!student) throw ApiError.notFound('Student not found');
  if (!student.isActive) throw ApiError.notFound('Student not found');
  if (!isLearner(student.role)) throw ApiError.badRequest('Progress forms apply to scholars and fellows only');
  return student;
}

/** Who may file/edit on the mentor side for this student? */
function canFileFor(actor, student) {
  if (isExec(actor.role)) return true;
  if (actor.role === ROLES.HOD && actor.department === student.department) return true;
  if (actor.role === ROLES.EXPERT && String(student.mentor) === String(actor._id)) return true;
  return false;
}

function pushHistory(doc, from, to, by, note = '') {
  doc.history.push({ from, to, by, note });
}

function setStatus(doc, to, by, note = '') {
  pushHistory(doc, doc.status, to, by, note);
  doc.status = to;
}

/* --------------------------- monthly reports -------------------------- */

async function createReport(actor, { studentId, month, weeks, overallRemarks = '' }) {
  if (!studentId || !month) throw ApiError.badRequest('studentId and month (YYYY-MM) are required');
  if (!isMonthKey(month)) throw ApiError.badRequest('month must be YYYY-MM');
  const student = await mustBeLearner(studentId);
  if (!canFileFor(actor, student)) throw ApiError.forbidden('Only the assigned mentor (or HoD/exec) can file this report');
  if (weeks && (!Array.isArray(weeks) || weeks.length !== 4)) {
    throw ApiError.badRequest('weeks must be an array of exactly 4 entries');
  }
  try {
    const report = await MonthlyReport.create({
      student: student._id,
      mentor: actor.role === ROLES.EXPERT ? actor._id : student.mentor || null,
      department: student.department,
      month,
      weeks: weeks || undefined,
      overallRemarks,
    });
    return report.toObject();
  } catch (err) {
    if (err.code === 11000) throw ApiError.conflict(`A report for ${month} already exists for this student`);
    throw err;
  }
}

async function updateReport(actor, id, { weeks, overallRemarks }) {
  const report = await MonthlyReport.findById(id);
  if (!report) throw ApiError.notFound('Report not found');
  const student = await mustBeLearner(report.student);
  if (!canFileFor(actor, student)) throw ApiError.forbidden();
  if (![R.DRAFT, R.CHANGES_REQUESTED].includes(report.status)) {
    throw ApiError.badRequest(`Report is ${report.status} and no longer editable by the mentor`);
  }
  if (weeks) {
    if (!Array.isArray(weeks) || weeks.length !== 4) throw ApiError.badRequest('weeks must have exactly 4 entries');
    report.weeks = weeks;
  }
  if (overallRemarks !== undefined) report.overallRemarks = overallRemarks;
  if (actor.role === ROLES.EXPERT) report.mentor = actor._id;
  await report.save();
  return report.toObject();
}

async function submitReportToStudent(actor, id) {
  const report = await MonthlyReport.findById(id).populate('student', 'name email');
  if (!report) throw ApiError.notFound('Report not found');
  const student = await mustBeLearner(report.student._id || report.student);
  if (!canFileFor(actor, student)) throw ApiError.forbidden();
  if (![R.DRAFT, R.CHANGES_REQUESTED].includes(report.status)) {
    throw ApiError.badRequest(`Cannot submit a report in ${report.status} state`);
  }
  const complete = report.weeks.every((w) => w.goals && String(w.goals).trim() && w.kpiScore !== null && w.kpiScore !== undefined);
  if (!complete) throw ApiError.badRequest('All four weeks need goals and a KPI score before submitting');
  setStatus(report, R.PENDING_STUDENT, actor._id);
  await report.save();
  await notify({
    to: { users: [report.student._id || report.student] },
    type: 'report_signature',
    title: `Sign your ${report.month} progress report`,
    body: `${actor.name} filed KPIs for all four weeks.`,
    link: dashLink,
    email: {
      subject: `[ACM] Sign your ${report.month} progress report`,
      html: Templates.reportNeedsSignature(report.student.name, report.month, actor.name),
    },
  });
  return report.toObject();
}

async function signReport(actor, id, { name }) {
  const report = await MonthlyReport.findById(id);
  if (!report) throw ApiError.notFound('Report not found');
  if (String(report.student) !== String(actor._id)) throw ApiError.forbidden('Only the student can sign this report');
  if (report.status !== R.PENDING_STUDENT) throw ApiError.badRequest(`Report is ${report.status}, nothing to sign`);
  report.studentSignature = { name: name || actor.name, signedAt: new Date() };
  setStatus(report, R.PENDING_HOD, actor._id, 'Signed by student');
  await report.save();
  await notify({
    to: { roles: [ROLES.HOD], department: report.department },
    type: 'report_review',
    title: `Report signed — review needed (${report.month})`,
    body: `${actor.name} signed the ${report.month} report.`,
    link: dashLink,
    email: {
      subject: `[ACM] Report signed — review needed (${report.month})`,
      html: Templates.reportNeedsReview(actor.name, report.month),
    },
  });
  // Exec visibility (inbox only, no email storm).
  await notify({
    to: { roles: [...require('../../constants/roles').EXEC_ROLES] },
    type: 'report_review',
    title: `Report signed (${report.month})`,
    body: `${actor.name} signed; with the HoD for review.`,
    link: dashLink,
  });
  return report.toObject();
}

async function decideReport(actor, id, { decision, note = '' }) {
  const report = await MonthlyReport.findById(id).populate('student', 'name email');
  if (!report) throw ApiError.notFound('Report not found');
  const hodScoped = actor.role === ROLES.HOD && actor.department === report.department;
  if (!isExec(actor.role) && !hodScoped) throw ApiError.forbidden('Only the department HoD (or exec) can decide');
  if (report.status !== R.PENDING_HOD) throw ApiError.badRequest(`Report is ${report.status}, not awaiting HoD review`);
  if (!['approved', 'changes_requested', 'rejected'].includes(decision)) {
    throw ApiError.badRequest('decision must be approved | changes_requested | rejected');
  }
  if (decision !== 'approved' && !note) throw ApiError.badRequest('A note is required unless approving');
  report.hodReview = { by: actor._id, decision, note, decidedAt: new Date() };
  setStatus(report, R[decision.toUpperCase()], actor._id, note);
  await report.save();
  const recipients = { users: [report.student._id || report.student] };
  if (report.mentor) recipients.users.push(report.mentor);
  await notify({
    to: recipients,
    type: 'report_decision',
    title: `${report.month} report ${decision.replace('_', ' ')}`,
    body: note || `Decided by ${actor.name}.`,
    link: dashLink,
    email: {
      subject: `[ACM] ${report.month} report ${decision}`,
      html: Templates.reviewDecided('Monthly report', report.month, decision, note),
    },
  });
  return report.toObject();
}

async function listReports(actor, { month = '', status = '', studentId = '' }) {
  const filter = {};
  if (month) {
    if (!isMonthKey(month)) throw ApiError.badRequest('month must be YYYY-MM');
    filter.month = month;
  }
  if (status) filter.status = status;
  if (isExec(actor.role)) {
    if (studentId) filter.student = studentId;
  } else if (actor.role === ROLES.HOD) {
    filter.department = actor.department;
    if (studentId) filter.student = studentId;
  } else if (actor.role === ROLES.EXPERT) {
    const mine = await User.find({ mentor: actor._id }).select('_id').lean();
    filter.student = { $in: mine.map((m) => m._id) };
    if (studentId) {
      if (!mine.some((m) => String(m._id) === String(studentId))) throw ApiError.forbidden();
      filter.student = studentId;
    }
  } else if (isLearner(actor.role)) {
    filter.student = actor._id;
  } else {
    throw ApiError.forbidden('Progress reports are visible to participants, HoDs and exec only');
  }
  const items = await MonthlyReport.find(filter)
    .populate('student', 'name email role department batch userId')
    .populate('mentor', 'name email userId')
    .sort({ month: -1, updatedAt: -1 })
    .lean();
  return { items };
}

async function getReport(actor, id) {
  const report = await MonthlyReport.findById(id)
    .populate('student', 'name email role department batch mentor')
    .populate('mentor', 'name email')
    .lean();
  if (!report) throw ApiError.notFound('Report not found');
  const sid = String(report.student._id || report.student);
  const ok =
    isExec(actor.role) ||
    (actor.role === ROLES.HOD && actor.department === report.department) ||
    (actor.role === ROLES.EXPERT && String(report.mentor?._id || report.mentor) === String(actor._id)) ||
    sid === String(actor._id);
  if (!ok) throw ApiError.forbidden();
  return report;
}

/* --------------------------- month summaries -------------------------- */

async function createSummary(actor, { studentId, month, accomplishments = [], metrics = {}, challenges = '', nextGoals = '' }) {
  if (!month) throw ApiError.badRequest('month (YYYY-MM) is required');
  if (!isMonthKey(month)) throw ApiError.badRequest('month must be YYYY-MM');
  let student;
  if (studentId && String(studentId) !== String(actor._id)) {
    student = await mustBeLearner(studentId);
    if (!canFileFor(actor, student) && !isExec(actor.role)) throw ApiError.forbidden();
  } else {
    if (!isLearner(actor.role) && !isExec(actor.role) && ![ROLES.HOD, ROLES.EXPERT].includes(actor.role)) {
      throw ApiError.forbidden();
    }
    student = isLearner(actor.role) ? actor : await mustBeLearner(studentId);
  }
  try {
    const summary = await MonthSummary.create({
      student: student._id,
      mentor: student.mentor || null,
      department: student.department,
      month,
      accomplishments: Array.isArray(accomplishments) ? accomplishments.filter(Boolean) : [],
      metrics,
      challenges,
      nextGoals,
    });
    return summary.toObject();
  } catch (err) {
    if (err.code === 11000) throw ApiError.conflict(`A summary for ${month} already exists for this student`);
    throw err;
  }
}

async function updateSummary(actor, id, patch) {
  const summary = await MonthSummary.findById(id);
  if (!summary) throw ApiError.notFound('Summary not found');
  const isStudent = String(summary.student) === String(actor._id);
  const student = await mustBeLearner(summary.student);
  const filer = canFileFor(actor, student);
  if (!isStudent && !filer) throw ApiError.forbidden();
  if (![R.DRAFT, R.CHANGES_REQUESTED].includes(summary.status)) {
    throw ApiError.badRequest(`Summary is ${summary.status} and no longer editable`);
  }
  for (const key of ['accomplishments', 'metrics', 'challenges', 'nextGoals']) {
    if (patch[key] !== undefined) summary[key] = patch[key];
  }
  if (filer && patch.mentorNote !== undefined) summary.mentorNote = patch.mentorNote;
  await summary.save();
  return summary.toObject();
}

async function submitSummary(actor, id, mentorNote = '') {
  const summary = await MonthSummary.findById(id).populate('student', 'name email');
  if (!summary) throw ApiError.notFound('Summary not found');
  const isStudent = String(summary.student._id || summary.student) === String(actor._id);
  const student = await mustBeLearner(summary.student._id || summary.student);

  if (summary.status === R.DRAFT || summary.status === R.CHANGES_REQUESTED) {
    // Student (or filer) sends to mentor.
    if (!isStudent && !canFileFor(actor, student)) throw ApiError.forbidden();
    if (!summary.accomplishments.length) throw ApiError.badRequest('Add at least one accomplishment first');
    setStatus(summary, R.PENDING_MENTOR, actor._id);
    await summary.save();
    if (student.mentor) {
      const mentor = await User.findById(student.mentor).lean();
      await notify({
        to: { users: [student.mentor] },
        type: 'summary_mentor',
        title: `Month-end summary needs your note (${summary.month})`,
        body: `${student.name} filed accomplishments for ${summary.month}.`,
        link: dashLink,
        email: mentor
          ? { subject: `[ACM] Summary needs your note (${summary.month})`, html: Templates.summaryNeedsMentor(student.name, summary.month) }
          : null,
      });
    }
    return summary.toObject();
  }

  if (summary.status === R.PENDING_MENTOR) {
    // Mentor adds note and forwards to HoD.
    if (!canFileFor(actor, student)) throw ApiError.forbidden();
    summary.mentorNote = mentorNote || summary.mentorNote;
    setStatus(summary, R.PENDING_HOD, actor._id, 'Forwarded by mentor');
    await summary.save();
    await notify({
      to: { roles: [ROLES.HOD], department: summary.department },
      type: 'summary_review',
      title: `Month-end summary for review (${summary.month})`,
      body: `${student.name} — forwarded by ${actor.name}.`,
      link: dashLink,
      email: {
        subject: `[ACM] Month-end summary for review (${summary.month})`,
        html: Templates.reportNeedsReview(student.name, summary.month),
      },
    });
    return summary.toObject();
  }

  throw ApiError.badRequest(`Cannot advance a summary in ${summary.status} state`);
}

async function decideSummary(actor, id, { decision, note = '' }) {
  const summary = await MonthSummary.findById(id).populate('student', 'name email');
  if (!summary) throw ApiError.notFound('Summary not found');
  const hodScoped = actor.role === ROLES.HOD && actor.department === summary.department;
  if (!isExec(actor.role) && !hodScoped) throw ApiError.forbidden('Only the department HoD (or exec) can decide');
  if (summary.status !== R.PENDING_HOD) throw ApiError.badRequest(`Summary is ${summary.status}, not awaiting HoD review`);
  if (!['approved', 'changes_requested', 'rejected'].includes(decision)) {
    throw ApiError.badRequest('decision must be approved | changes_requested | rejected');
  }
  if (decision !== 'approved' && !note) throw ApiError.badRequest('A note is required unless approving');
  summary.hodReview = { by: actor._id, decision, note, decidedAt: new Date() };
  setStatus(summary, R[decision.toUpperCase()], actor._id, note);
  await summary.save();
  const student = summary.student;
  const recipients = { users: [student._id || student] };
  if (summary.mentor) recipients.users.push(summary.mentor);
  await notify({
    to: recipients,
    type: 'summary_decision',
    title: `${summary.month} summary ${decision.replace('_', ' ')}`,
    body: note || `Decided by ${actor.name}.`,
    link: dashLink,
    email: {
      subject: `[ACM] ${summary.month} summary ${decision}`,
      html: Templates.reviewDecided('Month-end summary', summary.month, decision, note),
    },
  });
  return summary.toObject();
}

async function listSummaries(actor, { month = '', status = '', studentId = '' }) {
  const filter = {};
  if (month) {
    if (!isMonthKey(month)) throw ApiError.badRequest('month must be YYYY-MM');
    filter.month = month;
  }
  if (status) filter.status = status;
  if (isExec(actor.role)) {
    if (studentId) filter.student = studentId;
  } else if (actor.role === ROLES.HOD) {
    filter.department = actor.department;
    if (studentId) filter.student = studentId;
  } else if (actor.role === ROLES.EXPERT) {
    const mine = await User.find({ mentor: actor._id }).select('_id').lean();
    filter.student = { $in: mine.map((m) => m._id) };
    if (studentId) {
      if (!mine.some((m) => String(m._id) === String(studentId))) throw ApiError.forbidden();
      filter.student = studentId;
    }
  } else if (isLearner(actor.role)) {
    filter.student = actor._id;
  } else {
    throw ApiError.forbidden('Summaries are visible to participants, HoDs and exec only');
  }
  const items = await MonthSummary.find(filter)
    .populate('student', 'name email role department batch userId')
    .populate('mentor', 'name email userId')
    .sort({ month: -1, updatedAt: -1 })
    .lean();
  return { items };
}

async function getSummary(actor, id) {
  const summary = await MonthSummary.findById(id)
    .populate('student', 'name email role department batch mentor')
    .populate('mentor', 'name email')
    .lean();
  if (!summary) throw ApiError.notFound('Summary not found');
  const sid = String(summary.student._id || summary.student);
  const ok =
    isExec(actor.role) ||
    (actor.role === ROLES.HOD && actor.department === summary.department) ||
    (actor.role === ROLES.EXPERT && String(summary.mentor?._id || summary.mentor) === String(actor._id)) ||
    sid === String(actor._id);
  if (!ok) throw ApiError.forbidden();
  return summary;
}

module.exports = {
  createReport,
  updateReport,
  submitReportToStudent,
  signReport,
  decideReport,
  listReports,
  getReport,
  createSummary,
  updateSummary,
  submitSummary,
  decideSummary,
  listSummaries,
  getSummary,
};
