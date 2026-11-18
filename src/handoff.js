import { FORBIDDEN_LEDGER_KEYS } from './schema.js';

export const HASH_PREFIX = '#fnc=';
export const MAX_HASH_PAYLOAD_CHARS = 16000;

/**
 * Thrown when an encoded profile hash exceeds the 16 KB (16,000-character) safety limit.
 * Callers should catch this error and prompt the user to download a `.fnc.json` file instead.
 */
export class PayloadTooLargeError extends Error {
  /**
   * @param {number} actualLength
   * @param {number} [maxLength]
   */
  constructor(actualLength, maxLength = MAX_HASH_PAYLOAD_CHARS) {
    super(
      `Encoded profile hash is ${actualLength} characters, exceeding the ${maxLength}-character ` +
        `URL fragment safety limit. Trigger a .fnc.json file download instead.`
    );
    this.name = 'PayloadTooLargeError';
    this.actualLength = actualLength;
    this.maxLength = maxLength;
  }
}

/**
 * Recursively strips raw transaction arrays from a cloned profile object so they
 * are never serialized into a URL hash fragment.
 *
 * @param {unknown} value
 * @returns {unknown}
 */
function stripRawTransactions(value) {
  if (Array.isArray(value)) {
    return value.map(stripRawTransactions);
  }
  if (value !== null && typeof value === 'object') {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      if (FORBIDDEN_LEDGER_KEYS.includes(key) && Array.isArray(val)) {
        continue;
      }
      out[key] = stripRawTransactions(val);
    }
    return out;
  }
  return value;
}

/**
 * Encodes a UTF-8 string into URL-safe base64 (base64url without padding).
 * Works in browsers, WebContainers, and Node.js.
 *
 * @param {string} text
 * @returns {string}
 */
function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decodes a base64url string back into a UTF-8 string.
 *
 * @param {string} base64url
 * @returns {string}
 */
function fromBase64Url(base64url) {
  const padded = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + '='.repeat(padLength));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Encodes a profile into a `#fnc=...` URL hash fragment.
 * Strips raw transaction arrays before encoding and enforces a hard 16,000-character limit.
 *
 * @param {import('./schema.d.ts').FncProfileV1} profile
 * @returns {string}
 * @throws {PayloadTooLargeError}
 */
export function encodeProfileHash(profile) {
  const sanitized = stripRawTransactions(profile);
  const json = JSON.stringify(sanitized);
  const encoded = `${HASH_PREFIX}${toBase64Url(json)}`;

  if (encoded.length > MAX_HASH_PAYLOAD_CHARS) {
    throw new PayloadTooLargeError(encoded.length, MAX_HASH_PAYLOAD_CHARS);
  }

  return encoded;
}

/**
 * Decodes a `#fnc=...` URL hash fragment back into a profile object.
 * Returns `null` if no `#fnc=` fragment is present.
 *
 * @param {string} [hash] - Optional hash string; defaults to `globalThis.location?.hash ?? ''`.
 * @returns {import('./schema.d.ts').FncProfileV1 | null}
 */
export function decodeProfileHash(hash = globalThis.location?.hash ?? '') {
  if (typeof hash !== 'string' || !hash) {
    return null;
  }

  const normalized = hash.startsWith('#') ? hash : `#${hash}`;
  const prefixIndex = normalized.indexOf(HASH_PREFIX);
  if (prefixIndex === -1) {
    return null;
  }

  const payloadStart = prefixIndex + HASH_PREFIX.length;
  const ampIndex = normalized.indexOf('&', payloadStart);
  const rawPayload =
    ampIndex === -1
      ? normalized.slice(payloadStart)
      : normalized.slice(payloadStart, ampIndex);

  if (!rawPayload) {
    return null;
  }

  const json = fromBase64Url(rawPayload);
  return JSON.parse(json);
}
