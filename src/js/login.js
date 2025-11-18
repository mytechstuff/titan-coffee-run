import { isBlocked, recordLoginAttempt, resetAttempts } from './loginRateLimiter.js';
import { User, UserStorage } from './userStorage.js';
import SessionManager from './sessionManager.js';

// Diagnostics: surface module load so we can detect when the module fails to run
console.log('[login.js] module loaded', { href: typeof location !== 'undefined' ? location.href : undefined });

// Use centralized session manager for token handling
const sm = new SessionManager();

/**
 * Constant-time string comparison to reduce timing-attack leakage in client-side demos.
 * This helper avoids early returns and iterates over the full length of the longest
 * input, combining differences with bitwise ops so execution time is less dependent
 * on the location of the first differing character.
 *
 * Security note: This mitigates some local timing differences but is not a substitute
 * for proper server-side password hashing and verification (e.g. bcrypt/Argon2 with
 * secure compare). Never rely on client-side checks for security-critical decisions.
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function constantTimeEquals(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  let mismatch = 0;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const ca = a.charCodeAt(i) || 0;
    const cb = b.charCodeAt(i) || 0;
    mismatch |= ca ^ cb;
  }
  return mismatch === 0;
}

// Simple demo users. In production you'd verify on server.
const DEMO_USERS = {
  'demo@example.com': { password: 'DemoPass123', id: 'user-demo' }
};

// Token storage is handled by SessionManager instance `sm` above.
// Helper wrappers exported for other modules that imported old helpers.
export function getToken() { return sm.getToken(); }
export function clearToken() { return sm.clearToken(); }

async function fakeAuth(email, password) {
  // simulate network delay
  await new Promise(r => setTimeout(r, 200));
  const row = DEMO_USERS[email];
  // Dummy password used to keep timing similar for missing users
  const DUMMY_PWD = 'DUMMY_STATIC_PASS_x9Z';
  if (!row) {
    // perform a dummy constant-time compare to reduce user-existence timing leaks
    constantTimeEquals(DUMMY_PWD, password || '');
    return { ok: false, reason: 'no-user' };
  }
  // Use constant-time compare to reduce early-return timing leakage
  if (!constantTimeEquals(row.password, password || '')) return { ok: false, reason: 'invalid' };
  return { ok: true, id: row.id };
}

document.addEventListener('DOMContentLoaded', ()=>{
  try {
    const form = document.getElementById('loginForm');
    console.log('[login.js] DOMContentLoaded — form found?', !!form);
    if (!form) return;
    const emailEl = document.getElementById('email');
    const pwdEl = document.getElementById('password');
    const rememberEl = document.getElementById('remember');
    const msg = document.getElementById('loginMessage');
    const btn = document.getElementById('loginBtn');

    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      try {
        console.log('[login.js] submit handler start');
        if (msg) { msg.textContent = ''; msg.className = ''; }
        const email = (emailEl.value || '').trim().toLowerCase();
        const password = pwdEl.value || '';
        console.log('[login.js] credentials', { email, passwordPresent: !!password });

        const blocked = isBlocked(email);
        if (blocked.blocked) {
          const until = blocked.lockUntil ? new Date(blocked.lockUntil).toLocaleTimeString() : 'later';
          if (msg) { msg.textContent = `Too many attempts — blocked until ${until}`; msg.className = 'error'; }
          return;
        }

        try { btn.disabled = true; } catch (e){}
        if (msg) msg.textContent = 'Checking...';

        // Admin shortcut: if username is exactly 'admin' check admin password and treat specially
        if (email === 'admin') {
          // admin password for demo: test123 (store state in localStorage for simplicity)
          if (password === 'test123') {
            recordLoginAttempt(email, { success: true });
            try { localStorage.setItem('adminLoggedIn', 'true'); } catch (e) { console.warn('failed to persist admin login', e); }
            if (msg) msg.textContent = 'Admin signed in — redirecting to sales...';
            setTimeout(()=> location.replace('sales.html'), 300);
            return;
          } else {
            recordLoginAttempt(email, { success: false, reason: 'invalid' });
            if (msg) { msg.textContent = 'Invalid admin credentials.'; msg.className = 'error'; }
            try { window.alert('Admin sign in failed.'); } catch(e){}
            try { btn.disabled = false; } catch(e){}
            return;
          }
        }

        const res = await fakeAuth(email, password);
        console.log('[login.js] auth result', res);
        if (res.ok) {
          // success
          recordLoginAttempt(email, { success: true });
          // create a demo token and store it via SessionManager
          const token = sm.createToken(res.id, 60 * 60);
          try { sm.saveToken(token, !!rememberEl.checked); } catch (e) { console.warn('failed to save token', e); }
          // optionally persist a safe local copy of user for demo (no password stored)
          let safeUser = null;
          try {
            safeUser = new User({ firstName: 'Demo', lastName: 'User', email, passwordSet: false });
            // attempt to save silently to provide demo persistence; ignore failures
            try { await UserStorage.save(safeUser, { encode: true }); } catch (e) { /* ignore */ }
          } catch (e) {
            safeUser = null;
          }
          // redirect to intended page or index
          const next = sessionStorage.getItem('intended') || new URLSearchParams(location.search).get('next') || 'menu.html';
          sessionStorage.removeItem('intended');
          if (msg) msg.textContent = 'Signed in — redirecting...';
          console.log('[login.js] redirect scheduled to', next);
          setTimeout(()=> { console.log('[login.js] redirecting now'); location.replace(next); }, 400);
          return;
        } else {
          // failure
          recordLoginAttempt(email, { success: false, reason: res.reason || 'invalid' });
          // Failure alert for demo visibility (explicit dialog + inline message)
          try { window.alert('Sign in failed — check your email/password and try again.'); } catch(e){}
          const st = isBlocked(email);
          if (st.blocked) {
            const until = st.lockUntil ? new Date(st.lockUntil).toLocaleTimeString() : 'later';
            if (msg) msg.textContent = `Too many attempts — blocked until ${until}`;
          } else {
            if (msg) msg.textContent = 'Invalid credentials. Remaining attempts: ' + st.remaining;
          }
          if (msg) msg.className = 'error';
        }
      } catch (err) {
        console.error('[login.js] submit handler error', err);
        try { window.alert('An error occurred while signing in — see console.'); } catch(e){}
        if (msg) { msg.textContent = 'An unexpected error occurred. Check console.'; msg.className = 'error'; }
      } finally {
        try { btn.disabled = false; } catch(e){}
      }
    });
  } catch (err) {
    console.error('[login.js] DOMContentLoaded top-level error', err);
    const fallback = document.getElementById('loginMessage');
    if (fallback) { fallback.textContent = 'Login module failed to initialize. See console.'; fallback.className = 'error'; }
  }
});

// Export small helpers for protected page to use
// `clearToken` is already a named export above; export the default separately
export default getToken;
