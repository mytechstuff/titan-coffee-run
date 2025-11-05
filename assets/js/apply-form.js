// Client-side form handler for apply.html
import { validateAllFields, validateAndQualify, validateField } from '../../src/qualify.js';

console.log('apply-form module loaded');

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

function getLiveRegion() {
  let lr = document.getElementById('form-live-region');
  if (!lr) {
    lr = document.createElement('div');
    lr.id = 'form-live-region';
    lr.className = 'visually-hidden';
    lr.setAttribute('role', 'status');
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    document.body.appendChild(lr);
  }
  return lr;
}

function announce(message) {
  try {
    const lr = getLiveRegion();
    lr.textContent = '';
    setTimeout(() => { lr.textContent = message; }, 50);
  } catch (e) {
    // ignore
  }
}

function showValidationSummary(summaryEl, errors) {
  if (!summaryEl) return;
  if (!errors || !errors.length) {
    summaryEl.hidden = true;
    summaryEl.innerHTML = '';
    return;
  }

  summaryEl.hidden = false;
  const heading = document.createElement('h4');
  heading.textContent = `Please correct the following ${errors.length === 1 ? 'error' : 'errors'}:`;
  heading.style.margin = '0 0 0.5rem 0';

  const ul = document.createElement('ul');
  ul.style.margin = '0';
  ul.style.paddingLeft = '1.25rem';

  errors.forEach((err) => {
    const li = document.createElement('li');
    let labelText = err.field;
    try {
      const lab = document.querySelector(`label[for="${err.field}"]`);
      if (lab && lab.textContent) labelText = lab.textContent.replace(/\*/g, '').trim();
    } catch (e) {}

    // Use a non-tabbable button so tab order remains on the form fields.
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'validation-summary-link';
    btn.tabIndex = -1; // not in tab order per user's preference
    btn.style.background = 'transparent';
    btn.style.border = 'none';
    btn.style.padding = '0';
    btn.style.color = 'inherit';
    btn.style.textDecoration = 'underline';
    btn.style.cursor = 'pointer';
    btn.textContent = `${labelText}: ${err.message}`;
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      const field = document.getElementById(err.field);
      if (field) {
        field.focus();
        try { if (field.select) field.select(); } catch (e) {}
      }
    });

    li.appendChild(btn);
    ul.appendChild(li);
  });

  summaryEl.innerHTML = '';
  summaryEl.setAttribute('role', 'status');
  summaryEl.setAttribute('aria-live', 'polite');
  summaryEl.setAttribute('aria-atomic', 'true');
  summaryEl.appendChild(heading);
  summaryEl.appendChild(ul);

  // Announce the first validation message for screen readers
  if (errors && errors.length) announce(errors[0].message);
}

function showInlineErrors(form, errors) {
  errors.forEach(err => {
    const field = form.querySelector(`#${err.field}`);
    if (field) {
      field.setAttribute('aria-invalid', 'true');
      const errNode = createErrorNode(err.message);
      const parentRow = field.closest('.form-row') || field.parentNode;
      parentRow.appendChild(errNode);
      // link error to the field for assistive tech
      try { errNode.id = `${err.field}-error`; field.setAttribute('aria-describedby', `${err.field}-error`); } catch (e) {}
    }
  });
}

function collectFormData(form) {
  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());
  data.consent = !!form.querySelector('#consent') && form.querySelector('#consent').checked;
 
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
      announce('Validation errors present. Please review the highlighted fields.');
    } else if (decision.decision === 'approved') {
      const p = document.createElement('p');
      p.innerHTML = `<strong>Congratulations — approved</strong>. Your provisional credit line is <strong>$${decision.creditAmount.toLocaleString()}</strong>.`;
      decisionEl.appendChild(p);
      // Show a visual success banner for better UX
      showSuccessBanner(`Approved — provisional credit: $${decision.creditAmount.toLocaleString()}`);
      // Emphasize in console with styling
      console.log('%cCredit approved: $' + decision.creditAmount.toLocaleString(), 'background: #10b981; color: white; padding:8px 10px; font-size:14px; border-radius:4px');
      // Announce the approval to screen readers
      announce(`Application approved. Provisional credit: $${decision.creditAmount.toLocaleString()}`);
    } else if (decision.decision === 'declined') {
      const p = document.createElement('p');
      p.innerHTML = `<strong>We're sorry — you do not qualify at this time.</strong> Reason: ${decision.reason || 'Not eligible'}.`;
      decisionEl.appendChild(p);
      const info = document.createElement('p');
      info.className = 'field-help';
      info.textContent = 'If you believe this is an error, contact sales@titancoffeerun.example to discuss next steps.';
      decisionEl.appendChild(info);
      announce(`Application declined. Reason: ${decision.reason || 'Not eligible'}.`);
    }
  }

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('credit-application-form');
  const summaryEl = document.getElementById('validation-summary');
  if (!form) return;

  // Debounce helper to avoid validating on every keystroke
  function debounce(fn, wait = 250) {
    let t = null;
    return (...args) => {
      if (t) clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  // Validate a single field and show/hide inline message
  function validateOneField(fieldName) {
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    data.consent = !!form.querySelector('#consent') && form.querySelector('#consent').checked;
    const err = validateField(fieldName, data);

    const fieldEl = form.querySelector(`#${fieldName}`);
    if (!fieldEl) return;
    const parentRow = fieldEl.closest('.form-row') || fieldEl.parentNode;
    // remove existing inline errors in this parent
    parentRow.querySelectorAll('.' + FIELD_ERROR_CLASS).forEach(n => n.remove());
    fieldEl.removeAttribute('aria-invalid');
    if (err) {
      fieldEl.setAttribute('aria-invalid', 'true');
      parentRow.appendChild(createErrorNode(err.message));
    }

    // update global summary
    const allErrors = validateAllFields(data);
    showValidationSummary(summaryEl, allErrors);
  }

  // Attach validation-on-leave listeners: validate when the user leaves the field (blur)
  // This avoids noisy keystroke-by-keystroke errors and improves UX.
  const validateOnLeaveFields = ['email','emailConfirm','firstName','lastName','city','state','zip','grossIncome','ssnLast4','consent'];
  validateOnLeaveFields.forEach((field) => {
    const el = form.querySelector(`#${field}`);
    if (!el) return;
    const handler = () => validateOneField(field);
    if (el.type === 'checkbox' || el.tagName === 'SELECT') {
      // checkboxes and selects validate on change
      el.addEventListener('change', handler);
    } else {
      // only validate on blur (when user leaves the field)
      el.addEventListener('blur', handler);
    }
  });

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
