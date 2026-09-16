/**
 * DANGER: permanently deletes legacy people/roster data from MongoDB and
 * clears dead Cloudinary URLs from the collections we keep.
 *
 * Deletes: members (roster), teammembers (old board), interestgroupmemberships.
 * Clears: image fields pointing at res.cloudinary.com in carouselslides,
 *         messages, departments, events (set to '' / [] so UIs show
 *         placeholders instead of broken images).
 * Nulls:  interestgroups.igl (all pointed at deleted TeamMembers; leads are
 *         re-assigned to expert accounts from the dashboard).
 * Keeps:   users, events (imageless), departments, interest-groups, carousel,
 *         messages, reports, summaries, notifications, counters.
 *
 *   node scripts/nuke-legacy-data.js --dry-run   # counts only (default)
 *   node scripts/nuke-legacy-data.js --apply      # delete + clear
 */
require('dotenv').config();
const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');
const CLOUDY = /^https:\/\/res\.cloudinary\.com\//i;

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  const db = mongoose.connection.db;
  console.log(`mode: ${APPLY ? 'apply' : 'dry-run'}`);

  const report = {};
  report.members = await db.collection('members').countDocuments();
  report.teammembers = await db.collection('teammembers').countDocuments();
  report.memberships = await db.collection('interestgroupmemberships').countDocuments();
  report.users_kept = await db.collection('users').countDocuments();
  report.events_kept = await db.collection('events').countDocuments();
  report.groups_kept = await db.collection('interestgroups').countDocuments();

  const cloudyCount = async (col, field, array = false) => {
    const docs = await db.collection(col).find({}).toArray();
    let n = 0;
    docs.forEach((d) => {
      const vals = array ? d[field] || [] : [d[field]];
      vals.forEach((v) => { if (typeof v === 'string' && CLOUDY.test(v)) n += 1; });
    });
    return n;
  };
  report.cloudy_images = {
    carouselslides: await cloudyCount('carouselslides', 'imageUrl'),
    messages: await cloudyCount('messages', 'imageUrl'),
    departments: await cloudyCount('departments', 'bannerImageUrl'),
    events_main: await cloudyCount('events', 'mainImage'),
    events_banner: await cloudyCount('events', 'bannerImage'),
    events_gallery: await cloudyCount('events', 'gallery', true),
  };
  report.groups_with_igl = await db.collection('interestgroups').countDocuments({ igl: { $ne: null } });
  console.log(JSON.stringify(report, null, 2));

  if (!APPLY) {
    console.log('dry run — nothing changed. Re-run with --apply.');
    await mongoose.disconnect();
    return;
  }

  const del = async (col) => {
    const r = await db.collection(col).deleteMany({});
    console.log(`deleted ${r.deletedCount} from ${col}`);
  };
  await del('members');
  await del('teammembers');
  await del('interestgroupmemberships');

  const clearField = async (col, field, to) => {
    const r = await db.collection(col).updateMany(
      { [field]: { $regex: '^https://res\\.cloudinary\\.com/' } },
      { $set: { [field]: to } }
    );
    if (r.modifiedCount) console.log(`cleared ${r.modifiedCount} ${col}.${field}`);
  };
  await clearField('carouselslides', 'imageUrl', '');
  await clearField('messages', 'imageUrl', '');
  await clearField('departments', 'bannerImageUrl', '');
  await clearField('events', 'mainImage', '');
  await clearField('events', 'bannerImage', '');

  // Gallery arrays: strip cloudinary entries, keep any other URLs.
  for (const e of await db.collection('events').find({ gallery: { $exists: true } }).toArray()) {
    const kept = (e.gallery || []).filter((u) => !(typeof u === 'string' && CLOUDY.test(u)));
    if (kept.length !== (e.gallery || []).length) {
      await db.collection('events').updateOne({ _id: e._id }, { $set: { gallery: kept } });
      console.log(`trimmed gallery on event ${e._id}`);
    }
  }

  const igl = await db.collection('interestgroups').updateMany({}, { $set: { igl: null } });
  console.log(`nulled igl on ${igl.modifiedCount} interest group(s) — re-assign expert leads from the dashboard`);

  console.log('Legacy data wipe complete.');
  await mongoose.disconnect();
})().catch((err) => {
  console.error('failed:', err.message);
  process.exit(1);
});
