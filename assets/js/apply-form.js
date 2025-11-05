// Correct relative import: this file lives at /assets/js/apply-form.js and
// the qualify module is at /src/qualify.js, so we need to go up two levels.
import { validateAllFields, validateAndQualify } from '../../src/qualify.js';

// Debug helper to confirm the module loaded in the browser console.
console.log('apply-form module loaded');

// Client-side form handler for apply.html
// - Prevents default submit, runs validation, shows inline errors and a summary
// - Adds click listener to #applyButton (falls back to #applyBtn)

const FIELD_ERROR_CLASS = 'field-error-message';

function createErrorNode(msg) {
  const d = document.createElement('div');
  d.className = FIELD_ERROR_CLASS;
  d.style.color = 'var(--danger)';
  d.style.fontSize = '0.9rem';
  d.textContent = msg;
  return d;
}

function clearFieldErrors(form) {
  form.querySelectorAll(`.${FIELD_ERROR_CLASS}`).forEach(n => n.remove());
  form.querySelectorAll('[aria-invalid="true"]').forEach(el => el.removeAttribute('aria-invalid'));
}

function showValidationSummary(summaryEl, errors) {
  if (!summaryEl) return;
  if (!errors || !errors.length) {
    summaryEl.hidden = true;
    summaryEl.innerHTML = '';
    return;
  }
  summaryEl.hidden = false;
  const ul = document.createElement('ul');
  ul.style.margin = '0';
  ul.style.paddingLeft = '1.25rem';
  errors.forEach(err => {
    const li = document.createElement('li');
    li.textContent = err.message;
    ul.appendChild(li);
  });
  summaryEl.innerHTML = '';
  summaryEl.appendChild(ul);
  summaryEl.focus && summaryEl.focus();
}

function showInlineErrors(form, errors) {
  errors.forEach(err => {
    const field = form.querySelector(`#${err.field}`);
    if (field) {
      field.setAttribute('aria-invalid', 'true');
      // place message after the field
      const errNode = createErrorNode(err.message);
      // If field is inside a form-row, append there
      const parentRow = field.closest('.form-row') || field.parentNode;
      parentRow.appendChild(errNode);
    }
  });
}

function collectFormData(form) {
  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());
  // normalize checkbox
  data.consent = !!form.querySelector('#consent') && form.querySelector('#consent').checked;
  // keep grossIncome as-is (string) — validation will coerce
  return data;
}

async function handleValidationAndMaybeSubmit(form, summaryEl, event) {
  if (event && event.preventDefault) event.preventDefault();
  clearFieldErrors(form);
  const data = collectFormData(form);

  // run validation (using qualify.js helpers)
    // validateAllFields checks all required fields and returns array of errors
    const errors = validateAllFields(data);
  if (errors.length) {
    showInlineErrors(form, errors);
    showValidationSummary(summaryEl, errors);
    // focus first invalid field
    const first = form.querySelector('[aria-invalid="true"]');
    if (first && typeof first.focus === 'function') first.focus();
    return false;
  }

  // If no validation errors, run local qualification first and show the result.
  // This avoids a 405 when serving the site with a static server during development.
  const decision = validateAndQualify(data);

  const decisionEl = document.getElementById('decision-result');
  if (decisionEl) {
    decisionEl.hidden = false;
    decisionEl.innerHTML = '';
    if (decision.errors && decision.errors.length) {
      // shouldn't happen because we validated above, but handle defensively
      const p = document.createElement('p');
      p.textContent = 'Validation errors present.';
      decisionEl.appendChild(p);
    } else if (decision.decision === 'approved') {
      const p = document.createElement('p');
      p.innerHTML = `<strong>Congratulations — approved</strong>. Your provisional credit line is <strong>$${decision.creditAmount.toLocaleString()}</strong>.`;
      decisionEl.appendChild(p);
      // Offer an optional submit button to send to server if a backend exists
      const submitBtn = document.createElement('button');
      submitBtn.type = 'button';
      submitBtn.className = 'btn primary';
      submitBtn.textContent = 'Confirm & Submit Application';
      submitBtn.addEventListener('click', () => {
        // Remove this client-side interception and submit normally
        form.removeEventListener('submit', handleValidationAndMaybeSubmit);
        form.submit();
      });
      decisionEl.appendChild(submitBtn);
    } else if (decision.decision === 'declined') {
      const p = document.createElement('p');
      p.innerHTML = `<strong>We're sorry — you do not qualify at this time.</strong> Reason: ${decision.reason || 'Not eligible'}.`;
      decisionEl.appendChild(p);
      const info = document.createElement('p');
      info.className = 'field-help';
      info.textContent = 'If you believe this is an error, contact sales@titancoffeerun.example to discuss next steps.';
      decisionEl.appendChild(info);
    }
  }

  return true;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('credit-application-form');
  const summaryEl = document.getElementById('validation-summary');
  if (!form) return;

  // Attach submit handler to prevent default and validate
  form.addEventListener('submit', (e) => handleValidationAndMaybeSubmit(form, summaryEl, e));

  // Add click listener to apply button id requested by user
  const applyButton = document.getElementById('applyButton') || document.getElementById('applyBtn');
  if (applyButton) {
    applyButton.addEventListener('click', (e) => {
      // prevent default and validate before submission
      e.preventDefault();
      handleValidationAndMaybeSubmit(form, summaryEl, e);
    });
  }

  // Reset behavior: clear inline errors and hide summary
  form.addEventListener('reset', () => {
    setTimeout(() => { // allow native reset to happen first
      clearFieldErrors(form);
      showValidationSummary(summaryEl, []);
    }, 0);
  });
});
