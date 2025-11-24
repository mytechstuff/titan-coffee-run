/**
 * loginRateLimiter.js
 *
 * Client-side login attempt rate limiter using localStorage timestamps.
 *
 * SECURITY NOTE: This client-side limiter is a UX convenience only and is
 * trivially tamperable (users or malicious scripts can clear/modify localStorage).
 * Do NOT rely on it for security-critical throttling — enforce limits on the
 * server (IP + account heuristics) and use the client limiter only to improve UX.
 * See docs/securty_review.md#client-side-rate-limiting-is-tamperable for details.
 */
const STORAGE_PREFIX = 'tcr_login_attempts:';
const DEFAULT_OPTIONS = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  lockoutMs: 15 * 60 * 1000,
  maxLogEntries: 20,
};

function _readEnvelope(identifier) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + identifier);
    if (!raw) return { attempts: [], lockUntil: null, logs: [] };
    return JSON.parse(raw);
  } catch (e) {
    localStorage.removeItem(STORAGE_PREFIX + identifier);
    return { attempts: [], lockUntil: null, logs: [] };
  }
}

function _writeEnvelope(identifier, envelope) {
  try {
    localStorage.setItem(STORAGE_PREFIX + identifier, JSON.stringify(envelope));
  } catch (e) {
    console.warn('loginRateLimiter: failed to write envelope', e);
  }
}

function _trimOldAttempts(attempts, windowMs) {
  const now = Date.now();
  const earliest = now - windowMs;
  return (attempts || []).filter(ts => ts >= earliest);
}

/**
 * Check if identifier is blocked.
 * @param {string} identifier
 * @param {object} opts
 * @returns {{blocked:boolean, lockUntil:number|null, remaining:number}}
 */
export function isBlocked(identifier, opts = {}) {
  const cfg = { ...DEFAULT_OPTIONS, ...opts };
  const env = _readEnvelope(identifier);
  const now = Date.now();
  if (env.lockUntil && env.lockUntil > now) return { blocked: true, lockUntil: env.lockUntil, remaining: 0 };
  env.attempts = _trimOldAttempts(env.attempts || [], cfg.windowMs);
  const remaining = Math.max(0, cfg.maxAttempts - (env.attempts || []).length);
  return { blocked: (env.attempts || []).length >= cfg.maxAttempts, lockUntil: null, remaining };
}

/**
 * Record a login attempt for identifier.
 * @param {string} identifier
 * @param {{success:boolean, reason?:string, opts?:object}} params
 * @returns {{ok:boolean, blocked:boolean, lockUntil:number|null}}
 */
export function recordLoginAttempt(identifier, { success, reason = '', opts = {} } = {}) {
  const cfg = { ...DEFAULT_OPTIONS, ...opts };
  const env = _readEnvelope(identifier);
  const now = Date.now();
  if (env.lockUntil && env.lockUntil > now) {
    env.logs = env.logs || [];
    env.logs.unshift({ ts: now, success: false, reason: 'blocked:locked' });
    env.logs = env.logs.slice(0, cfg.maxLogEntries);
    _writeEnvelope(identifier, env);
    return { ok: false, blocked: true, lockUntil: env.lockUntil || null };
  }
  if (success) {
    const cleared = { attempts: [], lockUntil: null, logs: [] };
    cleared.logs = (env.logs || []).slice(0, cfg.maxLogEntries);
    cleared.logs.unshift({ ts: now, success: true, reason: reason || 'login-success' });
    cleared.logs = cleared.logs.slice(0, cfg.maxLogEntries);
    _writeEnvelope(identifier, cleared);
    return { ok: true, blocked: false, lockUntil: null };
  }
  env.attempts = _trimOldAttempts(env.attempts || [], cfg.windowMs);
  env.attempts.push(now);
  env.logs = env.logs || [];
  env.logs.unshift({ ts: now, success: false, reason: reason || 'login-failed' });
  env.logs = env.logs.slice(0, cfg.maxLogEntries);
  if (env.attempts.length >= cfg.maxAttempts) env.lockUntil = now + cfg.lockoutMs;
  else env.lockUntil = null;
  _writeEnvelope(identifier, env);
  return { ok: true, blocked: !!env.lockUntil, lockUntil: env.lockUntil || null };
}

export function resetAttempts(identifier) {
  _writeEnvelope(identifier, { attempts: [], lockUntil: null, logs: [] });
}

export function getAttemptsEnvelope(identifier) {
  const env = _readEnvelope(identifier);
  env.attempts = _trimOldAttempts(env.attempts || [], DEFAULT_OPTIONS.windowMs);
  return env;
}
