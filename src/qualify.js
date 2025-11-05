/*
  src/qualify.js
  ----------------
  Purpose: provide reusable validation and income-based qualification helpers for
  the credit application form. This file is written as a small ES module that
  exports pure functions (no side-effects) so they are easy to unit-test and
  reuse from form-handling code or server-side code (after small adaptation).

  Structure rationale:
  - Export small, focused functions (isEmail, matchEmails, isSSNLast4, validateFields),
    and a single `qualifyApplicant` function that applies income-based rules.
  - Keep functions pure where possible (inputs -> outputs) so logic is deterministic
    and testable. Avoid direct DOM access in this file; let form handler read DOM and
    call these helpers.
  - Configuration values (thresholds, multipliers) are centralized in `DEFAULTS` and
    can be overridden by passing an options object to `qualifyApplicant`.
  - Use named exports so callers can import only what they need.

  Usage (front-end):
    import { validateFields, qualifyApplicant } from './src/qualify.js';
    const errors = validateFields(formData);
    if (!errors.length) {
      const decision = qualifyApplicant(formData);
    }

  Note about script loading:
  - This file is an ES module. To load it in the browser directly, include it with
    <script type="module" src="/src/qualify.js"></script>
  - If you want to keep a non-module <script> tag, create a thin module wrapper that
    assigns these functions to window (or use a bundler).
*/

// Default configuration for qualification rules. Keep simple and configurable.
const DEFAULTS = {
  // Minimum gross income to be considered for any credit
  minIncomeForConsideration: 10000,
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
export function isEmail(value) {
  if (!value) return false;
  // simple RFC-like check (not full RFC 5322)
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(value).trim());
}

export function matchEmails(a, b) {
  if (!a || !b) return false;
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

/** Last-4 SSN validation: 4 digits */
export function isSSNLast4(value) {
  if (!value) return false;
  return /^\d{4}$/.test(String(value).trim());
}

/** Numeric range check for gross income (non-negative integer or float allowed) */
export function isNonNegativeNumber(value) {
  if (value === null || value === undefined || value === '') return false;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0;
}

// ------------------- Field-level validation -------------------

/**
 * Validate a form data object and return an array of error objects: { field, code, message }
 * This function is pure and does not touch the DOM.
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

// ------------------- Qualification logic -------------------

/**
 * Determine credit eligibility and amount based on income and configurable rules.
 * Returns an object: { decision: 'approved'|'declined', creditAmount: number|null, reason?: string }
 * Keep the logic simple and deterministic to make testing straightforward.
 */
export function qualifyApplicant(data = {}, options = {}) {
  const cfg = { ...DEFAULTS, ...options };

  const income = Number(data.grossIncome) || 0;

  if (income < cfg.minIncomeForConsideration) {
    return { decision: 'declined', creditAmount: null, reason: 'income_below_minimum' };
  }

  // calculate base credit as fraction of income
  let credit = Math.floor(income * cfg.incomeCreditFactor);

  // apply cap
  if (credit > cfg.maxCreditCap) credit = cfg.maxCreditCap;

  // optional: if user provided requestedAmount, honor up to computed credit
  if (data.requestedAmount) {
    const requested = Number(data.requestedAmount);
    if (Number.isFinite(requested) && requested >= 0) {
      credit = Math.min(credit, Math.floor(requested));
    }
  }

  // final check: if credit is zero, decline
  if (credit <= 0) {
    return { decision: 'declined', creditAmount: null, reason: 'computed_credit_zero' };
  }

  return { decision: 'approved', creditAmount: credit };
}

// ------------------- Export a small helper for convenience ---------------

/**
 * validateAndQualify(data, options)
 * - returns { errors: [], decision?, creditAmount?, reason? }
 * This combines validation + qualification and is useful for quick flows.
 */
export function validateAndQualify(data = {}, options = {}) {
  const errors = validateFields(data);
  if (errors.length) return { errors };
  const decision = qualifyApplicant(data, options);
  return { errors: [], ...decision };
}

// ------------------- Notes on local vs global variables -------------------
/*
  - Prefer local variables (inside functions) and module scope constants like DEFAULTS.
    These avoid polluting the global namespace and make the code testable.
  - Avoid putting mutable data on window/global; if you must provide a global API,
    export it from this module and attach to window in a separate thin wrapper.
  - Local variables are garbage-collected when out of scope; globals persist and can cause
    accidental collisions and harder-to-track bugs.
*/

// Optional: if the script is included non-modularly and you want a fallback global
// export, uncomment the following lines. Prefer using `type="module"` in the page.
// if (typeof window !== 'undefined') {
//   window.__titanQualify = { isEmail, matchEmails, isSSNLast4, validateFields, qualifyApplicant, validateAndQualify };
// }
