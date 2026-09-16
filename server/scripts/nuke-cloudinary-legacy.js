/**
 * DANGER: permanently deletes chapter assets from Cloudinary.
 * Scope is strictly limited to the `iiitu-acm/` prefix.
 *
 *   node scripts/nuke-cloudinary-legacy.js --dry-run   # inventory only (default)
 *   node scripts/nuke-cloudinary-legacy.js --apply      # delete everything
 */
require('dotenv').config();
const cloudinary = require('cloudinary').v2;

const APPLY = process.argv.includes('--apply');
const PREFIX = 'iiitu-acm/';

function configure() {
  const m = (process.env.CLOUDINARY_URL || '').match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
  if (!m) throw new Error('CLOUDINARY_URL missing or malformed');
  cloudinary.config({ api_key: m[1], api_secret: m[2], cloud_name: m[3], secure: true });
}

async function listAll(prefix) {
  const all = [];
  let next = undefined;
  do {
    const res = await cloudinary.api.resources({
      type: 'upload',
      prefix,
      max_results: 500,
      next_cursor: next,
    });
    all.push(...(res.resources || []));
    next = res.next_cursor;
  } while (next);
  return all;
}

async function deleteFoldersDeep(parent) {
  try {
    const { folders } = await cloudinary.api.sub_folders(parent);
    for (const f of folders || []) await deleteFoldersDeep(f.path);
    await cloudinary.api.delete_folder(parent);
    console.log(`[folder deleted] ${parent}`);
  } catch (err) {
    console.log(`[folder skip] ${parent} :: ${err.message}`);
  }
}

(async () => {
  configure();
  const resources = await listAll(PREFIX);
  const bytes = resources.reduce((a, r) => a + (r.bytes || 0), 0);
  console.log(`mode: ${APPLY ? 'apply' : 'dry-run'}`);
  console.log(`resources under ${PREFIX}: ${resources.length} (${(bytes / 1024 / 1024).toFixed(2)} MB)`);
  resources.slice(0, 15).forEach((r) => console.log(`  - ${r.public_id} (${((r.bytes || 0) / 1024).toFixed(0)}KB)`));
  if (resources.length > 15) console.log(`  ... and ${resources.length - 15} more`);

  if (!APPLY) {
    console.log('dry run — nothing deleted. Re-run with --apply.');
    return;
  }

  // Delete in batches of 100 (API limit).
  for (let i = 0; i < resources.length; i += 100) {
    const batch = resources.slice(i, i + 100).map((r) => r.public_id);
    const res = await cloudinary.api.delete_resources(batch);
    const deleted = Object.values(res.deleted || {}).filter((v) => v === 'deleted').length;
    console.log(`batch ${i / 100 + 1}: ${deleted}/${batch.length} deleted`);
  }

  // Remove now-empty folders.
  await deleteFoldersDeep('iiitu-acm');
  console.log('Cloudinary legacy wipe complete.');
})().catch((err) => {
  console.error('failed:', err.message);
  process.exit(1);
});
