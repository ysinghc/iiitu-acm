/**
 * Pushes locally-migrated images (uploads/migrated/*) up to Cloudinary and
 * rewrites the DB fields to the Cloudinary URLs — restoring Cloudinary as
 * the single source of truth for a storage-less (Vercel) deployment.
 *
 *   node scripts/push-migrated-to-cloudinary.js --dry-run   # report only (default)
 *   node scripts/push-migrated-to-cloudinary.js --apply      # upload + rewrite
 *
 * Reads uploads/migrated/_manifest.json left by migrate-images.js.
 * Idempotent: entries already pointing at http(s) URLs are skipped.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

const APPLY = process.argv.includes('--apply');
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'migrated');
const MANIFEST_PATH = path.join(UPLOAD_DIR, '_manifest.json');
const FOLDER = 'iiitu-acm/migrated';

function configureCloudinary() {
  const url = process.env.CLOUDINARY_URL || '';
  const m = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
  if (!m) throw new Error('CLOUDINARY_URL missing or malformed — cannot push to Cloudinary');
  cloudinary.config({ api_key: m[1], api_secret: m[2], cloud_name: m[3], secure: true });
}

async function currentValue(collection, id, field, index) {
  const doc = await mongoose.connection.db
    .collection(collection)
    .findOne({ _id: new mongoose.Types.ObjectId(id) }, { projection: { [field]: 1 } });
  const val = doc && doc[field];
  return index !== null && Array.isArray(val) ? val[index] : val;
}

(async () => {
  configureCloudinary();
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  console.log(`mode: ${APPLY ? 'apply' : 'dry-run'} | manifest entries: ${manifest.length}`);

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });

  // De-dupe: one upload per local file, many entries may reference it.
  const byFile = new Map();
  for (const m of manifest) {
    const file = path.join(UPLOAD_DIR, path.basename(m.newPath));
    if (!byFile.has(file)) byFile.set(file, []);
    byFile.get(file).push(m);
  }

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;
  const fileUrl = new Map();

  for (const [file, entries] of byFile) {
    const first = entries[0];
    const cur = await currentValue(first.collection, first.id, first.field, first.index);
    if (typeof cur === 'string' && /^https?:\/\//i.test(cur)) {
      skipped += 1;
      fileUrl.set(file, cur);
      console.log(`[skip] already remote: ${path.basename(file)}`);
      continue;
    }
    if (!fs.existsSync(file)) {
      failed += 1;
      console.log(`[fail] missing local file: ${file}`);
      continue;
    }
    if (!APPLY) {
      console.log(`[would push] ${path.basename(file)} (${(fs.statSync(file).size / 1024).toFixed(0)}KB) -> ${FOLDER}/`);
      continue;
    }
    try {
      const res = await cloudinary.uploader.upload(file, {
        folder: FOLDER,
        public_id: path.basename(file, path.extname(file)),
        resource_type: 'image',
        overwrite: true,
      });
      fileUrl.set(file, res.secure_url);
      uploaded += 1;
      console.log(`[ok] ${path.basename(file)} -> ${res.secure_url.slice(0, 80)}...`);
    } catch (err) {
      failed += 1;
      console.log(`[fail] ${path.basename(file)} :: ${err.message}`);
    }
  }

  // Rewrite DB fields to Cloudinary URLs.
  let rewrote = 0;
  if (APPLY) {
    for (const [file, entries] of byFile) {
      const url = fileUrl.get(file);
      if (!url) continue;
      for (const m of entries) {
        const col = mongoose.connection.db.collection(m.collection);
        const q = { _id: new mongoose.Types.ObjectId(m.id) };
        if (m.index !== null) await col.updateOne(q, { $set: { [`${m.field}.${m.index}`]: url } });
        else await col.updateOne(q, { $set: { [m.field]: url } });
        rewrote += 1;
      }
    }
    // Keep event banner/mainImage alias pair consistent.
    for (const m of manifest) {
      if (m.collection !== 'events' || (m.field !== 'mainImage' && m.field !== 'bannerImage')) continue;
      const other = m.field === 'mainImage' ? 'bannerImage' : 'mainImage';
      const col = mongoose.connection.db.collection('events');
      const doc = await col.findOne({ _id: new mongoose.Types.ObjectId(m.id) }, { projection: { [m.field]: 1, [other]: 1 } });
      if (doc && typeof doc[m.field] === 'string' && doc[m.field].startsWith('http') && !String(doc[other] || '').startsWith('http')) {
        await col.updateOne({ _id: doc._id }, { $set: { [other]: doc[m.field] } });
        rewrote += 1;
      }
    }
  }

  console.log(`done: uploaded=${uploaded} skipped=${skipped} failed=${failed} fields_rewritten=${rewrote}`);
  if (!APPLY) console.log('dry run — no changes made. Re-run with --apply.');
  await mongoose.disconnect();
})().catch((err) => {
  console.error('push failed:', err.message);
  process.exit(1);
});
