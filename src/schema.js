export const PROFILE_SCHEMA_ID = 'fnc-profile.v1.json';
export const PROFILE_SCHEMA_VERSION = 1;

export const VALID_FILING_STATUSES = Object.freeze([
  'single',
  'married_filing_jointly',
  'married_filing_separately',
  'head_of_household',
  'qualifying_surviving_spouse',
]);

export const FORBIDDEN_LEDGER_KEYS = Object.freeze([
  'transactions',
  'rawTransactions',
  'ledger',
  'transactionLedger',
]);

/**
 * Runtime schema descriptor for `fnc-profile.v1.json`.
 */
export const FncProfileV1 = Object.freeze({
  schema: PROFILE_SCHEMA_ID,
  schemaVersion: PROFILE_SCHEMA_VERSION,
  filingStatuses: VALID_FILING_STATUSES,
  forbiddenLedgerKeys: FORBIDDEN_LEDGER_KEYS,
});

/**
 * Creates a fresh, empty FncProfileV1 object with aggregated household summaries.
 *
 * @returns {import('./schema.d.ts').FncProfileV1}
 */
export function createEmptyProfile() {
  return {
    schema: PROFILE_SCHEMA_ID,
    schemaVersion: PROFILE_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    household: {
      filingStatus: 'single',
      birthYear: null,
      annualIncome: 0,
      annualExpenses: 0,
      accountTotals: {
        cash: 0,
        taxable: 0,
        taxDeferred: 0,
        taxFree: 0,
        debt: 0,
      },
      monthlyCategorySpend: {},
    },
  };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Validates an unknown value against the FncProfileV1 schema.
 * Rejects raw transaction ledgers inside `household` to keep profiles strictly aggregated.
 *
 * @param {unknown} data
 * @returns {import('./schema.d.ts').ProfileValidationResult}
 */
export function validateProfile(data) {
  const errors = [];

  if (!isPlainObject(data)) {
    return { valid: false, errors: ['Profile must be a non-null plain object.'] };
  }

  if (data.schema !== PROFILE_SCHEMA_ID) {
    errors.push(`Invalid schema: expected "${PROFILE_SCHEMA_ID}".`);
  }

  if (data.schemaVersion !== PROFILE_SCHEMA_VERSION) {
    errors.push(`Invalid schemaVersion: expected ${PROFILE_SCHEMA_VERSION}.`);
  }

  if (data.updatedAt !== undefined && typeof data.updatedAt !== 'string') {
    errors.push('updatedAt must be an ISO-8601 string when provided.');
  }

  if (!isPlainObject(data.household)) {
    errors.push('household must be a plain object.');
  } else {
    const h = data.household;

    for (const forbidden of FORBIDDEN_LEDGER_KEYS) {
      if (forbidden in h) {
        errors.push(
          `household must contain aggregated summaries only; forbidden key "${forbidden}" found.`
        );
      }
    }

    if (
      typeof h.filingStatus !== 'string' ||
      !VALID_FILING_STATUSES.includes(h.filingStatus)
    ) {
      errors.push(
        `household.filingStatus must be one of: ${VALID_FILING_STATUSES.join(', ')}.`
      );
    }

    if (
      h.birthYear !== null &&
      (!Number.isInteger(h.birthYear) || h.birthYear < 1900 || h.birthYear > 2100)
    ) {
      errors.push('household.birthYear must be null or an integer between 1900 and 2100.');
    }

    if (!isFiniteNumber(h.annualIncome) || h.annualIncome < 0) {
      errors.push('household.annualIncome must be a non-negative finite number.');
    }

    if (!isFiniteNumber(h.annualExpenses) || h.annualExpenses < 0) {
      errors.push('household.annualExpenses must be a non-negative finite number.');
    }

    if (!isPlainObject(h.accountTotals)) {
      errors.push('household.accountTotals must be a plain object.');
    } else {
      for (const [key, val] of Object.entries(h.accountTotals)) {
        if (!isFiniteNumber(val)) {
          errors.push(`household.accountTotals.${key} must be a finite number.`);
        }
      }
    }

    if (!isPlainObject(h.monthlyCategorySpend)) {
      errors.push('household.monthlyCategorySpend must be a plain object.');
    } else {
      for (const [category, amount] of Object.entries(h.monthlyCategorySpend)) {
        if (!isFiniteNumber(amount) || amount < 0) {
          errors.push(
            `household.monthlyCategorySpend.${category} must be a non-negative finite number.`
          );
        }
      }
    }
  }

  for (const namespace of ['oracle', 'retirement', 'cardimizer']) {
    if (data[namespace] !== undefined && !isPlainObject(data[namespace])) {
      errors.push(`Optional namespace "${namespace}" must be a plain object when provided.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
