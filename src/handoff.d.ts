import type { FncProfileV1 } from './schema.js';

export declare const HASH_PREFIX: '#fnc=';
export declare const MAX_HASH_PAYLOAD_CHARS: 16000;

export declare class PayloadTooLargeError extends Error {
  readonly actualLength: number;
  readonly maxLength: number;
  constructor(actualLength: number, maxLength?: number);
}

/**
 * Encodes a profile into a `#fnc=...` URL hash fragment.
 * Strips raw transaction arrays before encoding.
 * Throws `PayloadTooLargeError` if the encoded fragment exceeds 16,000 characters.
 */
export declare function encodeProfileHash(profile: FncProfileV1): string;

/**
 * Decodes a `#fnc=...` URL hash fragment back into an `FncProfileV1` object.
 * Returns `null` if no `#fnc=` fragment is present.
 */
export declare function decodeProfileHash(hash?: string): FncProfileV1 | null;
