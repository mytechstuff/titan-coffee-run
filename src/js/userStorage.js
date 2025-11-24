/**
 * userStorage.js
 * Utility module to manage user objects in web storage for educational/demo purposes.
 *
 * Features:
 * - User class with toJSON(), static fromJSON(), validate()
 * - UserStorage helpers to save/load users to localStorage with Base64 encoding (educational only),
 *   data versioning, expiration (reauthorize after N days), and backup/restore.
 *
 * Security note: Base64 encoding is NOT encryption. Do not store real passwords in localStorage in
 * production. This module intentionally implements a simple encoding option for demos only and
 * includes clear warnings in the API.
 */

const STORAGE_KEY_DEFAULT = 'tcr_user_v1';
const CURRENT_VERSION = 1;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Basic safe Base64 helpers that support Unicode
function base64Encode(str) {
  // encodeURIComponent -> escape UTF-8, then btoa
  return btoa(unescape(encodeURIComponent(str)));
}

function base64Decode(b64) {
  return decodeURIComponent(escape(atob(b64)));
}

/**
 * Detect quota-exceeded errors across browsers/APIs.
 * Returns true when the thrown error indicates storage quota was reached.
 */
export function isQuotaExceededError(err) {
  if (!err) return false;
  const name = err.name || '';
  if (name === 'QuotaExceededError' || name === 'QuotaExceededErr') return true;
  if (name === 'NS_ERROR_DOM_QUOTA_REACHED') return true;
  // older code values
  if (err.code === 22 || err.code === 1014) return true;
  const msg = String(err).toLowerCase();
  if (msg.includes('quota') || msg.includes('quotaexceeded') || msg.includes('quota exceeded')) return true;
  return false;
}

/**
 * Use the StorageManager estimate API to check approximate free quota before writing.
 * Returns true if the write of `bytesToWrite` would likely exceed quota.
 */
export async function willExceedQuotaApprox(bytesToWrite) {
  if (navigator.storage && typeof navigator.storage.estimate === 'function') {
    try {
      const { quota, usage } = await navigator.storage.estimate();
      if (typeof quota === 'number' && typeof usage === 'number') {
        return (usage + bytesToWrite) > quota;
      }
    } catch (e) {
      // ignore and fall back to try/catch write
    }
  }
  return false;
}

// Helper to prompt a user download for a backup blob (called when writes cannot complete)
function promptDownloadBackup(text, suggestedName = 'tcr_user_backup.json') {
  try {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = suggestedName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('promptDownloadBackup failed', e);
  }
}

/**
 * Demo wrappers for "encrypting" and "decrypting" payloads.
 *
 * IMPORTANT: These functions perform Base64 encoding/decoding only. Base64 is NOT
 * encryption and should not be treated as secure. These wrappers exist to provide a
 * clear, self-documenting API for demo/educational flows where consumers expect
 * encrypt/decrypt function names.
 *
 * Use these for demos only. For any production-sensitive data, use Web Crypto APIs
 * (AES-GCM, proper key derivation) and robust server-side storage/validation.
 *
 * @param {string} plaintext - UTF-8 string to encode.
 * @returns {string} Base64-encoded representation of the input.
 */
export function encryptDemo(plaintext) {
  if (typeof plaintext !== 'string') plaintext = String(plaintext || '');
  return base64Encode(plaintext);
}

/**
 * Demo decrypt wrapper matching `encryptDemo`.
 *
 * @param {string} ciphertext - Base64 string produced by `encryptDemo`.
 * @returns {string} Decoded UTF-8 plaintext.
 */
export function decryptDemo(ciphertext) {
  if (!ciphertext) return '';
  try{
    return base64Decode(String(ciphertext));
  }catch(e){
    console.warn('decryptDemo: failed to decode input', e);
    return '';
  }
}

/**
 * Minimal email validator used for client-side validation only.
 */
function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/**
 * User model class
 *
 * Stored JSON envelope (what is persisted to localStorage) has shape:
 * {
 *   meta: {
 *     version: number,        // schema version
 *     createdAt: ISOString,   // when record was created
 *     expiresAt: ISOString    // when client must re-authorize
 *   },
 *   user: {
 *     firstName: string,
 *     lastName: string,
 *     email: string,
 *     passwordBase64?: string // OPTIONAL and discouraged for production
 *   }
 * }
 */
export class User {
  /**
   * @param {Object} props
   * @param {string} props.firstName
   * @param {string} props.lastName
   * @param {string} props.email
   * @param {string} [props.passwordBase64] - OPTIONAL educational storage of password encoded in Base64
   * @param {number} [props.version]
   * @param {string} [props.createdAt]
   */
  constructor({ firstName = '', lastName = '', email = '', passwordBase64 = undefined, passwordSet = false, version = CURRENT_VERSION, createdAt = new Date().toISOString() } = {}) {
    this.firstName = String(firstName || '').trim();
    this.lastName = String(lastName || '').trim();
    this.email = String(email || '').trim();
    // For demo only: storing encoded password is optional and discouraged in production
    this.passwordBase64 = passwordBase64; // may be undefined
    // SECURITY NOTE: The `passwordBase64` field is supported for demo/education only.
    // Base64 is NOT encryption. Storing passwords (even encoded) in localStorage
    // exposes them to any script running on the page and to anyone with access
    // to the device. See docs/securty_review.md#client-side-storage and
    // docs/securty_review.md#base64-encoding-used-as-encryption for details.
    // passwordSet is a safer flag indicating the user created/set a password without storing it
    this.passwordSet = !!passwordSet;
    this.version = version;
    this.createdAt = createdAt;
  }

  /**
   * Return a plain object suitable for JSON serialization with versioning and timestamps
   *
   * @returns {{meta: {version: number, createdAt: string, expiresAt: string}, user: {firstName: string, lastName: string, email: string, passwordBase64?: string}}}
   */
  toObject({ expirationDays = 31 } = {}) {
    const createdAt = this.createdAt || new Date().toISOString();
    const createdMs = Date.parse(createdAt);
    const expiresAt = new Date(createdMs + expirationDays * MS_PER_DAY).toISOString();
    // notifyAt: one day before expiry for client-side scheduling or server reminders
    const notifyAt = new Date(createdMs + (Math.max(0, expirationDays - 1) * MS_PER_DAY)).toISOString();
    return {
      meta: {
        version: this.version || CURRENT_VERSION,
        createdAt,
        expiresAt,
        notifyAt,
      },
      user: {
        firstName: this.firstName,
        lastName: this.lastName,
        email: this.email,
        // passwordBase64 intentionally included only if set; again, discouraged in prod
        passwordBase64: this.passwordBase64,
        // lightweight flag indicating a password has been set (preferred over storing it)
        passwordSet: this.passwordSet,
      },
    };
  }

  /**
   * Create a JSON string (not encrypted) for storage or transfer. Use encode=true to Base64-encode
   * the whole payload for an added, but not secure, obfuscation layer (educational).
   *
   * Note: When encode=true the return value is a Base64 string that decodes to the JSON envelope
   * shown above. When encode=false the return value is the raw JSON string.
   *
   * @param {{ encode: boolean, expirationDays: number }} options
   * @returns {string} Base64 string or JSON string depending on options.encode
   */
  toJSON(options = { encode: true, expirationDays: 31 }) {
    const payload = this.toObject({ expirationDays: options.expirationDays });
    const json = JSON.stringify(payload);
    if (options.encode) return base64Encode(json);
    return json;
  }

  /**
   * Basic validation for display / client-side checks. Returns { valid: boolean, errors: string[] }
   */
  validate() {
    const errors = [];
    if (!this.firstName) errors.push('First name is required.');
    if (!this.lastName) errors.push('Last name is required.');
    if (!isValidEmail(this.email)) errors.push('Email is invalid.');
    // We don't require password present because we prefer not to store it here. If passwordBase64
    // is present we can validate its presence but not its strength. Consumers should prefer the
    // `passwordSet` boolean to indicate the user set a password without storing it.
    return { valid: errors.length === 0, errors };
  }

  /**
   * Migrate a raw object from storage to a User instance. Handles versioning.
   * Accepts either an already-parsed object or a Base64/JSON string depending on options.
   *
   * @param {object|string} input  Either the parsed envelope object or a string (Base64 or JSON)
   * @param {{ encoded: boolean }} options If true, `input` is treated as Base64-encoded JSON
   * @returns {User}
   */
  static fromJSON(input, options = { encoded: true }) {
    let obj;
    try {
      if (typeof input === 'string') {
        const raw = options.encoded ? base64Decode(input) : input;
        obj = JSON.parse(raw);
      } else {
        obj = input;
      }
    } catch (err) {
      throw new Error('Failed to parse user JSON: ' + String(err.message || err));
    }

    if (!obj || typeof obj !== 'object') throw new Error('Invalid user payload');
    const meta = obj.meta || {};
    const user = obj.user || {};

    // versioning: if a future version is encountered, we can add migration hooks here
    const version = meta.version || 1;
    if (version > CURRENT_VERSION) {
      // For now, accept but warn (consumer may want to handle migration)
      console.warn(`User.fromJSON: payload version ${version} > current ${CURRENT_VERSION}`);
    }

    const createdAt = meta.createdAt || new Date().toISOString();
    return new User({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      passwordBase64: user.passwordBase64,
      passwordSet: !!user.passwordSet,
      version,
      createdAt,
    });
  }
}

/**
 * UserStorage helpers: save/load/backup/restore to/from localStorage.
 */
export class UserStorage {
  /**
   * Save a User instance to localStorage. Options:
   * - key: localStorage key
   * - encode: whether to Base64-encode the payload (educational)
   * - expirationDays: days until reauthorization required
   */
  static save(user, options = { key: STORAGE_KEY_DEFAULT, encode: true, expirationDays: 30 }) {
    if (!(user instanceof User)) throw new Error('save expects a User instance');
    // async save to allow StorageManager estimate checks and better quota handling
    return (async () => {
      const json = user.toJSON({ encode: options.encode, expirationDays: options.expirationDays });
      // estimate bytes for the payload
      let bytes = null;
      try { bytes = new Blob([json]).size; } catch(e) { bytes = null; }

      // pre-check approximate quota
      if (bytes !== null) {
        try {
          const likely = await willExceedQuotaApprox(bytes);
          if (likely) {
            console.warn('UserStorage.save: quota likely exceeded (pre-check)');
            // prompt user to download a backup before we bail
            promptDownloadBackup(json, `tcr_user_backup_${new Date().toISOString().slice(0,10).replace(/-/g,'')}.json`);
            return false;
          }
        } catch (e) {
          // ignore pre-check failures and fall back to try/catch write
        }
      }

      try {
        localStorage.setItem(options.key, json);
        return true;
      } catch (err) {
        console.error('UserStorage.save: failed to save to localStorage', err);
        if (isQuotaExceededError(err)) {
          // Prompt a backup download so user doesn't lose data
          try {
            promptDownloadBackup(json, `tcr_user_backup_${new Date().toISOString().slice(0,10).replace(/-/g,'')}.json`);
          } catch (e) { /* ignore */ }
          return false;
        }
        return false;
      }
    })();
  }

  /**
   * Load a user from localStorage. Returns { user: User|null, expired: boolean }
   */
  static load(options = { key: STORAGE_KEY_DEFAULT, encoded: true }) {
    try {
      const raw = localStorage.getItem(options.key);
      if (!raw) return { user: null, expired: false };
      // Try parse then check expiry
      const decoded = options.encoded ? base64Decode(raw) : raw;
      const obj = JSON.parse(decoded);
      const expiresAt = (obj && obj.meta && obj.meta.expiresAt) ? Date.parse(obj.meta.expiresAt) : null;
      const now = Date.now();
      const expired = expiresAt ? now > expiresAt : false;
      const user = User.fromJSON(obj, { encoded: false });
      return { user, expired };
    } catch (err) {
      console.warn('UserStorage.load: failed to load/parse user', err);
      return { user: null, expired: false };
    }
  }

  /**
   * Remove the stored user from localStorage.
   */
  static remove(options = { key: STORAGE_KEY_DEFAULT }) {
    try {
      localStorage.removeItem(options.key);
      return true;
    } catch (err) {
      console.error('UserStorage.remove error', err);
      return false;
    }
  }

  /**
   * Create a backup string for the stored user. Returns null if nothing stored.
   * The backup string is Base64-encoded JSON so it can be saved to a file easily.
   */
  static backup(options = { key: STORAGE_KEY_DEFAULT }) {
    try {
      const raw = localStorage.getItem(options.key);
      if (!raw) return null;
      // Wrap with a small envelope including exportedAt and app metadata
      const envelope = {
        meta: {
          exportedAt: new Date().toISOString(),
          app: 'Titan Coffee Run',
          formatVersion: CURRENT_VERSION
        },
        payload: raw,
      };
      // SECURITY NOTE: The backup string wraps the entire payload and is
      // Base64-encoded for convenience. Backups can contain user data and
      // (for demos) might contain encoded passwords. Treat backups as
      // sensitive artifacts: store them securely and avoid including
      // secret material. See docs/securty_review.md#backup--restore-file-handling
      // for recommendations.
      const backupString = base64Encode(JSON.stringify(envelope));
      // Suggest a filename that includes the app and date for convenience
      const date = new Date().toISOString().slice(0,10).replace(/-/g,'');
      const fileName = `tcr_user_backup_${date}.tcrbak`;
      return { backupString, fileName };
    } catch (err) {
      console.error('UserStorage.backup error', err);
      return null;
    }
  }

  /**
   * Restore from a backup string created by backup(). If the backup includes a different key or
   * encoding, the caller can pass the target key.
   */
  static restore(backupString, options = { key: STORAGE_KEY_DEFAULT }) {
    try {
      if (!backupString) throw new Error('No backup string provided');
      const envelopeJson = base64Decode(backupString);
      const envelope = JSON.parse(envelopeJson);
      if (!envelope || typeof envelope !== 'object' || !envelope.payload) throw new Error('Invalid backup envelope');
      localStorage.setItem(options.key, envelope.payload);
      return true;
    } catch (err) {
      console.error('UserStorage.restore error', err);
      return false;
    }
  }
}

// Export helpers
export const DEFAULTS = {
  STORAGE_KEY_DEFAULT,
  CURRENT_VERSION,
};

// in page context (same code as module)
const json = JSON.stringify({hello:'world'});
const b64 = btoa(unescape(encodeURIComponent(json))); // same as base64Encode
console.log(b64);
