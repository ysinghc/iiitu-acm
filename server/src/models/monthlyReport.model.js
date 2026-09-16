/**
 * One monthly progress form per learner (scholar/fellow) per calendar month.
 *
 * Pipeline: mentor files Week 1–4 KPIs (draft)
 *        -> submits to student (pending_student)
 *        -> student signs (pending_hod, HoD of the student's department is notified)
 *        -> HoD approves / requests changes / rejects
 * Executive board has read access to everything.
 */
const mongoose = require('mongoose');
const { REVIEW_WORKFLOW } = require('../constants/workflows');

const WeekKpiSchema = new mongoose.Schema(
  {
    goals: { type: String, default: '' },
    kpiScore: { type: Number, min: 0, max: 100, default: null },
    remarks: { type: String, default: '' },
  },
  { _id: false }
);

const emptyWeeks = () => [{}, {}, {}, {}].map(() => ({ goals: '', kpiScore: null, remarks: '' }));

const MonthlyReportSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    department: { type: String, required: true },
    month: { type: String, required: true, match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'month must be YYYY-MM'] },
    weeks: { type: [WeekKpiSchema], default: emptyWeeks, validate: [(v) => v.length === 4, 'exactly 4 weeks required'] },
    overallRemarks: { type: String, default: '' },
    status: {
      type: String,
      enum: Object.values(REVIEW_WORKFLOW),
      default: REVIEW_WORKFLOW.DRAFT,
    },
    studentSignature: {
      name: { type: String, default: '' },
      signedAt: { type: Date, default: null },
    },
    hodReview: {
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      decision: { type: String, default: '' }, // approved | changes_requested | rejected
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

MonthlyReportSchema.index({ student: 1, month: 1 }, { unique: true });
MonthlyReportSchema.index({ department: 1, month: 1 });
MonthlyReportSchema.index({ status: 1 });

const MonthlyReport =
  mongoose.models.MonthlyReport || mongoose.model('MonthlyReport', MonthlyReportSchema);
module.exports = MonthlyReport;
