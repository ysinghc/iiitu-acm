/**
 * Legacy image migration: downloads every remote image URL referenced by
 * legacy collections into server/uploads/migrated/ and rewrites the DB
 * fields to the local paths.
 *
 *   node scripts/migrate-images.js --dry-run   # report only (default)
 *   node scripts/migrate-images.js --apply      # download + rewrite
 *   node scripts/migrate-images.js --rollback   # restore URLs from manifest
 *
 * A manifest (uploads/migrated/_manifest.json) records every change so the
 * migration is idempotent and reversible.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const mongoose = require('mongoose');

const MODE = process.argv.includes('--rollback')
  ? 'rollback'
  : process.argv.includes('--apply')
    ? 'apply'
    : 'dry-run';

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'migrated');
const MANIFEST_PATH = path.join(UPLOAD_DIR, '_manifest.json');
const MAX_BYTES = 12 * 1024 * 1024;
const TIMEOUT_MS = 25000;

const TARGETS = [
  { collection: 'carouselslides', fields: ['imageUrl'] },
  { collection: 'messages', fields: ['imageUrl'] },
  { collection: 'teammembers', fields: ['imageUrl'] },
  { collection: 'members', fields: ['imageUrl'] },
  { collection: 'departments', fields: ['bannerImageUrl'] },
  { collection: 'events', fields: ['mainImage', 'bannerImage', 'gallery'] },
];

const EXT_BY_TYPE = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
};

const isRemote = (v) => typeof v === 'string' && /^https?:\/\//i.test(v);
const isMigrated = (v) => typeof v === 'string' && v.startsWith('/uploads/migrated/');

function fetchBuffer(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('too many redirects'));
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(
      url,
      { headers: { 'User-Agent': 'iiitu-acm-migrator/1.0' }, timeout: TIMEOUT_MS },
      (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          res.resume();
          return resolve(fetchBuffer(new URL(res.headers.location, url).toString(), redirects + 1));
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`http ${res.statusCode}`));
        }
        const chunks = [];
        let size = 0;
        res.on('data', (c) => {
          size += c.length;
          if (size > MAX_BYTES) {
            req.destroy();
            return reject(new Error('exceeds 12MB cap'));
          }
          chunks.push(c);
        });
        res.on('end', () =>
          resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] || '' })
        );
        res.on('error', reject);
      }
    );
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    req.on('error', reject);
  });
}

function loadManifest() {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function saveManifest(entries) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(entries, null, 2));
}

async function collect() {
  const jobs = [];
  for (const { collection, fields } of TARGETS) {
    const docs = await mongoose.connection.db.collection(collection).find({}).toArray();
    for (const doc of docs) {
      for (const field of fields) {
        const val = doc[field];
        const urls = Array.isArray(val) ? val : [val];
        urls.forEach((u, idx) => {
          if (isRemote(u) && !isMigrated(u)) {
            jobs.push({ collection, id: String(doc._id), field, index: Array.isArray(val) ? idx : null, url: u });
          }
        });
      }
    }
  }
  return jobs;
}

async function migrate(jobs, manifest) {
  const done = new Set(manifest.map((m) => `${m.collection}|${m.id}|${m.field}|${m.index}|${m.url}`));
  let ok = 0;
  let failed = 0;
  const failures = [];

  for (const [n, job] of jobs.entries()) {
    const key = `${job.collection}|${job.id}|${job.field}|${job.index}|${job.url}`;
    if (done.has(key)) {
      console.log(`[skip] already migrated: ${job.collection}/${job.id} ${job.field}`);
      continue;
    }
    try {
      const { buffer, contentType } = await fetchBuffer(job.url);
      const mime = contentType.split(';')[0].trim().toLowerCase();
      if (!mime.startsWith('image/')) throw new Error(`not an image (${mime || 'unknown type'})`);
      const ext = EXT_BY_TYPE[mime] || 'bin';
      const filename = `${job.collection}-${job.id.slice(-6)}-${job.field}${job.index !== null ? `-g${job.index}` : ''}.${ext}`;
      const abs = path.join(UPLOAD_DIR, filename);
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      fs.writeFileSync(abs, buffer);
      const newPath = `/uploads/migrated/${filename}`;

      const col = mongoose.connection.db.collection(job.collection);
      if (job.index !== null) {
        await col.updateOne({ _id: new mongoose.Types.ObjectId(job.id) }, { $set: { [`${job.field}.${job.index}`]: newPath } });
      } else {
        await col.updateOne({ _id: new mongoose.Types.ObjectId(job.id) }, { $set: { [job.field]: newPath } });
      }
      // Keep event banner/mainImage alias pair consistent.
      if (job.collection === 'events' && (job.field === 'mainImage' || job.field === 'bannerImage')) {
        const other = job.field === 'mainImage' ? 'bannerImage' : 'mainImage';
        await col.updateOne({ _id: new mongoose.Types.ObjectId(job.id) }, { $set: { [other]: newPath } });
      }
      manifest.push({ ...job, newPath, at: new Date().toISOString() });
      ok += 1;
      console.log(`[ok ${n + 1}/${jobs.length}] ${job.collection}/${job.field} <- ${(buffer.length / 1024).toFixed(0)}KB`);
    } catch (err) {
      failed += 1;
      failures.push({ ...job, error: err.message });
      console.log(`[fail ${n + 1}/${jobs.length}] ${job.url} :: ${err.message}`);
    }
  }
  saveManifest(manifest);
  return { ok, failed, failures };
}

async function rollback(manifest) {
  let restored = 0;
  for (const m of manifest) {
    const col = mongoose.connection.db.collection(m.collection);
    if (m.index !== null) {
      await col.updateOne({ _id: new mongoose.Types.ObjectId(m.id) }, { $set: { [`${m.field}.${m.index}`]: m.url } });
    } else {
      await col.updateOne({ _id: new mongoose.Types.ObjectId(m.id) }, { $set: { [m.field]: m.url } });
    }
    if (m.collection === 'events' && (m.field === 'mainImage' || m.field === 'bannerImage')) {
      const other = m.field === 'mainImage' ? 'bannerImage' : 'mainImage';
      await col.updateOne({ _id: new mongoose.Types.ObjectId(m.id) }, { $set: { [other]: m.url } });
    }
    restored += 1;
  }
  console.log(`restored ${restored} field(s) to original URLs (files kept in uploads/migrated/)`);
}

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log(`mode: ${MODE}`);

  const manifest = loadManifest();

  if (MODE === 'rollback') {
    if (manifest.length === 0) console.log('manifest empty — nothing to roll back');
    else await rollback(manifest);
    await mongoose.disconnect();
    return;
  }

  const jobs = await collect();
  console.log(`remote image references found: ${jobs.length}`);
  const byHost = {};
  jobs.forEach((j) => {
    const host = new URL(j.url).hostname;
    byHost[host] = (byHost[host] || 0) + 1;
  });
  console.log('by host:', JSON.stringify(byHost, null, 2));

  if (MODE === 'dry-run') {
    jobs.forEach((j) => console.log(`[would migrate] ${j.collection}/${j.id} ${j.field}${j.index !== null ? `[${j.index}]` : ''} :: ${j.url.slice(0, 110)}`));
    console.log('dry run — no changes made. Re-run with --apply to migrate.');
    await mongoose.disconnect();
    return;
  }

  const { ok, failed, failures } = await migrate(jobs, manifest);
  console.log(`done: ${ok} migrated, ${failed} failed`);
  if (failures.length > 0) {
    fs.writeFileSync(path.join(UPLOAD_DIR, '_failures.json'), JSON.stringify(failures, null, 2));
    console.log('failures written to uploads/migrated/_failures.json');
  }
  await mongoose.disconnect();
})().catch((err) => {
  console.error('migration failed:', err.message);
  process.exit(1);
});
