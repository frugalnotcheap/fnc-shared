export interface BugReportModalOptions {
  appName: string;
  appVersion: string;
  apiBaseUrl?: string;
}

export interface BugReportPayload {
  appName: string;
  appVersion: string;
  description: string;
  steps: string;
  userAgent: string;
}

export interface BugReportModalHandle {
  close: () => void;
}

/**
 * Injects a framework-agnostic, accessible modal dialog into the DOM and POSTs
 * `{ appName, appVersion, description, steps, userAgent }` to `${apiBaseUrl}/api/report-bug`.
 */
export declare function openBugReportModal(
  options: BugReportModalOptions
): BugReportModalHandle;
