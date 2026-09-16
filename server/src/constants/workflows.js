/**
 * Workflow states.
 *
 * Events:    draft -> pending_review -> approved -> published -> completed
 *                                          \-> rejected        \-> cancelled
 *            (owner or exec can cancel a draft/pending event)
 *
 * Monthly reports / month summaries share one review pipeline:
 *   draft -> pending_student -> pending_hod -> approved
 *     \-> changes_requested (back to draft-like, editable by author)
 *     \-> rejected (terminal, with note)
 */

const EVENT_WORKFLOW = Object.freeze({
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
});

const REVIEW_WORKFLOW = Object.freeze({
  DRAFT: 'draft',
  PENDING_STUDENT: 'pending_student', // mentor filed KPIs, waiting for student signature
  PENDING_MENTOR: 'pending_mentor', // student filed summary, waiting for mentor note
  PENDING_HOD: 'pending_hod', // signed, waiting for HoD decision
  CHANGES_REQUESTED: 'changes_requested',
  APPROVED: 'approved',
  REJECTED: 'rejected',
});

module.exports = { EVENT_WORKFLOW, REVIEW_WORKFLOW };
