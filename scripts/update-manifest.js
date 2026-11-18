import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = path.resolve(__dirname, '../data/manifest.json');

/**
 * Stamps `data/manifest.json` with the current Unix timestamp (seconds)
 * for one or more modified JSON dataset filenames in `data/`.
 *
 * All `scripts/*.js` patch scripts should call this helper whenever they
 * create or modify a JSON file in `data/` so clients bust the jsDelivr cache
 * immediately via `?v=<timestamp>`.
 *
 * @param {string | string[]} filenames - Dataset filename(s) relative to `data/` (e.g. "tax-brackets.json").
 * @param {number} [timestamp] - Optional Unix timestamp in seconds. Defaults to `Math.floor(Date.now() / 1000)`.
 * @returns {Promise<Record<string, number>>} The updated manifest object.
 */
export async function updateManifest(filenames, timestamp = Math.floor(Date.now() / 1000)) {
  const list = Array.isArray(filenames) ? filenames : [filenames];
  if (list.length === 0) {
    throw new Error('updateManifest requires at least one filename.');
  }

  let manifest = {};
  try {
    const raw = await readFile(MANIFEST_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      manifest = parsed;
    }
  } catch (err) {
    if (err && err.code !== 'ENOENT') {
      throw err;
    }
  }

  for (const name of list) {
    if (typeof name !== 'string' || !name.trim()) {
      throw new Error(`Invalid dataset filename: ${String(name)}`);
    }
    const normalized = name.replace(/^\/+/, '');
    manifest[normalized] = timestamp;
  }

  await mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}

// Allow direct CLI usage: `node scripts/update-manifest.js file1.json [file2.json ...]`
const invokedAsScript =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedAsScript) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node scripts/update-manifest.js <filename.json> [more.json ...]');
    process.exit(1);
  }
  updateManifest(args)
    .then((manifest) => {
      console.log('Updated data/manifest.json:', manifest);
    })
    .catch((err) => {
      console.error('Failed to update data/manifest.json:', err);
      process.exit(1);
    });
}
