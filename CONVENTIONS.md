# `fnc-shared` Conventions

`fnc-shared` is a lightweight, zero-build ES2022 module library shared across FNC applications.

## Core Source Rule: Plain `.js` + `.d.ts` Only

- Every module in `src/` **must** be written in plain ES2022 JavaScript (`.js`) paired with a matching TypeScript declaration file (`.d.ts`).
- Do **not** add `.ts`, `.tsx`, JSX, or bundler-specific syntax inside `src/`.
- This guarantees any Vite/JS/TS app, Node.js runtime, or browser WebContainer can import `fnc-shared` natively with zero build step.
- All relative imports inside `src/*.js` and `src/*.d.ts` must include explicit `.js` extensions (e.g. `export * from './schema.js'`).

---

## Exported Modules & API

All symbols are re-exported from `src/index.js` (`src/index.d.ts`).

### 1. `src/schema.js` (`src/schema.d.ts`)

Defines the shared `fnc-profile.v1.json` profile format.

- **`FncProfileV1`** (type & runtime descriptor):
  - `schema`: `'fnc-profile.v1.json'`
  - `schemaVersion`: `1`
  - `updatedAt?`: ISO-8601 timestamp string
  - `household`: Strictly aggregated household summary:
    - `filingStatus`: `'single' | 'married_filing_jointly' | 'married_filing_separately' | 'head_of_household' | 'qualifying_surviving_spouse'`
    - `birthYear`: `number | null`
    - `annualIncome`: `number`
    - `annualExpenses`: `number`
    - `accountTotals`: `{ cash, taxable, taxDeferred, taxFree, debt, [bucket: string]: number }`
    - `monthlyCategorySpend`: `Record<string, number>`
  - Optional app namespaces: `oracle?`, `retirement?`, `cardimizer?`
- **`createEmptyProfile(): FncProfileV1`**: Returns a fresh empty profile with default aggregated fields.
- **`validateProfile(data: unknown): { valid: boolean; errors: string[] }`**: Validates structure, types, and `schemaVersion`, and rejects raw transaction ledgers (`transactions`, `rawTransactions`, `ledger`, `transactionLedger`) inside `household`.
- **Constants**: `PROFILE_SCHEMA_ID`, `PROFILE_SCHEMA_VERSION`, `VALID_FILING_STATUSES`, `FORBIDDEN_LEDGER_KEYS`.

### 2. `src/handoff.js` (`src/handoff.d.ts`)

Cross-app profile handoff via URL hash fragments (`#fnc=...`).

- **`encodeProfileHash(profile: FncProfileV1): string`**:
  - Deep-clones and strips raw transaction arrays (`transactions`, `rawTransactions`, `ledger`, `transactionLedger`) before encoding.
  - Encodes as UTF-8 base64url prefixed with `#fnc=`.
  - Enforces a hard **16,000-character** limit (`MAX_HASH_PAYLOAD_CHARS`). If exceeded, throws `PayloadTooLargeError` instructing the UI to trigger a `.fnc.json` file download instead.
- **`decodeProfileHash(hash?: string): FncProfileV1 | null`**:
  - Reads `hash` (defaults to `globalThis.location?.hash ?? ''`), decodes `#fnc=...`, and returns the parsed profile or `null` if no `#fnc=` fragment is present.
- **`PayloadTooLargeError`**: Custom `Error` subclass with `actualLength` and `maxLength`.
- **Constants**: `HASH_PREFIX` (`'#fnc='`), `MAX_HASH_PAYLOAD_CHARS` (`16000`).

### 3. `src/bugReporter.js` (`src/bugReporter.d.ts`)

Framework-agnostic bug reporting dialog.

- **`openBugReportModal({ appName, appVersion, apiBaseUrl = '' }): { close: () => void }`**:
  - Injects an accessible, Shadow DOM-isolated modal dialog into `document.body`.
  - POSTs `{ appName, appVersion, description, steps, userAgent }` as JSON to `${apiBaseUrl}/api/report-bug` (Cloudflare Pages Function + Resend).
  - Supports configurable `apiBaseUrl` for Capacitor/Android compatibility.

### 4. `src/dataLoader.js` (`src/dataLoader.d.ts`)

Stale-While-Revalidate dataset loader with instant cache-busting.

- **`fetchSharedDataset<T>(filename, { expectedSchemaVersion = 1, fallbackData = null, onUpdate = null } = {}): T | null`**:
  1. Immediately reads `localStorage` under `fnc_cache_${filename}` (or returns `fallbackData` if missing/mismatched) for 0ms offline/online startup.
  2. Simultaneously fetches `data/manifest.json` from jsDelivr with `{ cache: 'no-store' }` to get the latest Unix timestamp for `filename`, then fetches `${filename}?v=${timestamp}`.
  3. Verifies `remoteData.schemaVersion === expectedSchemaVersion` before saving to `localStorage` and calling `onUpdate(remoteData)`.
- **Constants**: `CDN_BASE_URL`.

---

## `schemaVersion` Rules

1. Every shared JSON file in `data/` **must** include an integer `schemaVersion` field at the top level (starting at `1`).
2. Backward-compatible additions (new optional fields, updated numeric values) keep the same `schemaVersion`.
3. Breaking changes (renaming/removing fields, changing types) **must** increment `schemaVersion`.
4. `fetchSharedDataset` strictly checks `remoteData.schemaVersion === expectedSchemaVersion` and silently ignores mismatched remote payloads so breaking schema edits never crash live apps.

---

## Updating `data/manifest.json`

Whenever any script in `scripts/*.js` creates or modifies a JSON file in `data/`, it **must** call `updateManifest` from `scripts/update-manifest.js` to stamp `data/manifest.json` with the current Unix timestamp:

```js
import { updateManifest } from './update-manifest.js';

await updateManifest('tax-brackets.json');
```

Or via CLI:

```bash
node scripts/update-manifest.js tax-brackets.json
```
