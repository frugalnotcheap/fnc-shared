export interface VersionedDataset {
  schemaVersion: number;
  [key: string]: unknown;
}

export interface FetchSharedDatasetOptions<T extends VersionedDataset = VersionedDataset> {
  expectedSchemaVersion?: number;
  fallbackData?: T | null;
  onUpdate?: ((remoteData: T) => void) | null;
}

export declare const CDN_BASE_URL: string;

/**
 * Loads a shared dataset using Stale-While-Revalidate + manifest cache-busting.
 * Returns cached `localStorage` data (or `fallbackData`) synchronously in 0ms,
 * while revalidating in the background and calling `onUpdate(remoteData)` when
 * `remoteData.schemaVersion === expectedSchemaVersion`.
 */
export declare function fetchSharedDataset<T extends VersionedDataset = VersionedDataset>(
  filename: string,
  options?: FetchSharedDatasetOptions<T>
): T | null;
