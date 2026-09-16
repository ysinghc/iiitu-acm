/**
 * Month-end accomplishment summary per learner per month.
 *
 * Pipeline: student files accomplishments (draft)
 *        -> submits to mentor (pending_mentor, mentor adds a note)
 *        -> mentor forwards to HoD (pending_hod)
 *        -> HoD approves / requests changes / rejects
 * Executive board can view all summaries.
 */
const mongoose = require('mongoose');
const { REVIEW_WORKFLOW } = require('../constants/workflows');

const MonthSummarySchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    department: { type: String, required: true },
    month: { type: String, required: true, match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'month must be YYYY-MM'] },
    accomplishments: { type: [String], default: [] },
    metrics: {
      eventsAttended: { type: Number, default: 0 },
      sessionsHosted: { type: Number, default: 0 },
      projectsShipped: { type: Number, default: 0 },
      papersSubmitted: { type: Number, default: 0 },
      learningHours: { type: Number, default: 0 },
    },
    challenges: { type: String, default: '' },
    nextGoals: { type: String, default: '' },
    mentorNote: { type: String, default: '' },
    status: {
      type: String,
      enum: Object.values(REVIEW_WORKFLOW),
      default: REVIEW_WORKFLOW.DRAFT,
    },
    hodReview: {
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      decision: { type: String, default: '' },
      note: { type: String, default: '' },
      decidedAt: { type: Date, default: null },
    },
    history: [
      {
        from: String,
        to: String,
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        note: { type: String, default: '' },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

MonthSummarySchema.index({ student: 1, month: 1 }, { unique: true });
MonthSummarySchema.index({ department: 1, month: 1 });
MonthSummarySchema.index({ status: 1 });

const MonthSummary =
  mongoose.models.MonthSummary || mongoose.model('MonthSummary', MonthSummarySchema);
module.exports = MonthSummary;
