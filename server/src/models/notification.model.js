/**
 * In-app notification inbox. Every workflow transition writes a row here
 * AND attempts an email — the inbox is the source of truth, email is best-effort.
 */
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true }, // event_submitted | event_decision | report_signature | ...
    title: { type: String, required: true },
    body: { type: String, default: '' },
    link: { type: String, default: '' },
    emailSent: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

NotificationSchema.index({ to: 1, createdAt: -1 });

const Notification =
  mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
module.exports = Notification;
