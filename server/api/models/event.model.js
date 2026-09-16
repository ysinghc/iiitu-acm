const mongoose = require('mongoose');

const EVENT_WORKFLOW_STATES = [
  'draft',
  'pending_review',
  'approved',
  'published',
  'rejected',
  'cancelled',
  'completed',
];

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, default: '' },
  description: { type: String, default: '' },
  // Legacy free-text date + structured scheduling (kept in sync, either may be set).
  date: { type: String, default: '' },
  startsAt: { type: Date, default: null },
  endsAt: { type: Date, default: null },
  timeText: { type: String, default: '' },
  // Legacy location + venue alias (kept in sync).
  location: { type: String, default: '' },
  venue: { type: String, default: '' },
  // Legacy display lifecycle (upcoming/ongoing/completed). The approval
  // pipeline below is orthogonal: only published/completed workflow events
  // are publicly listed by the new API.
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed'],
    default: 'completed'
  },
  // Approval workflow: draft -> pending_review -> approved -> published -> completed
  workflow: {
    status: { type: String, enum: EVENT_WORKFLOW_STATES, default: 'draft' },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewNote: { type: String, default: '' },
    decidedAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },
  interestGroups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InterestGroup'
  }],
  verticals: [{ type: String }],
  organizers: [{
    // Organizing people are login accounts (User), never roster strings.
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, default: '' },
    role: { type: String, default: '' }
  }],
  organizedBy: { type: String, default: 'IIITU ACM Student Chapter' },
  // Legacy mainImage + bannerImage alias (kept in sync).
  mainImage: { type: String, default: '' },
  bannerImage: { type: String, default: '' },
  gallery: [{ type: String }],
  galleryLink: { type: String, default: '' },
  order: { type: Number, default: 0 },
}, { timestamps: true });

// Keep legacy/new field aliases in sync so old and new clients interoperate.
EventSchema.pre('save', function syncEventAliases() {
  if (this.bannerImage && !this.mainImage) this.mainImage = this.bannerImage;
  if (this.mainImage && !this.bannerImage) this.bannerImage = this.mainImage;
  if (this.venue && !this.location) this.location = this.venue;
  if (this.location && !this.venue) this.venue = this.location;
  if (this.startsAt && !this.date) {
    try {
      this.date = this.startsAt.toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      });
    } catch { /* keep date as-is */ }
  }
});

const Event = mongoose.model('Event', EventSchema);
module.exports = Event;
module.exports.EVENT_WORKFLOW_STATES = EVENT_WORKFLOW_STATES;
