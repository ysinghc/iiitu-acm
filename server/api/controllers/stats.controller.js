/**
 * Chapter stats + unified search, derived from login accounts.
 * There is no separate roster or team collection anymore — every person
 * counted or searched here is a User.
 */
const Event = require('../models/event.model');
const User = require('../../src/models/user.model');
const Department = require('../models/department.model');
const InterestGroup = require('../models/interestGroup.model');
const CarouselSlide = require('../models/carousel.model');
const { EXEC_ROLES } = require('../../src/constants/roles');

// Get System Overview & Zeigarnik Task Completeness
const getSystemOverview = async (req, res) => {
  try {
    const [
      events,
      leadership,
      memberCount,
      departments,
      interestGroups,
      carouselCount
    ] = await Promise.all([
      Event.find().populate('department interestGroups').sort({ createdAt: -1 }),
      User.find({ role: { $in: [...EXEC_ROLES, 'hod', 'expert'] }, isActive: true }),
      User.countDocuments({ role: { $in: ['member', 'scholar', 'fellow'] }, isActive: true }),
      Department.find(),
      InterestGroup.find().populate('department igl'),
      CarouselSlide.countDocuments()
    ]);

    // Zeigarnik Task Alerts (Incomplete system tasks)
    const completenessAlerts = [];

    const eventsWithoutImages = events.filter(e => !e.mainImage && !e.bannerImage);
    if (eventsWithoutImages.length > 0) {
      completenessAlerts.push({
        id: 'events-no-image',
        type: 'warning',
        category: 'Events',
        title: `${eventsWithoutImages.length} event(s) missing banner image`,
        detail: eventsWithoutImages.map(e => e.title).join(', '),
        actionTab: 'events'
      });
    }

    const igsWithoutLead = interestGroups.filter(ig => !ig.igl);
    if (igsWithoutLead.length > 0) {
      completenessAlerts.push({
        id: 'ig-no-lead',
        type: 'warning',
        category: 'Verticals',
        title: `${igsWithoutLead.length} Interest Group(s) missing expert lead`,
        detail: igsWithoutLead.map(ig => ig.name).join(', '),
        actionTab: 'content'
      });
    }

    const leadersNoPhoto = leadership.filter(t => !t.avatarUrl);
    if (leadersNoPhoto.length > 0) {
      completenessAlerts.push({
        id: 'leaders-no-photo',
        type: 'info',
        category: 'Leadership',
        title: `${leadersNoPhoto.length} leader(s) missing profile photos`,
        detail: leadersNoPhoto.map(t => t.name).join(', '),
        actionTab: 'people'
      });
    }

    // Health Score calculation (0 to 100%)
    const maxScore = 100;
    const penalty = (eventsWithoutImages.length * 10) + (igsWithoutLead.length * 15) + (leadersNoPhoto.length * 5);
    const healthScore = Math.max(20, Math.min(100, maxScore - penalty));

    res.json({
      healthScore,
      counts: {
        totalEvents: events.length,
        upcomingEvents: events.filter(e => e.status === 'upcoming').length,
        completedEvents: events.filter(e => e.status !== 'upcoming').length,
        totalTeamMembers: leadership.filter(u => EXEC_ROLES.includes(u.role)).length,
        electedBoard: leadership.filter(u => EXEC_ROLES.includes(u.role)).length,
        internalAffairs: 0,
        igLeads: leadership.filter(u => u.role === 'expert').length,
        totalMembers: memberCount,
        totalDepartments: departments.length,
        totalInterestGroups: interestGroups.length,
        carouselSlides: carouselCount
      },
      alerts: completenessAlerts,
      recentEvents: events.slice(0, 4)
    });
  } catch (error) {
    console.error('Error getting system overview:', error);
    res.status(500).json({ error: 'Failed to generate system stats' });
  }
};

// Global Unified Search Across Collections (people = login accounts)
const globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ results: [] });
    }

    const regex = new RegExp(q.trim(), 'i');

    const [events, people, interestGroups, departments] = await Promise.all([
      Event.find({
        $or: [{ title: regex }, { description: regex }, { location: regex }, { venue: regex }, { verticals: regex }]
      }).limit(5),
      User.find({
        isActive: true,
        $or: [{ name: regex }, { email: regex }, { userId: regex }, { batch: regex }]
      }).limit(5),
      InterestGroup.find({
        $or: [{ name: regex }, { areaOfInterest: regex }]
      }).populate('department').limit(5),
      Department.find({
        $or: [{ name: regex }, { slug: regex }, { description: regex }]
      }).limit(5)
    ]);

    const results = [
      ...events.map(e => ({ id: e._id, title: e.title, category: 'Event', subtitle: `${e.date || 'Event'}`, tab: 'events' })),
      ...people.map(p => ({ id: p._id, title: `${p.name} (${p.userId || p.role})`, category: 'Person', subtitle: `${p.role} • ${p.department || 'chapter'}`, tab: 'people' })),
      ...interestGroups.map(ig => ({ id: ig._id, title: ig.name, category: 'Interest Group', subtitle: ig.department?.name || 'Vertical', tab: 'content' })),
      ...departments.map(d => ({ id: d._id, title: d.name, category: 'Department', subtitle: d.slug, tab: 'content' }))
    ];

    res.json({ results });
  } catch (error) {
    console.error('Error performing global search:', error);
    res.status(500).json({ error: 'Search failed' });
  }
};

module.exports = {
  getSystemOverview,
  globalSearch,
};
