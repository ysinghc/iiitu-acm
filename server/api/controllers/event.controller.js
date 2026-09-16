const Event = require('../models/event.model');
const InterestGroup = require('../models/interestGroup.model');
const Department = require('../models/department.model');

// Get all events (Public) - Populated
const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .populate('department', 'name slug bannerImageUrl')
      .populate('interestGroups', 'name areaOfInterest department')
      .populate('organizers.user', 'name role userId avatarUrl')
      .sort({ order: 1, createdAt: -1 });
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

// Get single event by ID or slug (Public)
const getEventById = async (req, res) => {
  try {
    const query = req.params.id.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: req.params.id }
      : { slug: req.params.id };

    const event = await Event.findOne(query)
      .populate('department')
      .populate('interestGroups')
      .populate('organizers.user', 'name role userId avatarUrl');

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event details' });
  }
};

// Helper: Postel's Law - Normalize verticals & interestGroups from string array or comma text
const resolveVerticalsAndGroups = async (verticalsInput, interestGroupIds) => {
  let verticals = [];
  let interestGroups = Array.isArray(interestGroupIds) ? interestGroupIds.filter(Boolean) : [];

  if (Array.isArray(verticalsInput)) {
    verticals = verticalsInput.map(v => typeof v === 'string' ? v.trim() : '').filter(Boolean);
  } else if (typeof verticalsInput === 'string' && verticalsInput.trim()) {
    verticals = verticalsInput.split(',').map(v => v.trim()).filter(Boolean);
  }

  // Auto-resolve InterestGroup IDs from vertical tag names if not explicitly passed
  if (verticals.length > 0 && interestGroups.length === 0) {
    const matchedIGs = await InterestGroup.find({ name: { $in: verticals } });
    if (matchedIGs.length > 0) {
      interestGroups = matchedIGs.map(ig => ig._id);
    }
  }

  return { verticals, interestGroups };
};

// Create a new event (Admin)
const createEvent = async (req, res) => {
  try {
    const {
      title,
      slug,
      description,
      date,
      location,
      status,
      department,
      interestGroups: igIds,
      verticals: vInput,
      organizers,
      organizedBy,
      mainImage,
      gallery,
      galleryLink,
      order
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Event title is required' });
    }

    const { verticals, interestGroups } = await resolveVerticalsAndGroups(vInput, igIds);

    const generatedSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const newEvent = new Event({
      title,
      slug: generatedSlug,
      description: description || '',
      date: date || '',
      location: location || '',
      status: status || 'completed',
      // Direct reviewer write = immediately published (members propose via /api/v1 workflow).
      workflow: { status: 'published', publishedAt: new Date() },
      department: department || null,
      interestGroups,
      verticals,
      organizers: Array.isArray(organizers) ? organizers : [],
      organizedBy: organizedBy || 'IIITU ACM Student Chapter',
      mainImage: mainImage || '',
      gallery: Array.isArray(gallery) ? gallery.filter(Boolean) : [],
      galleryLink: galleryLink || '',
      order: typeof order === 'number' ? order : 0
    });

    await newEvent.save();
    
    // Return fully populated entity
    const populated = await Event.findById(newEvent._id)
      .populate('department')
      .populate('interestGroups')
      .populate('organizers.user', 'name role userId avatarUrl');

    res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event', details: error.message });
  }
};

// Update an existing event (Admin)
const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const {
      title,
      slug,
      description,
      date,
      location,
      status,
      department,
      interestGroups: igIds,
      verticals: vInput,
      organizers,
      organizedBy,
      mainImage,
      gallery,
      galleryLink,
      order
    } = req.body;

    if (title !== undefined) event.title = title;
    if (slug !== undefined) event.slug = slug;
    if (description !== undefined) event.description = description;
    if (date !== undefined) event.date = date;
    if (location !== undefined) event.location = location;
    if (status !== undefined) event.status = status;
    if (department !== undefined) event.department = department || null;
    if (organizedBy !== undefined) event.organizedBy = organizedBy;
    if (mainImage !== undefined) event.mainImage = mainImage;
    if (gallery !== undefined) event.gallery = Array.isArray(gallery) ? gallery.filter(Boolean) : [];
    if (galleryLink !== undefined) event.galleryLink = galleryLink;
    if (order !== undefined) event.order = typeof order === 'number' ? order : 0;
    if (organizers !== undefined) event.organizers = Array.isArray(organizers) ? organizers : [];

    if (vInput !== undefined || igIds !== undefined) {
      const { verticals, interestGroups } = await resolveVerticalsAndGroups(
        vInput !== undefined ? vInput : event.verticals,
        igIds !== undefined ? igIds : event.interestGroups
      );
      event.verticals = verticals;
      event.interestGroups = interestGroups;
    }

    // Legacy direct-write path stays immediately visible.
    if (!event.workflow || !event.workflow.status) {
      event.workflow = { status: 'published', publishedAt: new Date() };
    }

    await event.save();

    const populated = await Event.findById(event._id)
      .populate('department')
      .populate('interestGroups')
      .populate('organizers.user', 'name role userId avatarUrl');

    res.json(populated);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event', details: error.message });
  }
};

// Delete an event (Admin)
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({ message: 'Event deleted successfully', id: req.params.id });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
};

module.exports = {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent
};
