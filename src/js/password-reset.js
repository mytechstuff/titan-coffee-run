// password-reset.js
// Simple client-side handler for the password-reset form.
// This is intentionally small and pedagogical: the server must perform
// the real work (rate limiting, sending email, token issuance, etc.).

// Security notes (server-side requirements):
// - Do not reveal whether an account exists in the UI response.
// - Rate-limit requests per IP & per email to avoid abuse.
// - Generate single-use, time-limited tokens and send via email.
// - Serve password reset pages over HTTPS and validate tokens server-side.

const form = document.getElementById('pwResetForm');
const emailInput = document.getElementById('email');
const emailError = document.getElementById('emailError');
const formStatus = document.getElementById('formStatus');
const sendBtn = document.getElementById('sendBtn');

function validateEmail(value){
  if (!value) return 'Email is required.';
  // basic RFC-lite check
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!re.test(value)) return 'Please enter a valid email address.';
  return '';
}

async function fakeRequest(email){
  // Simulate network latency and a generic success response.
  // Replace this with a `fetch('/api/password-reset', { method:'POST', body: JSON.stringify({email}) })`
  // call to your backend that enqueues an email without revealing account existence.
  await new Promise(r => setTimeout(r, 700));
  return { ok: true };
}

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  emailError.textContent = '';
  formStatus.textContent = '';
  const email = emailInput.value.trim();
  const v = validateEmail(email);
  if (v){ emailError.textContent = v; return; }

  // disable UI while processing
  sendBtn.disabled = true;
  sendBtn.textContent = 'Sending…';
  try{
    // If you have a server endpoint, replace fakeRequest with fetch.
    const res = await fakeRequest(email);
    // For security: return the same generic message regardless of account state
    if (res && res.ok) {
      formStatus.textContent = 'If an account exists for that email, a reset link has been sent.';
    } else {
      // network problem or server error — show generic guidance
      formStatus.textContent = 'If an account exists, a reset link will be sent. If you do not receive an email, try again later.';
    }
  }catch(err){
    console.error('Password reset request failed', err);
    formStatus.textContent = 'Request failed — please try again later.';
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send Reset Link';
  }
});

// Optional: expose a test helper to trigger the flow from console
window.demoPasswordReset = (email)=>{ emailInput.value = email || ''; form.dispatchEvent(new Event('submit', { cancelable: true })); };

// Document where to integrate server API:
/*
  Server integration guidance:
  - POST /api/password-reset   { email }
  - Response: always 200 + generic message (do not return 404 for unknown email)
  - Mail contains a one-time link to e.g. /password-reset/confirm?token=...
  - Confirm page validates token and prompts for new password.
  - New password page should POST token+newPassword to server; server verifies token and sets new password after hashing.
*/
