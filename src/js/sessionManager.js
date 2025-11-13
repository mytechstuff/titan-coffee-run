/**
 * sessionManager.js
 *
 * Lightweight session / token management for demo purposes.
 * Provides token generation (demo unsigned token), parsing, validation
 * and simple storage helpers that mirror the demo client's expectations.
 *
 * Security note: this module implements unsigned Base64 JSON tokens for
 * demonstration only. Do NOT use this approach in production. Replace with
 * server-issued signed JWTs (HttpOnly cookies or Authorization headers)
 * and server-side verification for any real authentication.
 */

const DEFAULT_TOKEN_KEY = 'tcr_demo_token';

/**
 * SessionManager options
 * @typedef {Object} SessionOpts
 * @property {string} [tokenKey] - localStorage/sessionStorage key used to persist token
 */

/**
 * Demo SessionManager
 */
export default class SessionManager {
  /**
   * @param {SessionOpts} opts
   */
  constructor(opts = {}) {
    this.tokenKey = opts.tokenKey || DEFAULT_TOKEN_KEY;
  }

  /**
   * Create a demo token (unsigned) by Base64-encoding a small JSON payload.
   * Payload format: { sub, iat, exp }
   * @param {string} sub - subject / user id
   * @param {number} expiresInSec - seconds until expiration
   * @returns {string} base64 token
   */
  createToken(sub, expiresInSec = 60 * 60) {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + expiresInSec;
    const payload = { sub, iat, exp };
    return btoa(JSON.stringify(payload));
  }

  /**
   * Parse a base64 token and return the payload or null on failure.
   * @param {string} token
   * @returns {Object|null}
   */
  parseToken(token) {
    if (!token) return null;
    try {
      const raw = atob(token);
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  /**
   * Validate token structure and expiration.
   * @param {string} token
   * @returns {{valid:boolean, expired:boolean, payload:Object|null}}
   */
  validateToken(token) {
    const payload = this.parseToken(token);
    if (!payload || typeof payload !== 'object') return { valid: false, expired: false, payload: null };
    const now = Math.floor(Date.now() / 1000);
    const expired = typeof payload.exp === 'number' ? payload.exp <= now : false;
    return { valid: !expired, expired, payload };
  }

  /**
   * Persist token to storage. If `remember` is true, use localStorage, otherwise sessionStorage.
   * @param {string} token
   * @param {boolean} remember
   */
  saveToken(token, remember = false) {
    try {
      if (remember) localStorage.setItem(this.tokenKey, token);
      else sessionStorage.setItem(this.tokenKey, token);
      return true;
    } catch (e) {
      console.warn('SessionManager.saveToken failed', e);
      return false;
    }
  }

  /**
   * Get token from storage (sessionStorage preferred, then localStorage)
   * @returns {string|null}
   */
  getToken() {
    return sessionStorage.getItem(this.tokenKey) || localStorage.getItem(this.tokenKey) || null;
  }

  /**
   * Clear token from both storages
   */
  clearToken() {
    try { sessionStorage.removeItem(this.tokenKey); } catch (e) {}
    try { localStorage.removeItem(this.tokenKey); } catch (e) {}
  }
}
