/**
 * Event lifecycle.
 *
 * Any signed-in member can PROPOSE (draft). Submitting moves it to
 * pending_review and notifies exec + department HoDs. Exec/HoD can then
 * approve -> publish -> complete, or reject/cancel with a note.
 * Only published/completed events appear in the public listing.
 */
const { ApiError } = require('../../utils/http');
const { slugify } = require('../../utils/format');
const { ROLES, isExec } = require('../../constants/roles');
const { EVENT_WORKFLOW } = require('../../constants/workflows');
const Event = require('../../../api/models/event.model');
const { notify, execPlusHods } = require('../../services/notifications');
const { Templates } = require('../../services/mailer');
const env = require('../../config/env');

const canReview = (actor) => isExec(actor.role) || actor.role === ROLES.HOD;

const populateEvent = (query) =>
  query
    .populate('department', 'name slug bannerImageUrl')
    .populate('interestGroups', 'name areaOfInterest department')
    .populate('workflow.submittedBy', 'name email role userId')
    .populate('workflow.reviewedBy', 'name email role userId');

const publicFilter = () => ({
  $or: [
    { 'workflow.status': { $in: [EVENT_WORKFLOW.PUBLISHED, EVENT_WORKFLOW.COMPLETED] } },
    // Legacy docs created before the workflow existed stay visible.
    { 'workflow.status': { $exists: false } },
    { workflow: { $exists: false } },
  ],
});

async function listPublic({ status = '', department = '', q = '', page = 1, limit = 12 }) {
  const filter = publicFilter();
  const and = [];
  if (status) and.push({ status });
  if (department) and.push({ department });
  if (q) {
    and.push({
      $or: [
        { title: new RegExp(q.trim(), 'i') },
        { description: new RegExp(q.trim(), 'i') },
        { venue: new RegExp(q.trim(), 'i') },
        { location: new RegExp(q.trim(), 'i') },
      ],
    });
  }
  if (and.length > 0) filter.$and = and;
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(50, Math.max(1, Number(limit) || 12));
  const [items, total] = await Promise.all([
    populateEvent(Event.find(filter))
      .sort({ startsAt: -1, order: 1, createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    Event.countDocuments(filter),
  ]);
  return { items, total, page: pageNum, limit: limitNum };
}

async function getPublic(idOrSlug) {
  const query = /^[0-9a-fA-F]{24}$/.test(idOrSlug)
    ? { _id: idOrSlug }
    : { slug: idOrSlug };
  const event = await populateEvent(Event.findOne({ ...query, ...publicFilter() })).lean();
  if (!event) throw ApiError.notFound('Event not found');
  return event;
}

/** Review queue: everything not yet published (plus recent decisions). */
async function listQueue(actor) {
  if (!canReview(actor)) throw ApiError.forbidden();
  const filter = actor.role === ROLES.HOD && actor.department
    ? { department: await resolveDeptId(actor.department) }
    : {};
  const items = await populateEvent(Event.find(filter))
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();
  return { items };
}

async function resolveDeptId(slug) {
  try {
    const Department = require('../../../api/models/department.model');
    const dept = await Department.findOne({ slug }).select('_id').lean();
    return dept ? dept._id : null;
  } catch {
    return null;
  }
}

async function myProposals(actor) {
  const items = await populateEvent(
    Event.find({ 'workflow.submittedBy': actor._id })
  )
    .sort({ updatedAt: -1 })
    .lean();
  return { items };
}

function pickWritable(body) {
  const fields = [
    'title', 'description', 'date', 'startsAt', 'endsAt', 'timeText',
    'location', 'venue', 'status', 'department', 'interestGroups',
    'organizers', 'organizedBy', 'mainImage', 'bannerImage',
    'gallery', 'galleryLink', 'order',
  ];
  const out = {};
  for (const f of fields) {
    if (body[f] !== undefined) out[f] = body[f];
  }
  // Alias normalization so callers can use either vocabulary.
  if (out.bannerImage && !out.mainImage) out.mainImage = out.bannerImage;
  if (out.mainImage && !out.bannerImage) out.bannerImage = out.mainImage;
  if (out.venue && !out.location) out.location = out.venue;
  if (out.location && !out.venue) out.venue = out.location;
  return out;
}

async function propose(actor, body) {
  if (!body.title) throw ApiError.badRequest('Event title is required');
  if (!body.bannerImage && !body.mainImage) throw ApiError.badRequest('A banner image is required');
  if (!body.description) throw ApiError.badRequest('A description is required');
  if (!body.startsAt && !body.date) throw ApiError.badRequest('Date is required');
  if (!body.venue && !body.location) throw ApiError.badRequest('Venue/place is required');

  const data = pickWritable(body);
  data.slug = body.slug || slugify(body.title);
  data.workflow = { status: EVENT_WORKFLOW.DRAFT, submittedBy: actor._id };

  const event = await Event.create(data);
  if (body.submit === true) {
    return submit(actor, event._id);
  }
  return populateEvent(Event.findById(event._id)).lean();
}

async function editDraft(actor, id, body) {
  const event = await Event.findById(id);
  if (!event) throw ApiError.notFound('Event not found');
  const status = event.workflow?.status || 'draft';
  const isOwner = String(event.workflow?.submittedBy) === String(actor._id);
  if (!canReview(actor) && !(isOwner && [EVENT_WORKFLOW.DRAFT, EVENT_WORKFLOW.REJECTED].includes(status))) {
    throw ApiError.forbidden('Only the proposer (while in draft/rejected) or a reviewer can edit');
  }
  Object.assign(event, pickWritable(body));
  if (body.title && !body.slug) event.slug = slugify(body.title);
  await event.save();
  return populateEvent(Event.findById(event._id)).lean();
}

async function transition(actor, id, to, note = '') {
  const event = await Event.findById(id);
  if (!event) throw ApiError.notFound('Event not found');
  const from = event.workflow?.status || 'draft';
  const isOwner = String(event.workflow?.submittedBy) === String(actor._id);

  const allowed = {
    [EVENT_WORKFLOW.PENDING_REVIEW]: [EVENT_WORKFLOW.DRAFT, EVENT_WORKFLOW.REJECTED, EVENT_WORKFLOW.CHANGES_REQUESTED].includes(from)
      && (isOwner || canReview(actor)),
    [EVENT_WORKFLOW.APPROVED]: from === EVENT_WORKFLOW.PENDING_REVIEW && canReview(actor),
    [EVENT_WORKFLOW.PUBLISHED]: [EVENT_WORKFLOW.APPROVED, EVENT_WORKFLOW.PENDING_REVIEW].includes(from) && canReview(actor),
    [EVENT_WORKFLOW.REJECTED]: from === EVENT_WORKFLOW.PENDING_REVIEW && canReview(actor),
    [EVENT_WORKFLOW.CANCELLED]: [EVENT_WORKFLOW.DRAFT, EVENT_WORKFLOW.PENDING_REVIEW].includes(from)
      && (isOwner || canReview(actor)),
    [EVENT_WORKFLOW.COMPLETED]: [EVENT_WORKFLOW.PUBLISHED].includes(from) && canReview(actor),
  };

  if (!allowed[to]) {
    throw ApiError.badRequest(`Cannot move event from ${from} to ${to}`);
  }
  if ([EVENT_WORKFLOW.REJECTED, EVENT_WORKFLOW.CANCELLED].includes(to) && !note) {
    throw ApiError.badRequest('A note is required when rejecting or cancelling');
  }

  event.workflow = event.workflow || {};
  event.workflow.status = to;
  event.workflow.reviewedBy = canReview(actor) ? actor._id : event.workflow.reviewedBy;
  event.workflow.reviewNote = note || '';
  event.workflow.decidedAt = new Date();
  if (to === EVENT_WORKFLOW.PUBLISHED) {
    event.workflow.publishedAt = new Date();
    if (event.status === 'completed') event.status = 'upcoming';
  }
  if (to === EVENT_WORKFLOW.COMPLETED) event.status = 'completed';
  await event.save();

  const populated = await populateEvent(Event.findById(event._id)).lean();

  // --- notifications ---
  const dashboardLink = `${env.clientUrl}/dashboard?tab=events`;
  const ownerId = event.workflow.submittedBy;
  if (to === EVENT_WORKFLOW.PENDING_REVIEW) {
    await notify({
      to: execPlusHods(),
      type: 'event_submitted',
      title: `New event awaiting review: ${event.title}`,
      body: `Proposed by ${actor.name}.`,
      link: dashboardLink,
      email: { subject: `[ACM] Review needed: ${event.title}`, html: Templates.eventSubmitted(event.title, actor.name) },
    });
  } else if ([EVENT_WORKFLOW.APPROVED, EVENT_WORKFLOW.PUBLISHED, EVENT_WORKFLOW.REJECTED, EVENT_WORKFLOW.CANCELLED, EVENT_WORKFLOW.COMPLETED].includes(to) && ownerId) {
    await notify({
      to: { users: [ownerId] },
      type: 'event_decision',
      title: `Event ${to.replace('_', ' ')}: ${event.title}`,
      body: note || `Reviewed by ${actor.name}.`,
      link: dashboardLink,
      email: { subject: `[ACM] Event ${to}: ${event.title}`, html: Templates.eventDecision(event.title, to, note) },
    });
  }
  return populated;
}

const submit = (actor, id) => transition(actor, id, EVENT_WORKFLOW.PENDING_REVIEW);

async function remove(actor, id) {
  const event = await Event.findById(id);
  if (!event) throw ApiError.notFound('Event not found');
  const status = event.workflow?.status || 'draft';
  const isOwner = String(event.workflow?.submittedBy) === String(actor._id);
  if (!canReview(actor) && !(isOwner && status === EVENT_WORKFLOW.DRAFT)) {
    throw ApiError.forbidden('Only reviewers can delete submitted events');
  }
  await event.deleteOne();
  return { id };
}

module.exports = {
  listPublic,
  getPublic,
  listQueue,
  myProposals,
  propose,
  editDraft,
  transition,
  submit,
  remove,
};
