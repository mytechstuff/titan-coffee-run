// registration.js — ES module
// Exports FormValidator and StorageManager and initializes form behavior on DOMContentLoaded
import { User, UserStorage } from './userStorage.js';

/*
  Developer notes — review suggestions status

  Below are the suggestions made in the last review of this module. Please mark each
  item with APPROVED, REJECTED, or PENDING and optionally add a short reason.

  1) Server-side validation (always enforce on server) .................. [PENDING]
  2) Network error handling: handle fetch errors and HTTP statuses ........ [PENDING]
  3) Secure transmission: use TLS/HSTS .................................. [APPROVED]
  4) Password handling: never persist passwords client-side ................ [APPROVED]
  5) Rate limiting and abuse detection (server-side) ..................... [PENDING]
  6) Accessibility: announce async server errors and move focus to errors .. [PENDING]
  7) XSS/Injection: sanitize server-returned HTML ........................ [PENDING]
  8) StorageManager: guard storage quotas & JSON schema (try/catch) ...... [APPROVED]
  9) Unit tests: add tests for validator and storage manager .............. [PENDING]
 10) Logging/observability: client-side non-sensitive telemetry hooks ...... [PENDING]

  Notes:
  - I pre-filled reasonable defaults for items that were already applied in this
    module (e.g., we intentionally avoid storing passwords in StorageManager).
  - Edit these statuses to reflect your decisions. Keeping them in-file helps
    future contributors understand which recommendations were acted on.
*/

/**
 * FormValidator handles validation and UI updates for the registration form.
 * @class
 */
export class FormValidator {
  /**
   * Create a FormValidator bound to a form element.
   * @param {HTMLFormElement} form - The form element to validate and manage.
   * @param {Object} [options] - Optional configuration.
   * @param {number} [options.minScore=3] - Minimum password score required.
   * @throws {Error} Throws if `form` is falsy.
   */
  constructor(form, options = {}){
    if (!form) throw new Error('Form element required');
    this.form = form;
    // query elements (may be null if the markup changes) — we guard later
    this.email = form.querySelector('#email');
    this.emailError = form.querySelector('#emailError');
    this.pwd = form.querySelector('#password');
    this.pwdStrengthLabel = form.querySelector('#pwdStrengthLabel');
    this.strengthBar = form.querySelector('#strengthBar');
    this.confirm = form.querySelector('#confirmPassword');
    this.confirmError = form.querySelector('#confirmError');
    this.firstName = form.querySelector('#firstName');
    this.lastName = form.querySelector('#lastName');
    this.terms = form.querySelector('#terms');
    this.registerBtn = form.querySelector('#registerBtn');
    this.formStatus = form.querySelector('#formStatus');

    // pragmatic client-side email check — explained in docs
    this.emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    // allow small customization
    this.minScore = options.minScore ?? 3; // required password score

    // Warn if expected elements are missing — helps during integration/test
    const missing = [];
    ['email','pwd','registerBtn','firstName','lastName','terms'].forEach(id => {
      if (!this.form.querySelector('#' + id) && !this[id]) missing.push(id);
    });
    if (missing.length) console.warn('FormValidator: missing expected elements in form:', missing);

    this._bindEvents();
  }

  // --- Validation methods (pure functions where possible) ---
  /**
   * Validate the email field value and update UI.
   * @returns {boolean} True if email passes validation or the email field is absent.
   */
  validateEmail(){
    if (!this.email){
      console.warn('validateEmail: no email field present — skipping');
      return true;
    }
    const value = this.email.value.trim();
    if (!value){
      this._setInvalid(this.email, this.emailError, 'Email is required.');
      return false;
    }
    if (!this.emailRegex.test(value)){
      this._setInvalid(this.email, this.emailError, 'Please enter a valid email address.');
      return false;
    }
    this._clearInvalid(this.email, this.emailError);
    return true;
  }

  /**
   * Calculate a simple password strength score based on length and variety.
   * @param {string} value - The password string to score.
   * @returns {number} Score in range 0..6.
   */
  calculatePasswordScore(value){
    let score = 0;
    if (!value) return score;
    if (value.length >= 8) score += 1;
    if (value.length >= 12) score += 1;
    if (/[a-z]/.test(value)) score += 1;
    if (/[A-Z]/.test(value)) score += 1;
    if (/\d/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;
    return score; // 0..6
  }

  /**
   * Convert numeric score to a human-readable label.
   * @param {number} score - Numeric score returned by calculatePasswordScore.
   * @returns {string} One of 'Weak', 'Medium', 'Strong'.
   */
  getPasswordLabel(score){
    if (score >= 5) return 'Strong';
    if (score >= 3) return 'Medium';
    return 'Weak';
  }

  /**
   * Update password strength UI and return whether it meets the required threshold.
   * @returns {boolean} True if password score >= minScore or password field is absent.
   */
  validatePassword(){
    if (!this.pwd){
      console.warn('validatePassword: no password field found — skipping');
      return true;
    }
    const value = this.pwd.value;
    const score = this.calculatePasswordScore(value);
    const label = this.getPasswordLabel(score);
    const pct = Math.min(100, (score / 6) * 100);
    if (this.pwdStrengthLabel) this.pwdStrengthLabel.textContent = label;
    if (this.strengthBar) this.strengthBar.style.width = pct + '%';
    if (score < this.minScore) this._setInvalid(this.pwd, null, null); // visually mark
    else this._clearInvalid(this.pwd, null);
    return score >= this.minScore;
  }

  /**
   * Validate the confirm-password field matches the password.
   * @returns {boolean} True if match OK, false otherwise (or if confirm field absent returns true).
   */
  validateConfirmMatch(){
    if (!this.confirm){
      console.warn('validateConfirmMatch: no confirm field — skipping');
      return true;
    }
    if (!this.confirm.value){
      this._clearInvalid(this.confirm, this.confirmError);
      return false;
    }
    if (!this.pwd){
      console.warn('validateConfirmMatch: no password field — skipping match check');
      return true;
    }
    if (this.pwd.value !== this.confirm.value){
      this._setInvalid(this.confirm, this.confirmError, "Passwords don't match.");
      return false;
    }
    this._clearInvalid(this.confirm, this.confirmError);
    return true;
  }

  /**
   * Ensure first and last name fields are non-empty.
   * @returns {boolean} True if both present or fields missing (conservative pass).
   */
  validateNames(){
    if (!this.firstName || !this.lastName){
      console.warn('validateNames: name fields missing — skipping');
      return true;
    }
    const fn = this.firstName.value.trim();
    const ln = this.lastName.value.trim();
    return Boolean(fn && ln);
  }

  /**
   * Run all validations and toggle submit enabled state.
   * @returns {boolean} True if form passes all checks.
   */
  isFormValid(){
    const emailOK = this.validateEmail();
    const pwdOK = this.validatePassword();
    const matchOK = this.validateConfirmMatch();
    const namesOK = this.validateNames();
    const termsOK = this.terms ? !!this.terms.checked : true;
    const ok = emailOK && pwdOK && matchOK && namesOK && termsOK;
    this._toggleSubmit(ok);
    return ok;
  }

  // --- Helpers ---
  /**
   * Mark a control invalid and optionally set a message.
   * @private
   * @param {HTMLElement} control - Input element to mark.
   * @param {HTMLElement|null} [messageTarget] - Element to put an error message in.
   * @param {string|null} [message] - Error message text.
   */
  _setInvalid(control, messageTarget = null, message = null){
    if (!control) return;
    control.setAttribute('aria-invalid', 'true');
    if (messageTarget && message) messageTarget.textContent = message;
  }

  /**
   * Clear invalid state and optionally remove a message.
   * @private
   * @param {HTMLElement} control - Input element to clear.
   * @param {HTMLElement|null} [messageTarget] - Element to clear message.
   */
  _clearInvalid(control, messageTarget = null){
    if (!control) return;
    control.removeAttribute('aria-invalid');
    if (messageTarget) messageTarget.textContent = '';
  }

  /**
   * Enable or disable the submit button.
   * @private
   * @param {boolean} enabled
   */
  _toggleSubmit(enabled){
    if (!this.registerBtn) return;
    if (enabled){
      this.registerBtn.disabled = false;
      this.registerBtn.removeAttribute('aria-disabled');
    } else {
      this.registerBtn.disabled = true;
      this.registerBtn.setAttribute('aria-disabled', 'true');
    }
  }

  // --- Event binding / lifecycle ---
  /**
   * Bind UI events for live validation and submit handling.
   * @private
   */
  _bindEvents(){
    // Lightweight debouncing for email to avoid excessive validation on each keystroke
    const debounce = (fn, wait=150) => {
      let t;
      return (...args) => { clearTimeout(t); t = setTimeout(()=>fn(...args), wait); };
    };

    if (this.email) this.email.addEventListener('input', debounce(()=>{ this.validateEmail(); this.isFormValid(); }));
    if (this.pwd) this.pwd.addEventListener('input', ()=>{ this.validatePassword(); this.validateConfirmMatch(); this.isFormValid(); });
    if (this.confirm) this.confirm.addEventListener('input', ()=>{ this.validateConfirmMatch(); this.isFormValid(); });
    if (this.firstName) this.firstName.addEventListener('input', ()=> this.isFormValid());
    if (this.lastName) this.lastName.addEventListener('input', ()=> this.isFormValid());
    if (this.terms) this.terms.addEventListener('change', ()=> this.isFormValid());

    if (this.form){
      this.form.addEventListener('submit', async (e)=>{
        e.preventDefault();
        if (this.formStatus) this.formStatus.textContent = '';
        if (!this.isFormValid()){
          if (this.formStatus) this.formStatus.textContent = 'Please correct the highlighted fields.';
          return;
        }
        // Indicate loading state on the button
        if (this.registerBtn) this.registerBtn.classList.add('loading');
        if (this.registerBtn) this.registerBtn.disabled = true;
        // simulate network delay for demo
        await new Promise(resolve => setTimeout(resolve, 800));
        if (this.registerBtn) this.registerBtn.classList.remove('loading');
        // Before clearing the form, persist a safe user record (no plain password).
        try{
          const first = this.form.querySelector('#firstName') ? this.form.querySelector('#firstName').value.trim() : '';
          const last = this.form.querySelector('#lastName') ? this.form.querySelector('#lastName').value.trim() : '';
          const email = this.form.querySelector('#email') ? this.form.querySelector('#email').value.trim() : '';
          // We set passwordSet=true to indicate a password was created without storing it
          const user = new User({ firstName: first, lastName: last, email, passwordSet: true });
          const saved = await UserStorage.save(user, { encode: true, expirationDays: 31 });
          if (saved) {
            if (this.formStatus) this.formStatus.textContent = 'Registration successful (demo) — data saved locally.';
          } else {
            if (this.formStatus) this.formStatus.textContent = 'Registration successful (demo) — failed to save locally (device may be low on storage).';
          }
        }catch(err){
          console.warn('Error saving user after registration', err);
          if (this.formStatus) this.formStatus.textContent = 'Registration successful (demo) — error saving local copy.';
        }

        // Reset UX
        this.form.reset();
        if (this.strengthBar) this.strengthBar.style.width = '0%';
        if (this.pwdStrengthLabel) this.pwdStrengthLabel.textContent = '—';
        this._toggleSubmit(false);
        // storage clear is handled outside if needed (draft clearing)
        const event = new CustomEvent('registration:success');
        this.form.dispatchEvent(event);
      });
    }
  }
}

export class StorageManager {
  constructor(key = 'titan_registration_draft'){
    this.key = key;
  }

  saveDraft(data){
    // Never store passwords client-side in localStorage for security reasons
    const safe = {
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      email: data.email || '',
      terms: !!data.terms,
      savedAt: new Date().toISOString()
    };
    try{
      localStorage.setItem(this.key, JSON.stringify(safe));
    }catch(e){ /* ignore storage errors */ }
  }

  loadDraft(){
    try{
      const raw = localStorage.getItem(this.key);
      if (!raw) return null;
      return JSON.parse(raw);
    }catch(e){ return null; }
  }

  clearDraft(){
    try{ localStorage.removeItem(this.key); }catch(e){}
  }
}

// Initialization (default behavior when module is loaded)
export default function initRegistration(){
  document.addEventListener('DOMContentLoaded', ()=>{
    const form = document.getElementById('registerForm');
    if (!form) return;
    const validator = new FormValidator(form);
    const storage = new StorageManager();

    // hydrate draft if present (but never set password fields)
    const draft = storage.loadDraft();
    if (draft){
      if (draft.firstName) form.querySelector('#firstName').value = draft.firstName;
      if (draft.lastName) form.querySelector('#lastName').value = draft.lastName;
      if (draft.email) form.querySelector('#email').value = draft.email;
      if (draft.terms) form.querySelector('#terms').checked = true;
      validator.isFormValid();
    }

    // Save a safe draft on input (debounced)
    const saveDebounced = (()=>{ let t; return (data)=>{ clearTimeout(t); t = setTimeout(()=> storage.saveDraft(data), 300); }; })();
    const gather = ()=>({ firstName: form.querySelector('#firstName').value.trim(), lastName: form.querySelector('#lastName').value.trim(), email: form.querySelector('#email').value.trim(), terms: !!form.querySelector('#terms').checked });

    ['input','change'].forEach(evt=>{
      form.addEventListener(evt, ()=> saveDebounced(gather()));
    });

    // Clear storage on successful registration
    form.addEventListener('registration:success', ()=> storage.clearDraft());

    // Backup / Restore UI integration using UserStorage
    const backupBtn = document.getElementById('backupBtn');
    const restoreBtn = document.getElementById('restoreBtn');
    const restoreInput = document.getElementById('restoreInput');

    const backupStatus = document.getElementById('backupStatus');
    if (backupBtn){
      backupBtn.addEventListener('click', async ()=>{
        try{
          const result = UserStorage.backup();
          if (!result){
            if (backupStatus) backupStatus.textContent = 'No stored user data to backup.';
            return;
          }
          // result { backupString, fileName }
          const { backupString, fileName } = result;
          const blob = new Blob([backupString], { type: 'application/octet-stream' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName || 'tcr_user_backup.tcrbak';
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          if (backupStatus) backupStatus.textContent = `Backup downloaded: ${a.download}`;
          // small success state (clear after a few seconds)
          setTimeout(()=>{ if (backupStatus) backupStatus.textContent = '' }, 6000);
        }catch(err){
          console.error('Backup failed', err);
          if (backupStatus) backupStatus.textContent = 'Backup failed — see console for details.';
        }
      });
    }

    if (restoreBtn && restoreInput){
      restoreBtn.addEventListener('click', ()=> restoreInput.click());
      restoreInput.addEventListener('change', (e)=>{
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = ()=>{
          const text = reader.result;
          const ok = UserStorage.restore(text);
          if (ok){
            const { user } = UserStorage.load();
            if (user){
              if (form.querySelector('#firstName')) form.querySelector('#firstName').value = user.firstName || '';
              if (form.querySelector('#lastName')) form.querySelector('#lastName').value = user.lastName || '';
              if (form.querySelector('#email')) form.querySelector('#email').value = user.email || '';
              if (form.querySelector('#terms')) form.querySelector('#terms').checked = true;
              validator.isFormValid();
              if (backupStatus) backupStatus.textContent = 'Restore successful — form prefilled from backup.';
            } else {
              if (backupStatus) backupStatus.textContent = 'Restore completed but no user found in storage.';
            }
            setTimeout(()=>{ if (backupStatus) backupStatus.textContent = '' }, 6000);
          } else {
            if (backupStatus) backupStatus.textContent = 'Restore failed — invalid backup file.';
          }
        };
        reader.readAsText(f);
        // reset input so same file can be selected again later
        restoreInput.value = '';
      });
    }
  });
}

// run init automatically for convenience
initRegistration();
