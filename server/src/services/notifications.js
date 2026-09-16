/**
 * Workflow side-effects hub: writes an inbox Notification row for every
 * recipient and best-effort sends the matching email.
 * Never throws — notification failures must not fail the workflow transition.
 */
const Notification = require('../models/notification.model');
const User = require('../models/user.model');
const { ROLES, EXEC_ROLES } = require('../constants/roles');
const { sendMail } = require('./mailer');

async function resolveRecipients({ users = [], roles = [], department = '' }) {
  const ids = new Set(users.map((u) => String(u._id || u)));
  if (roles.length > 0) {
    const query = { role: { $in: roles }, isActive: true };
    if (department) query.department = department;
    const found = await User.find(query).select('_id').lean();
    found.forEach((u) => ids.add(String(u._id)));
  }
  return [...ids];
}

async function notify({ to = [], type, title, body = '', link = '', email = null }) {
  try {
    const ids = await resolveRecipients(to);
    if (ids.length === 0) return;
    const usersById = new Map(
      (await User.find({ _id: { $in: ids } }).select('_id email name').lean()).map((u) => [
        String(u._id),
        u,
      ])
    );
    await Notification.insertMany(
      ids.map((id) => ({ to: id, type, title, body, link, emailSent: false }))
    );
    if (email) {
      await Promise.all(
        ids.map(async (id) => {
          const u = usersById.get(String(id));
          if (!u || !u.email) return;
          const result = await sendMail({
            to: u.email,
            subject: email.subject,
            html: email.html,
          });
          if (result.sent) {
            await Notification.updateOne(
              { to: id, type, title },
              { $set: { emailSent: true } }
            ).catch(() => {});
          }
        })
      );
    }
  } catch (err) {
    console.error('[notify] failed:', err.message);
  }
}

const execPlusHods = (department = '') => ({
  roles: [...EXEC_ROLES, ROLES.HOD],
  ...(department ? { department } : {}),
});

module.exports = { notify, execPlusHods };
