import crypto from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { updateManifest } from './update-manifest.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RETURNS_PATH = path.resolve(__dirname, '../data/historical-returns.json');

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

/**
 * Appends or updates an annual `[year, stock, bond, cash, inflation]` tuple
 * in `data/historical-returns.json`, updates `period` and `checksum`,
 * and stamps `data/manifest.json`.
 *
 * @param {{ year: number, stock: number, bond: number, cash: number, inflation: number }} entry
 */
export async function upsertAnnualReturn({ year, stock, bond, cash, inflation }) {
  const values = { year, stock, bond, cash, inflation };
  for (const [k, v] of Object.entries(values)) {
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      throw new Error(`Invalid numeric value for ${k}: ${v}`);
    }
  }
  if (!Number.isInteger(year)) {
    throw new Error(`year must be an integer, received ${year}`);
  }

  const raw = await readFile(RETURNS_PATH, 'utf8');
  const data = JSON.parse(raw);

  if (!Array.isArray(data.annualTuples)) {
    throw new Error('data/historical-returns.json is missing annualTuples array.');
  }

  const tuple = [year, stock, bond, cash, inflation];
  const existingIdx = data.annualTuples.findIndex((row) => row[0] === year);
  if (existingIdx >= 0) {
    data.annualTuples[existingIdx] = tuple;
  } else {
    data.annualTuples.push(tuple);
    data.annualTuples.sort((a, b) => a[0] - b[0]);
  }

  const firstYear = data.annualTuples[0][0];
  const lastYear = data.annualTuples[data.annualTuples.length - 1][0];
  data.period = `${firstYear}-${lastYear}`;
  data.checksum = crypto
    .createHash('sha256')
    .update(JSON.stringify(data.annualTuples))
    .digest('hex');

  await writeFile(RETURNS_PATH, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await updateManifest('historical-returns.json');
  return data;
}

const invokedAsScript =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedAsScript) {
  const args = parseArgs(process.argv.slice(2));
  if (
    args.help ||
    args.year === undefined ||
    args.stock === undefined ||
    args.bond === undefined ||
    args.cash === undefined ||
    args.inflation === undefined
  ) {
    console.error(
      'Usage: node scripts/update-returns.js --year <YYYY> --stock <num> --bond <num> --cash <num> --inflation <num>\n' +
        'Example: node scripts/update-returns.js --year 2025 --stock 0.142 --bond 0.041 --cash 0.045 --inflation 0.026'
    );
    process.exit(args.help ? 0 : 1);
  }

  upsertAnnualReturn({
    year: Number(args.year),
    stock: Number(args.stock),
    bond: Number(args.bond),
    cash: Number(args.cash),
    inflation: Number(args.inflation),
  })
    .then((data) => {
      console.log(
        `Updated data/historical-returns.json (period: ${data.period}, tuples: ${data.annualTuples.length}) and stamped data/manifest.json.`
      );
    })
    .catch((err) => {
      console.error('Failed to update historical-returns.json:', err.message);
      process.exit(1);
    });
}
