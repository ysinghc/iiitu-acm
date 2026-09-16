/**
 * First-boot provisioning.
 * - Creates the chair account when the users collection is empty.
 * - Migrates the legacy single-admin (Admin collection) into a chair user
 *   so existing deployments keep their access.
 * - Backfills pre-workflow events to `published` so the public site never
 *   goes blank after deploy.
 */
const bcrypt = require('bcryptjs');
const env = require('./config/env');
const { ROLES } = require('./constants/roles');
const { EVENT_WORKFLOW } = require('./constants/workflows');
const User = require('./models/user.model');

async function bootstrap() {
  const count = await User.countDocuments();
  if (count === 0) {
    let email = env.seedChairEmail;
    let password = env.seedChairPassword;
    let name = env.seedChairName;

    // Adopt the legacy admin account if one exists.
    try {
      const Admin = require('../api/models/admin.model');
      const legacy = await Admin.findOne().lean();
      if (legacy && legacy.username) {
        email = /\S+@\S+\.\S+/.test(legacy.username) ? legacy.username.toLowerCase() : email;
        name = 'Chapter Chair';
        password = password || null; // unknown: force a reset via invite flow
      }
    } catch {
      // legacy model unavailable — continue with env seed
    }

    const finalPassword = password || require('crypto').randomBytes(8).toString('hex');
    await User.create({
      name,
      email: String(email).toLowerCase(),
      passwordHash: await bcrypt.hash(finalPassword, 10),
      role: ROLES.CHAIR,
    });
    console.log(`Bootstrapped chair account: ${email}`);
    if (!password) {
      console.log(`Generated chair password: ${finalPassword} (change it after first login)`);
    }
  }

  // Every account gets a readable member ID — backfill anyone missing one
  // (oldest first so IDs follow seniority).
  try {
    const { generateUserId } = require('./services/ids');
    const missing = await User.find({ $or: [{ userId: null }, { userId: '' }] })
      .sort({ createdAt: 1 })
      .select('_id');
    for (const u of missing) {
      await User.updateOne({ _id: u._id }, { $set: { userId: await generateUserId() } });
    }
    if (missing.length > 0) console.log(`Assigned member IDs to ${missing.length} existing account(s)`);
  } catch (err) {
    console.error('Member ID backfill failed:', err.message);
  }

  // Keep pre-workflow events publicly visible.
  try {
    const Event = require('../api/models/event.model');
    const res = await Event.updateMany(
      { $or: [{ workflow: { $exists: false } }, { 'workflow.status': { $exists: false } }] },
      { $set: { 'workflow.status': EVENT_WORKFLOW.PUBLISHED, 'workflow.publishedAt': new Date() } }
    );
    if (res.modifiedCount > 0) console.log(`Backfilled ${res.modifiedCount} legacy event(s) to published`);
  } catch (err) {
    console.error('Event backfill failed:', err.message);
  }
}

module.exports = bootstrap;
