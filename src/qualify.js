/*
  src/qualify.js
  ----------------
  Current role (repository simplified for a class demo / static hosting):

  This file intentionally contains two closely related concerns so the demo
  remains tiny and easy for students to run from GitHub Pages (no server
  required):

  1) Canonical validation & business-rule helpers (pure, named exports).
     - These functions are meant to be deterministic and easy to unit-test.
     - Examples: isEmail, matchEmails, isSSNLast4, validateFields, validateAllFields.

  2) A very small page-facing wiring block used by `apply.html` to demonstrate
     the rules in-browser. The DOM wiring is deliberately minimal (native
     alert() for decisions, small summary area) to keep the example concise.

  Rationale:
  - A single-file demo lowers the barrier for students: clone -> open -> run.
  - If you need a strict separation (pure logic vs UI), extract the exported
    functions into a separate module (e.g., `src/qualify.core.js`) and have
    the page script import that instead.

  Usage (pure helpers):
    import { validateFields, qualifyApplicant } from './src/qualify.js';
    const errors = validateFields(formData);

  Note: this file is an ES module (used via <script type="module">) but also
  includes a tiny DOM wiring block for the static `apply.html` demo. Only the
  exported helpers are intended for reuse; the DOM code is teaching-focused.
*/

// Default configuration for qualification rules. Keep simple and configurable.
const DEFAULTS = {
  // Minimum gross income to be considered for any credit
  minIncomeForConsideration: 16000,
  // Income at or above this value will trigger an automatic approval (configurable)
  minApprovalIncome: 20000,
  // Maximum credit as a fraction of gross income (e.g., 0.1 -> 10% of income)
  incomeCreditFactor: 0.1,
  // Absolute cap on credit (USD)
  maxCreditCap: 50000,
};

// ------------------- Basic validators (pure functions) -------------------

/**
 * Check if value is a simple valid email (not exhaustive). Returns boolean.
 * We keep regex conservative to avoid rejecting valid emails; server should
 * re-validate with stricter checks if needed.
 */
/**
 * Check if value is a simple valid email (not exhaustive). Returns boolean.
 * We keep regex conservative to avoid rejecting valid emails; server should
 * re-validate with stricter checks if needed.
 * @param {string} value
 * @returns {boolean}
 */
export function isEmail(value) {
  if (!value) return false;
  // simple RFC-like check (not full RFC 5322)
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(value).trim());
}

/**
 * Case-insensitive equality check for two email values.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function matchEmails(a, b) {
  if (!a || !b) return false;
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

/** Last-4 SSN validation: 4 digits */
/**
 * Validate SSN last-4: must be 4 digits.
 * @param {string} value
 * @returns {boolean}
 */
export function isSSNLast4(value) {
  if (!value) return false;
  return /^\d{4}$/.test(String(value).trim());
}

/** Numeric range check for gross income (non-negative integer or float allowed) */
/**
 * Numeric check: true when value converts to a finite number >= 0.
 * @param {any} value
 * @returns {boolean}
 */
export function isNonNegativeNumber(value) {
  if (value === null || value === undefined || value === '') return false;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0;
}

// ------------------- State lookup -------------------
// US state 2-letter codes (including DC)
const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
  'DC'
]);

/**
 * Check whether a given value is a recognized US 2-letter state code.
 * @param {string} value
 * @returns {boolean}
 */
export function isValidState(value) {
  if (!value) return false;
  return US_STATES.has(String(value).trim().toUpperCase());
}

// ------------------- Field-level validation -------------------

/**
 * Validate a form data object and return an array of error objects: { field, code, message }
 * This function is pure and does not touch the DOM.
 */
/**
 * Validate a form data object and return an array of error objects: { field, code, message }
 * This function is pure and does not touch the DOM.
 * @param {Object} data
 * @returns {Array<{field:string,code:string,message:string}>}
 */
export function validateFields(data = {}) {
  const errors = [];

  // email
  if (!isEmail(data.email)) {
    errors.push({ field: 'email', code: 'invalid_email', message: 'Enter a valid email address.' });
  }
  // email confirmation
  if (!matchEmails(data.email, data.emailConfirm)) {
    errors.push({ field: 'emailConfirm', code: 'email_mismatch', message: 'Email addresses do not match.' });
  }

  // ssn last4 required
  if (!isSSNLast4(data.ssnLast4)) {
    errors.push({ field: 'ssnLast4', code: 'invalid_ssn', message: 'Enter the last 4 digits of your SSN.' });
  }

  // first name required
  if (!data.firstName || String(data.firstName).trim() === '') {
    errors.push({ field: 'firstName', code: 'required', message: 'This field is required.' });
  }

  // gross income optional but if provided must be numeric
  if (data.grossIncome !== undefined && data.grossIncome !== '') {
    if (!isNonNegativeNumber(data.grossIncome)) {
      errors.push({ field: 'grossIncome', code: 'invalid_number', message: 'Enter a valid gross income.' });
    }
  }

  // consent checkbox
  if (!data.consent) {
    errors.push({ field: 'consent', code: 'consent_required', message: 'You must consent to use information for credit application.' });
  }

  // additional validations (zip/state) could be added here

  return errors;
}

/**
 * validateAllFields
 * Loop through all expected form fields and validate each according to rules.
 * Returns an array of error objects: { field, message }
 */
/**
 * validateAllFields
 * Loop through all expected form fields and validate each according to rules.
 * Returns an array of error objects: { field, message }
 * @param {Object} data
 * @returns {Array<{field:string,message:string}>}
 */
export function validateAllFields(data = {}) {
  const errors = [];

  // Email checks
  if (!isEmail(data.email)) {
    errors.push({ field: 'email', message: 'Enter a valid email address.' });
  }
  if (!matchEmails(data.email, data.emailConfirm)) {
    errors.push({ field: 'emailConfirm', message: 'Email addresses do not match.' });
  }

  // First and last name required
  if (!data.firstName || String(data.firstName).trim() === '') {
    errors.push({ field: 'firstName', message: 'First name is required.' });
  }
  if (!data.lastName || String(data.lastName).trim() === '') {
    errors.push({ field: 'lastName', message: 'Last name is required.' });
  }

  // City and state
  if (!data.city || String(data.city).trim() === '') {
    errors.push({ field: 'city', message: 'City is required.' });
  }
  if (!isValidState(data.state)) {
    errors.push({ field: 'state', message: 'Enter a valid 2-letter state code.' });
  }

  // ZIP must be 5 digits
  if (!/^\d{5}$/.test(String(data.zip || '').trim())) {
    errors.push({ field: 'zip', message: 'ZIP code must be 5 digits.' });
  }

  // Gross income must be a positive number
  if (data.grossIncome === undefined || data.grossIncome === '' || !isNonNegativeNumber(data.grossIncome) || Number(data.grossIncome) <= 0) {
    errors.push({ field: 'grossIncome', message: 'Gross income must be a positive number.' });
  }

  // SSN last 4
  if (!isSSNLast4(data.ssnLast4)) {
    errors.push({ field: 'ssnLast4', message: 'Enter the last 4 digits of your SSN.' });
  }

  // Consent checkbox must be true
  if (!data.consent) {
  /**
   * PAGE-WIRING (class demo)
   * ------------------------
   * The block below is intentionally small and opinionated for classroom use.
   * It wires the DOM in `apply.html` to demonstrate the two simple checks
   * used in the assignment: (1) emails match and (2) gross income > $20,000.
   *
   * Notes / rationale:
   * - Keep UI code tiny so students can read and run the demo from a static
   *   site (GitHub Pages) without extra tooling.
   * - The decision display uses native alert() to avoid extra markup/ARIA
   *   complexity in the teaching example. In production you'd render an
   *   accessible banner or inline dialog instead.
   * - If you want strictly separated concerns, extract the exported pure
   *   helpers above into a separate module and import them here.
   */

    function isEmail(v){ return !!v && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v).trim()); }

    function showSummary(msgs){
      const s = document.getElementById('validation-summary');
      if(!s) return; s.hidden = !msgs.length; s.innerHTML = msgs.length ? '<ul>'+msgs.map(m=>'<li>'+m+'</li>').join('')+'</ul>' : '';
    }

    function showDecision(approved, income){
      // Minimal change: use native alert() popup instead of rendering the in-page banner.
      // Keep the message short and include the income when approved.
      const msg = approved
        ? `Approved — credit available${income ? ' — $' + Number(income).toLocaleString() : ''}`
        : 'Declined — income below threshold';
      try { alert(msg); } catch (e) { /* fallback: do nothing if alerts are blocked */ }
    }

    document.addEventListener('DOMContentLoaded', ()=>{
      const form = document.getElementById('credit-application-form');
      if(!form) return;
      form.addEventListener('submit', (ev)=>{
        ev.preventDefault();
        const email = (form.querySelector('#email')||{}).value||'';
        const emailConfirm = (form.querySelector('#emailConfirm')||{}).value||'';
        const incomeRaw = (form.querySelector('#grossIncome')||{}).value||'';
        const income = Number(incomeRaw) || 0;

        const errors = [];
        if(!isEmail(email)) errors.push('Enter a valid email address.');
        if(email.trim().toLowerCase() !== emailConfirm.trim().toLowerCase()) errors.push('Email addresses do not match.');
        if(!(income > 20000)) errors.push('Gross income must be greater than $20,000 to auto-approve.');

        showSummary(errors);
        document.getElementById('errors-table')?.querySelector('tbody')?.replaceChildren();
        document.getElementById('decision-result').hidden = true;

        if(errors.length) return;
        // Simple approve/decline: income > 20k -> approved
        showDecision(true, income);
      });

      form.addEventListener('reset', ()=>{
        showSummary([]); document.getElementById('decision-result').hidden = true;
        document.getElementById('errors-table')?.querySelector('tbody')?.replaceChildren();
      });
    });

  // Keep no exports for the demo UI: this page-facing wiring runs when the
  // DOM is ready and intentionally operates directly on elements in apply.html.
  
    errors.push({ field: 'consent', message: 'You must consent to use information for credit application.' })
  }
  return errors;}
