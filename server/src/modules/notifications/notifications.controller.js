const { asyncHandler } = require('../../utils/http');
const Notification = require('../../models/notification.model');

const list = asyncHandler(async (req, res) => {
  const pageNum = Math.max(1, Number(req.query.page) || 1);
  const limitNum = Math.min(50, Math.max(1, Number(req.query.limit) || 15));
  const [items, total, unread] = await Promise.all([
    Notification.find({ to: req.user._id })
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    Notification.countDocuments({ to: req.user._id }),
    Notification.countDocuments({ to: req.user._id, readAt: null }),
  ]);
  res.json({ items, total, unread, page: pageNum, limit: limitNum });
});

const markRead = asyncHandler(async (req, res) => {
  const note = await Notification.findOneAndUpdate(
    { _id: req.params.id, to: req.user._id },
    { $set: { readAt: new Date() } },
    { new: true }
  ).lean();
  if (!note) return res.status(404).json({ error: { message: 'Notification not found' } });
  res.json(note);
});

const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ to: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
  res.json({ ok: true });
});

module.exports = { list, markRead, markAllRead };
