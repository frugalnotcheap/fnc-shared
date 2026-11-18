import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { updateManifest } from './update-manifest.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FEDERAL_PATH = path.resolve(__dirname, '../data/federal-tax-laws.json');
const STATE_PATH = path.resolve(__dirname, '../data/state-tax-laws.json');

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

function deepMerge(target, source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return source;
  }
  const out = target && typeof target === 'object' && !Array.isArray(target) ? { ...target } : {};
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = deepMerge(out[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Merges a patch object into `data/federal-tax-laws.json` under `lawsByYear[year]`
 * and stamps `data/manifest.json`.
 *
 * @param {string | number} year
 * @param {Record<string, unknown>} patch
 * @param {{ cloneFrom?: string | number }} [options]
 */
export async function updateFederalTaxYear(year, patch, { cloneFrom } = {}) {
  const yearKey = String(year);
  const raw = await readFile(FEDERAL_PATH, 'utf8');
  const data = JSON.parse(raw);

  if (!data.lawsByYear || typeof data.lawsByYear !== 'object') {
    throw new Error('data/federal-tax-laws.json is missing lawsByYear.');
  }

  let base = data.lawsByYear[yearKey];
  if (!base && cloneFrom !== undefined) {
    const sourceYear = data.lawsByYear[String(cloneFrom)];
    if (!sourceYear) {
      throw new Error(`Cannot clone from year ${cloneFrom}: not found in lawsByYear.`);
    }
    base = structuredClone(sourceYear);
  }

  data.lawsByYear[yearKey] = deepMerge(base ?? { year: Number(yearKey) }, {
    ...patch,
    year: Number(yearKey),
  });

  await writeFile(FEDERAL_PATH, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await updateManifest('federal-tax-laws.json');
  return data.lawsByYear[yearKey];
}

/**
 * Merges a patch object into `data/state-tax-laws.json` under `states[stateCode]`
 * and stamps `data/manifest.json`.
 *
 * @param {string} stateCode - Two-letter state code (e.g. "CA", "NY").
 * @param {Record<string, unknown>} patch
 * @param {{ asOfYear?: number }} [options]
 */
export async function updateStateTaxLaw(stateCode, patch, { asOfYear } = {}) {
  const code = stateCode.toUpperCase();
  const raw = await readFile(STATE_PATH, 'utf8');
  const data = JSON.parse(raw);

  if (!data.states || typeof data.states !== 'object') {
    throw new Error('data/state-tax-laws.json is missing states.');
  }

  if (asOfYear !== undefined) {
    data.asOfYear = asOfYear;
  }

  const existing = data.states[code] ?? { code };
  data.states[code] = deepMerge(existing, {
    ...patch,
    code,
    ...(asOfYear !== undefined ? { asOfYear } : {}),
  });

  await writeFile(STATE_PATH, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await updateManifest('state-tax-laws.json');
  return data.states[code];
}

const invokedAsScript =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedAsScript) {
  const args = parseArgs(process.argv.slice(2));

  async function run() {
    if (args.help || (!args.federal && !args.state)) {
      console.error(
        'Usage:\n' +
          '  Federal: node scripts/update-taxes.js --federal --year <YYYY> [--clone-from <YYYY>] (--file <patch.json> | --json <json>)\n' +
          '  State:   node scripts/update-taxes.js --state <XX> [--as-of-year <YYYY>] (--file <patch.json> | --json <json>)'
      );
      process.exit(args.help ? 0 : 1);
    }

    let patch = {};
    if (args.file) {
      patch = JSON.parse(await readFile(path.resolve(args.file), 'utf8'));
    } else if (args.json) {
      patch = JSON.parse(args.json);
    } else {
      throw new Error('Provide either --file <patch.json> or --json <jsonString>.');
    }

    if (args.federal) {
      if (!args.year) {
        throw new Error('--year <YYYY> is required with --federal.');
      }
      await updateFederalTaxYear(args.year, patch, {
        cloneFrom: args['clone-from'],
      });
      console.log(
        `Updated federal-tax-laws.json for year ${args.year} and stamped data/manifest.json.`
      );
    } else if (args.state) {
      const asOfYear = args['as-of-year'] ? Number(args['as-of-year']) : undefined;
      await updateStateTaxLaw(String(args.state), patch, { asOfYear });
      console.log(
        `Updated state-tax-laws.json for ${String(args.state).toUpperCase()} and stamped data/manifest.json.`
      );
    }
  }

  run().catch((err) => {
    console.error('Failed to update tax laws:', err.message);
    process.exit(1);
  });
}
