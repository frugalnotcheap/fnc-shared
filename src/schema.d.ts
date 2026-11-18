export type FilingStatus =
  | 'single'
  | 'married_filing_jointly'
  | 'married_filing_separately'
  | 'head_of_household'
  | 'qualifying_surviving_spouse';

export interface AccountTotals {
  cash: number;
  taxable: number;
  taxDeferred: number;
  taxFree: number;
  debt: number;
  [accountBucket: string]: number;
}

export interface HouseholdSummary {
  filingStatus: FilingStatus;
  birthYear: number | null;
  annualIncome: number;
  annualExpenses: number;
  accountTotals: AccountTotals;
  monthlyCategorySpend: Record<string, number>;
}

/**
 * Shared profile schema (`fnc-profile.v1.json`).
 * `household` strictly holds aggregated summaries (never raw transaction ledgers).
 */
export interface FncProfileV1 {
  schema: 'fnc-profile.v1.json';
  schemaVersion: 1;
  updatedAt?: string;
  household: HouseholdSummary;
  oracle?: Record<string, unknown>;
  retirement?: Record<string, unknown>;
  cardimizer?: Record<string, unknown>;
}

export interface ProfileValidationResult {
  valid: boolean;
  errors: string[];
}

export declare const PROFILE_SCHEMA_ID: 'fnc-profile.v1.json';
export declare const PROFILE_SCHEMA_VERSION: 1;
export declare const VALID_FILING_STATUSES: readonly FilingStatus[];
export declare const FORBIDDEN_LEDGER_KEYS: readonly string[];

export declare const FncProfileV1: Readonly<{
  schema: 'fnc-profile.v1.json';
  schemaVersion: 1;
  filingStatuses: readonly FilingStatus[];
  forbiddenLedgerKeys: readonly string[];
}>;

export declare function createEmptyProfile(): FncProfileV1;
export declare function validateProfile(data: unknown): ProfileValidationResult;
