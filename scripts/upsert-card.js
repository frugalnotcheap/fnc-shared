import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { updateManifest } from './update-manifest.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CARDS_PATH = path.resolve(__dirname, '../data/cards.json');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        i += 1;
      }
    }
  }
  return args;
}

function formatMonthYear(date = new Date()) {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/**
 * Inserts or updates a credit card entry by `id` in `data/cards.json`,
 * updates `lastVerified`, and stamps `data/manifest.json`.
 *
 * @param {Record<string, unknown> & { id: string }} card
 * @param {{ lastVerified?: string }} [options]
 */
export async function upsertCard(card, { lastVerified = formatMonthYear() } = {}) {
  if (!card || typeof card !== 'object' || typeof card.id !== 'string' || !card.id.trim()) {
    throw new Error('Card payload must be an object with a non-empty string "id".');
  }

  const raw = await readFile(CARDS_PATH, 'utf8');
  const data = JSON.parse(raw);

  if (!Array.isArray(data.cards)) {
    throw new Error('data/cards.json is missing cards array.');
  }

  const idx = data.cards.findIndex((c) => c.id === card.id);
  let action;
  if (idx >= 0) {
    data.cards[idx] = { ...data.cards[idx], ...card };
    action = 'updated';
  } else {
    data.cards.push(card);
    action = 'inserted';
  }

  data.lastVerified = lastVerified;

  await writeFile(CARDS_PATH, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await updateManifest('cards.json');
  return { action, id: card.id, totalCards: data.cards.length };
}

const invokedAsScript =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedAsScript) {
  const args = parseArgs(process.argv.slice(2));

  async function run() {
    if (args.help || (!args.file && !args.json)) {
      console.error(
        'Usage: node scripts/upsert-card.js (--file <card.json> | --json <jsonString>) [--last-verified "Nov 2026"]'
      );
      process.exit(args.help ? 0 : 1);
    }

    const card = args.file
      ? JSON.parse(await readFile(path.resolve(args.file), 'utf8'))
      : JSON.parse(args.json);

    const result = await upsertCard(card, {
      lastVerified: args['last-verified'] || formatMonthYear(),
    });
    console.log(
      `${result.action === 'updated' ? 'Updated' : 'Inserted'} card "${result.id}" in data/cards.json (total: ${result.totalCards}) and stamped data/manifest.json.`
    );
  }

  run().catch((err) => {
    console.error('Failed to upsert card:', err.message);
    process.exit(1);
  });
}
