// Module imports: use the canonical validation/qualification helpers from src/qualify.js
// This centralizes the business rules so server and client can share the same logic.
import { validateAllFields, validateField, qualifyApplicant } from '../../src/qualify.js';

const FIELD_ERROR_CLASS = 'field-error-message';
// Ordered list of fields to display in validation results table
const FIELD_ORDER = ['email','emailConfirm','firstName','lastName','city','state','zip','grossIncome','ssnLast4','consent','requestedAmount'];
const FIELD_LABELS = {
  email: 'Email',
  emailConfirm: 'Confirm email',
  firstName: 'First name',
  lastName: 'Last name',
  city: 'City',
  state: 'State',
  zip: 'ZIP',
  grossIncome: 'Gross income (USD)',
  ssnLast4: 'Last 4 of SSN',
  consent: 'Consent to process',
  requestedAmount: 'Requested amount'
};
// ---------- UI helpers (DOM updates) ----------

/** Create a DOM node to show an inline field error. */
function createErrorNode(message) {
  const node = document.createElement('div');
  node.className = FIELD_ERROR_CLASS;
  node.style.color = 'var(--danger)';
  node.style.fontSize = '0.9rem';
  node.textContent = message;
  return node;
}

/** Remove inline error nodes and aria-invalid attributes inside the form. */
function clearFieldErrors(form) {
  form.querySelectorAll(`.${FIELD_ERROR_CLASS}`).forEach((n) => n.remove());
  form.querySelectorAll('[aria-invalid="true"]').forEach((el) => el.removeAttribute('aria-invalid'));
}

/** Collect form input values into a plain object. */
function collectFormData(form) {
  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());
  data.consent = !!form.querySelector('#consent') && form.querySelector('#consent').checked;
  return data;
}

/** Render the decision banner/area on the page using a styled div for accessibility. */
function renderDecision(result) {
  const el = document.getElementById('decision-result');
  if (!el) return;
  el.hidden = false;
  // Clear prior classes and content
  el.className = '';
  el.innerHTML = '';

  // Build content: inline SVG icon + two-line content
  if (result.decision === 'approved') {
    el.classList.add('decision-banner', 'decision-banner--approved');
    el.setAttribute('role', 'status');
    el.setAttribute('tabindex', '-1');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="10" fill="#10b981" opacity="0.12"/>
        <path d="M7 13l3 3 7-7" stroke="#047857" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <div class="decision-content">
        <div class="decision-title">Approved</div>
        <div class="decision-sub">Credit line: <span class="decision-amount">$${(result.creditAmount || 0).toLocaleString()}</span></div>
      </div>
    `;
  } else {
    el.classList.add('decision-banner', 'decision-banner--declined');
    el.setAttribute('role', 'status');
    el.setAttribute('tabindex', '-1');
    el.setAttribute('aria-live', 'polite');
    const reasonText = result.reason ? result.reason.replace(/_/g, ' ') : 'Not eligible.';
    el.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="10" fill="#f43f5e" opacity="0.08"/>
        <path d="M15 9L9 15M9 9l6 6" stroke="#b91c1c" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <div class="decision-content">
        <div class="decision-title">Declined</div>
        <div class="decision-sub">${escapeHtml(reasonText)}</div>
        <ul class="decision-alternatives">
          <li>Consider requesting a smaller credit amount and re-applying.</li>
          <li>Try again later after updating your income information or savings.</li>
          <li>See our <a href="index.html#faq">FAQ</a> or <a href="mailto:sales@titancoffeerun.example">contact support</a> for other options.</li>
        </ul>
      </div>
    `;
  }

  // Move focus to the banner so assistive tech announces it. Keep tabindex so it's focusable momentarily.
  // Use setTimeout to ensure DOM updates take effect before focusing.
  setTimeout(() => {
    try { el.focus(); } catch (e) { /* ignore focus failures */ }
    // remove tabindex after short time so banner isn't in tab order permanently
    setTimeout(() => el.removeAttribute('tabindex'), 1200);
  }, 40);
}

/** Escape HTML for safe insertion into table cells. */
function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

/** Render the errors table body given an array of error objects. */
function renderErrorsTable(errors) {
  const tbody = document.querySelector('#errors-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const now = new Date().toLocaleString();
  errors.forEach((err) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="padding:.5rem;border-top:1px solid #eee">${escapeHtml(err.field)}</td>
      <td style="padding:.5rem;border-top:1px solid #eee">${escapeHtml(err.message)}</td>
      <td style="padding:.5rem;border-top:1px solid #eee">${now}</td>
    `;
    tbody.appendChild(tr);
  });
}

/** Format a field value for display in the results table. Masks sensitive fields. */
function formatValueForField(field, raw) {
  if (field === 'grossIncome' || field === 'requestedAmount') {
    if (raw === undefined || raw === '' || raw === null) return 'Not provided';
    const n = Number(raw);
    if (!Number.isFinite(n)) return escapeHtml(String(raw));
    return '$' + n.toLocaleString();
  }
  if (field === 'consent') {
    return raw ? 'Yes' : 'No';
  }
  if (field === 'ssnLast4') {
    if (!raw) return 'Not provided';
    return '•••• ' + escapeHtml(String(raw).slice(-4));
  }
  if (raw === undefined || raw === null || String(raw).trim() === '') return 'Not provided';
  return escapeHtml(String(raw));
}

/** Render a combined validation-results table showing valid/invalid rows. */
function renderValidationResults(form, data = {}, errors = []) {
  const tbody = document.querySelector('#errors-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const now = new Date().toLocaleString();
  const errorMap = {};
  (errors || []).forEach((e) => { errorMap[e.field] = e.message; });

  FIELD_ORDER.forEach((fieldId) => {
    const tr = document.createElement('tr');
    const labelCell = document.createElement('td');
    labelCell.style.padding = '.5rem';
    labelCell.style.borderTop = '1px solid #eee';
    labelCell.textContent = FIELD_LABELS[fieldId] || fieldId;

    const valueCell = document.createElement('td');
    valueCell.style.padding = '.5rem';
    valueCell.style.borderTop = '1px solid #eee';

    const statusCell = document.createElement('td');
    statusCell.style.padding = '.5rem';
    statusCell.style.borderTop = '1px solid #eee';

    const err = errorMap[fieldId];
    if (err) {
      tr.classList.add('validation-row--invalid');
      valueCell.textContent = err;
      statusCell.textContent = 'Invalid';
      statusCell.setAttribute('aria-label', 'Invalid');
    } else {
      const raw = data[fieldId];
      valueCell.textContent = formatValueForField(fieldId, raw);
      tr.classList.add('validation-row--valid');
      statusCell.textContent = 'Valid';
      statusCell.setAttribute('aria-label', 'Valid');
    }

    // timestamp column for context
    const timeCell = document.createElement('td');
    timeCell.style.padding = '.5rem';
    timeCell.style.borderTop = '1px solid #eee';
    timeCell.textContent = now;

    tr.appendChild(labelCell);
    tr.appendChild(valueCell);
    tr.appendChild(statusCell);
    tr.appendChild(timeCell);
    tbody.appendChild(tr);
  });
}

/** Export the errors array as a CSV and trigger download. */
function exportErrorsCsv(errors) {
  if (!errors || !errors.length) return;
  const rows = [['field', 'message', 'when']];
  const now = new Date().toLocaleString();
  errors.forEach((e) => rows.push([e.field, e.message, now]));
  const csv = rows
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'validation_errors.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------- Page behavior: event handlers and wiring ----------
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('credit-application-form');
  const summaryEl = document.getElementById('validation-summary');
  const errorsStore = [];
  let latestData = {};
  let latestErrors = [];

  if (!form) return;

  /** Show or hide the summary area with a list of errors. */
  function showSummary(errors) {
    if (!summaryEl) return;
    if (!errors || !errors.length) {
      summaryEl.hidden = true;
      summaryEl.innerHTML = '';
      return;
    }
    summaryEl.hidden = false;
    summaryEl.innerHTML = '<h4>Please correct the following errors:</h4><ul>' +
      errors.map((e) => `<li>${escapeHtml(e.field)}: ${escapeHtml(e.message)}</li>`).join('') +
      '</ul>';
  }

  /** Handle the form submit: validate, show errors or show decision. */
  function onSubmit(event) {
    event.preventDefault();
    clearFieldErrors(form);
    const data = collectFormData(form);
    const errors = validateAllFields(data);

    if (errors.length) {
      showSummary(errors);
      // store latest snapshot and render combined results (valid + invalid)
      latestData = data;
      latestErrors = errors;
      renderValidationResults(form, data, errors);
      // keep a copy for backward-compatible export/print behavior
      errorsStore.length = 0;
      errors.forEach((e) => errorsStore.push(e));

      // show inline errors and focus the first invalid field
      const firstSelector = `#${errors[0].field}`;
      errors.forEach((err) => {
        const fieldEl = form.querySelector(`#${err.field}`);
        if (fieldEl) {
          fieldEl.setAttribute('aria-invalid', 'true');
          const node = createErrorNode(err.message);
          (fieldEl.closest('.form-row') || fieldEl.parentNode).appendChild(node);
        }
      });
      const first = form.querySelector(firstSelector);
      if (first && typeof first.focus === 'function') first.focus();
      return;
    }

  // valid: clear summary/data store and show decision
  showSummary([]);
  latestData = data;
  latestErrors = [];
  renderValidationResults(form, data, []);
  errorsStore.length = 0;
  const result = qualifyApplicant(data);
  renderDecision(result);
  }

  form.addEventListener('submit', onSubmit);

  // Per-field blur/change validation to keep the UX responsive
  const blurFields = ['email','emailConfirm','firstName','lastName','city','state','zip','grossIncome','ssnLast4','consent'];
  blurFields.forEach((fieldName) => {
    const el = form.querySelector(`#${fieldName}`);
    if (!el) return;

    function onFieldValidate() {
      const data = collectFormData(form);
      const err = validateField(fieldName, data);

      // Clear existing inline errors for this field
      const parent = el.closest('.form-row') || el.parentNode;
      parent.querySelectorAll(`.${FIELD_ERROR_CLASS}`).forEach((n) => n.remove());
      el.removeAttribute('aria-invalid');

      if (err) {
        el.setAttribute('aria-invalid', 'true');
        parent.appendChild(createErrorNode(err.message));
      }

  const all = validateAllFields(data);
  latestData = data;
  latestErrors = all;
  showSummary(all);
  renderValidationResults(form, data, all);
  errorsStore.length = 0;
  all.forEach((e) => errorsStore.push(e));
    }

    if (el.type === 'checkbox' || el.tagName === 'SELECT') {
      el.addEventListener('change', onFieldValidate);
    } else {
      el.addEventListener('blur', onFieldValidate);
    }
  });

  // Export / print / clear buttons wiring
  const exportBtn = document.getElementById('exportErrorsBtn');
  if (exportBtn) exportBtn.addEventListener('click', () => exportValidationCsv(latestData, latestErrors));

  const printBtn = document.getElementById('printErrorsBtn');
  if (printBtn) printBtn.addEventListener('click', () => {
    const tbl = document.getElementById('errors-table');
    if (!tbl) return;
    const w = window.open('', '_blank');
    w.document.write('<html><head><title>Validation errors</title></head><body>');
    w.document.write(tbl.outerHTML);
    w.document.write('</body></html>');
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 200);
  });

  const clearBtn = document.getElementById('clearErrorsBtn');
  if (clearBtn) clearBtn.addEventListener('click', () => {
    const tbody = document.querySelector('#errors-table tbody');
    if (tbody) tbody.innerHTML = '';
    errorsStore.length = 0;
    latestData = {};
    latestErrors = [];
    if (summaryEl) { summaryEl.hidden = true; summaryEl.innerHTML = ''; }
    clearFieldErrors(form);
  });

  // Reset handler: ensure UI is cleared after form reset
  form.addEventListener('reset', () => {
    setTimeout(() => {
      // Clear inline field errors and validation summary/table
      clearFieldErrors(form);
      if (summaryEl) { summaryEl.hidden = true; summaryEl.innerHTML = ''; }
      const tbody = document.querySelector('#errors-table tbody');
      if (tbody) tbody.innerHTML = '';
      errorsStore.length = 0;
      latestData = {};
      latestErrors = [];

      // Hide and clear the decision banner, remove ARIA attributes so it's not announced
      const decisionEl = document.getElementById('decision-result');
      if (decisionEl) {
        decisionEl.hidden = true;
        decisionEl.className = '';
        decisionEl.innerHTML = '';
        decisionEl.removeAttribute('role');
        decisionEl.removeAttribute('aria-live');
        decisionEl.removeAttribute('tabindex');
      }

      // Return focus to the first focusable control in the form
      const firstControl = form.querySelector('input, select, textarea, button');
      if (firstControl && typeof firstControl.focus === 'function') firstControl.focus();
    }, 0);
  });
});

/** Export combined validation results (valid + invalid rows) as CSV */
function exportValidationCsv(data = {}, errors = []) {
  const rows = [[ 'field', 'label', 'status', 'value_or_message', 'when' ]];
  const now = new Date().toLocaleString();
  const errorMap = {};
  (errors || []).forEach((e) => { errorMap[e.field] = e.message; });
  FIELD_ORDER.forEach((fieldId) => {
    const label = FIELD_LABELS[fieldId] || fieldId;
    const err = errorMap[fieldId];
    const status = err ? 'Invalid' : 'Valid';
    const value = err ? err : formatValueForField(fieldId, data[fieldId]);
    rows.push([fieldId, label, status, value, now]);
  });
  const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'validation_results.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
