export const CDN_BASE_URL =
  'https://cdn.jsdelivr.net/gh/frugalnotcheap/fnc-shared@main/data';

const CACHE_KEY_PREFIX = 'fnc_cache_';

function readCachedDataset(cacheKey, expectedSchemaVersion) {
  try {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    const raw = localStorage.getItem(cacheKey);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (parsed && parsed.schemaVersion === expectedSchemaVersion) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function writeCachedDataset(cacheKey, data) {
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(cacheKey, JSON.stringify(data));
  } catch {
    // Ignore storage quota or private-mode errors.
  }
}

/**
 * Loads a shared JSON dataset using Stale-While-Revalidate + instant cache-busting:
 * 1. Immediately returns cached JSON from `localStorage` under `fnc_cache_${filename}`
 *    (or `fallbackData` if empty) so the app loads in 0ms offline or online.
 * 2. Simultaneously fetches `data/manifest.json` with `{ cache: 'no-store' }` to resolve
 *    the latest timestamp for `filename`, then fetches `${filename}?v=${timestamp}`.
 * 3. Verifies `remoteData.schemaVersion === expectedSchemaVersion` before saving to
 *    `localStorage` and calling `onUpdate(remoteData)`.
 *
 * @template T
 * @param {string} filename
 * @param {import('./dataLoader.d.ts').FetchSharedDatasetOptions<T>} [options]
 * @returns {T | null}
 */
export function fetchSharedDataset(
  filename,
  { expectedSchemaVersion = 1, fallbackData = null, onUpdate = null } = {}
) {
  const normalizedFilename = filename.replace(/^\/+/, '');
  const cacheKey = `${CACHE_KEY_PREFIX}${normalizedFilename}`;

  const cached = readCachedDataset(cacheKey, expectedSchemaVersion);
  const initialData = cached ?? fallbackData;

  if (typeof fetch === 'function') {
    (async () => {
      try {
        const manifestRes = await fetch(`${CDN_BASE_URL}/manifest.json`, {
          cache: 'no-store',
        });
        if (!manifestRes.ok) {
          return;
        }
        const manifest = await manifestRes.json();
        const timestamp =
          manifest && typeof manifest === 'object'
            ? manifest[normalizedFilename]
            : undefined;

        const datasetUrl =
          timestamp !== undefined
            ? `${CDN_BASE_URL}/${normalizedFilename}?v=${encodeURIComponent(String(timestamp))}`
            : `${CDN_BASE_URL}/${normalizedFilename}`;

        const dataRes = await fetch(datasetUrl);
        if (!dataRes.ok) {
          return;
        }
        const remoteData = await dataRes.json();

        if (!remoteData || remoteData.schemaVersion !== expectedSchemaVersion) {
          return;
        }

        writeCachedDataset(cacheKey, remoteData);

        if (typeof onUpdate === 'function') {
          onUpdate(remoteData);
        }
      } catch {
        // Offline or transient network error; cached/fallback data remains active.
      }
    })();
  }

  return initialData;
}
