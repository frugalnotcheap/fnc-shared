const MODAL_HOST_ID = 'fnc-bug-report-modal-host';

const MODAL_STYLES = `
  :host {
    all: initial;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    background: rgba(15, 23, 42, 0.55);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  .dialog {
    background: #ffffff;
    color: #0f172a;
    width: 100%;
    max-width: 460px;
    border-radius: 12px;
    box-shadow: 0 20px 40px rgba(15, 23, 42, 0.25);
    border: 1px solid #e2e8f0;
    overflow: hidden;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #e2e8f0;
  }
  .title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    line-height: 1.4;
  }
  .meta {
    margin: 2px 0 0;
    font-size: 12px;
    color: #64748b;
  }
  .close-btn {
    background: transparent;
    border: none;
    color: #64748b;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
  }
  .close-btn:hover,
  .close-btn:focus-visible {
    background: #f1f5f9;
    color: #0f172a;
    outline: none;
  }
  form {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
    font-weight: 500;
    color: #334155;
  }
  textarea {
    font-family: inherit;
    font-size: 14px;
    color: #0f172a;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 10px 12px;
    resize: vertical;
    min-height: 84px;
  }
  textarea:focus {
    outline: 2px solid #2563eb;
    outline-offset: 1px;
    border-color: #2563eb;
  }
  .status {
    font-size: 13px;
    padding: 10px 12px;
    border-radius: 8px;
    display: none;
  }
  .status.error {
    display: block;
    background: #fef2f2;
    color: #b91c1c;
    border: 1px solid #fecaca;
  }
  .status.success {
    display: block;
    background: #f0fdf4;
    color: #15803d;
    border: 1px solid #bbf7d0;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 4px;
  }
  button.secondary,
  button.primary {
    font-family: inherit;
    font-size: 14px;
    font-weight: 500;
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    border: 1px solid transparent;
  }
  button.secondary {
    background: #f8fafc;
    color: #334155;
    border-color: #cbd5e1;
  }
  button.secondary:hover {
    background: #f1f5f9;
  }
  button.primary {
    background: #0f172a;
    color: #ffffff;
  }
  button.primary:hover:not(:disabled) {
    background: #1e293b;
  }
  button.primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

/**
 * Injects a framework-agnostic, accessible bug report modal into the DOM.
 * Submits `{ appName, appVersion, description, steps, userAgent }` as JSON
 * to `${apiBaseUrl}/api/report-bug`.
 *
 * @param {import('./bugReporter.d.ts').BugReportModalOptions} options
 * @returns {import('./bugReporter.d.ts').BugReportModalHandle}
 */
export function openBugReportModal({ appName, appVersion, apiBaseUrl = '' }) {
  if (typeof document === 'undefined') {
    throw new Error('openBugReportModal requires a browser DOM environment.');
  }

  const existing = document.getElementById(MODAL_HOST_ID);
  if (existing) {
    existing.remove();
  }

  const previouslyFocused =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;

  const host = document.createElement('div');
  host.id = MODAL_HOST_ID;
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = MODAL_STYLES;

  const backdrop = document.createElement('div');
  backdrop.className = 'backdrop';

  const dialog = document.createElement('div');
  dialog.className = 'dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'fnc-bug-title');

  const header = document.createElement('div');
  header.className = 'header';

  const titleWrap = document.createElement('div');
  const title = document.createElement('h2');
  title.id = 'fnc-bug-title';
  title.className = 'title';
  title.textContent = 'Report a Bug';

  const meta = document.createElement('p');
  meta.className = 'meta';
  meta.textContent = `${appName} v${appVersion}`;

  titleWrap.append(title, meta);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'close-btn';
  closeBtn.setAttribute('aria-label', 'Close bug report dialog');
  closeBtn.textContent = '\u00d7';

  header.append(titleWrap, closeBtn);

  const form = document.createElement('form');

  const descLabel = document.createElement('label');
  descLabel.textContent = 'What went wrong?';
  const descInput = document.createElement('textarea');
  descInput.name = 'description';
  descInput.required = true;
  descInput.placeholder = 'Briefly describe the issue you encountered...';
  descLabel.append(descInput);

  const stepsLabel = document.createElement('label');
  stepsLabel.textContent = 'Steps to reproduce (optional)';
  const stepsInput = document.createElement('textarea');
  stepsInput.name = 'steps';
  stepsInput.placeholder = '1. Go to...\n2. Click...\n3. Observe...';
  stepsLabel.append(stepsInput);

  const statusEl = document.createElement('div');
  statusEl.className = 'status';
  statusEl.setAttribute('role', 'status');
  statusEl.setAttribute('aria-live', 'polite');

  const actions = document.createElement('div');
  actions.className = 'actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'secondary';
  cancelBtn.textContent = 'Cancel';

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'primary';
  submitBtn.textContent = 'Send Report';

  actions.append(cancelBtn, submitBtn);
  form.append(descLabel, stepsLabel, statusEl, actions);
  dialog.append(header, form);
  backdrop.append(dialog);
  shadow.append(style, backdrop);
  document.body.append(host);

  let isClosed = false;

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      close();
    }
  };

  function close() {
    if (isClosed) return;
    isClosed = true;
    document.removeEventListener('keydown', onKeyDown);
    host.remove();
    if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
      previouslyFocused.focus();
    }
  }

  document.addEventListener('keydown', onKeyDown);
  closeBtn.addEventListener('click', close);
  cancelBtn.addEventListener('click', close);
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) {
      close();
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const description = descInput.value.trim();
    const steps = stepsInput.value.trim();

    if (!description) {
      statusEl.className = 'status error';
      statusEl.textContent = 'Please describe the bug before submitting.';
      descInput.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    statusEl.className = 'status';
    statusEl.textContent = '';

    const normalizedBase = apiBaseUrl ? apiBaseUrl.replace(/\/+$/, '') : '';
    const endpoint = `${normalizedBase}/api/report-bug`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName,
          appVersion,
          description,
          steps,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      statusEl.className = 'status success';
      statusEl.textContent = 'Thank you! Your bug report has been sent.';
      submitBtn.textContent = 'Sent';
      setTimeout(close, 1200);
    } catch (err) {
      statusEl.className = 'status error';
      statusEl.textContent =
        err instanceof Error
          ? `Could not send report: ${err.message}`
          : 'Could not send report. Please try again.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Report';
    }
  });

  descInput.focus();

  return { close };
}
