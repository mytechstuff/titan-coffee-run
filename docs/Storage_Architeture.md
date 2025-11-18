`````markdown
````markdown
Storage_Architeture.md

## Notes index

- [Migrations & upgrade helpers](#migrations--upgrade-helpers)

Task 5: Web storage — prompt and responses
Storage_Architeture.md

Task 5: Web storage — prompt and responses

1) User prompt (Task 5)

- Create a `User` class with methods: `toJSON()`, `fromJSON()`, `validate()`.
- Store users in localStorage with an encryption library or Base64 encoding (for educational purposes).
- Implement data versioning for future schema changes (user data structure evolution).
- Add data expiration (re-authorize after 30 days).
- Implement backup/restore functionality.

2) What I implemented (summary)

Files added/changed:
- `src/js/userStorage.js` (new)
  - Exports:
    - `class User` — constructor(props), `toObject()`, `toJSON({encode,expirationDays})`, `validate()`, `static fromJSON(input,{encoded})`.
    - `class UserStorage` — `save()`, `load()`, `remove()`, `backup()`, `restore()`.
    - `DEFAULTS` export with storage key and current version.
  - Design choices:
    - The stored payload is a JSON envelope with `meta` and `user` keys (see example below).
    - Default encoding is Base64 (educational obfuscation only).
    - Expiration is implemented via `meta.expiresAt` (default 30 days from creation).
    - Versioning via `meta.version` (CURRENT_VERSION = 1). `fromJSON()` warns on newer versions.
    - Backup returns an envelope Base64 string plus a suggested filename; restore consumes the same envelope.
    - Clear warnings in JSDoc and comments: Base64 is NOT encryption and passwords must not be stored in production.

- `src/js/registration.js` (modified)
  - Imports `User` and `UserStorage`.
  - On demo registration success the code constructs a safe `User` (firstName, lastName, email) and calls `UserStorage.save(user)` before clearing the form.
  - Hooked up Backup and Restore UI to download a `.tcrbak` file and to import it back into storage and pre-fill the registration form.
  - Replaced alert dialogs with a small inline `#backupStatus` visual confirmation.

- `register.html` (modified)
  - Added `Download backup` and `Restore from file` buttons plus hidden file input and `#backupStatus` element.

3) JSON envelope (schema example)

Stored envelope (what `User.toJSON({encode:false})` would produce):

{
  "meta": {
    "version": 1,
    "createdAt": "2025-11-12T20:36:00.000Z",
    "expiresAt": "2025-12-12T20:36:00.000Z"
  },
  "user": {
    "firstName": "Ada",
    "lastName": "Lovelace",
    "email": "ada@example.com",
    "passwordBase64": undefined // OPTIONAL and discouraged for production
  }
}

Backup envelope (what `UserStorage.backup()` wraps and Base64-encodes):

{
  "meta": {
    "exportedAt": "2025-11-12T20:45:00.000Z",
    "app": "Titan Coffee Run",
    "formatVersion": 1
  },
  "payload": "<Base64 encoded JSON envelope from above>"
}

The `.tcrbak` file is a Base64-encoded JSON string of the backup envelope. The registration UI downloads this file with a suggested filename like `tcr_user_backup_20251112.tcrbak`.

4) Security & design considerations (short)

- Base64 is NOT encryption. It's obfuscation only. For production you must use server-side storage with proper hashing for passwords (bcrypt/Argon2) and TLS for transport.
- Client-side encryption is tricky: key management is the hard part. If you want to encrypt local backups, use Web Crypto (AES-GCM) but you still need a secure place to store the key or derive it from a user passphrase.
- Never store plain-text passwords in localStorage. The current registration flow intentionally does not persist plain passwords. The `User` class accepts an optional `passwordBase64` for educational demos only.
- Versioning: including `meta.version` lets us write migration code when the schema changes in the future. `User.fromJSON()` currently warns if a payload version is newer than application code.
- Expiration: `meta.expiresAt` is enforced client-side; this UX pattern requires server-side re-authorization in production.
- Backup integrity: we rely on formatVersion and exportedAt. For more security, add a signature (HMAC) or encrypt backup with a passphrase.

5) Implementation choices and tradeoffs

- Choice: Base64 encode the whole envelope by default
  - Why: simple to explain and safe for a demo; avoids binary pitfalls when saving to localStorage/file.
  - Tradeoff: not secure. Use only for learning.

- Choice: Simple JSON envelope with meta + user
  - Why: easy migration path and straightforward to inspect and debug.
  - Tradeoff: slightly larger payload but better long-term maintainability.

- Choice: Client-side expiration
  - Why: easy demo that shows how to force the user to re-authorize after N days.
  - Tradeoff: can be bypassed by clearing/modifying client data; production must be server-enforced.

6) How to confirm it works (quick checklist)

- Start a simple HTTP server from repo root (ES modules require http):

```powershell
cd "c:\Users\mikec\Titan Coffee Run"
python -m http.server 8080
# or: npx http-server -c-1 -p 8080
```

- Visit http://localhost:8080/register.html
- Fill and submit the registration form (demo). Expected: `#backupStatus` shows a success message and localStorage key `tcr_user_v1` is set.
- Open DevTools → Application → Local Storage: inspect `tcr_user_v1` (Base64 string). Decode it by running in Console:

```js
const s = localStorage.getItem('tcr_user_v1');
const decoded = JSON.parse(decodeURIComponent(escape(atob(s))));
console.log(decoded);
```

- Click "Download backup" — a `.tcrbak` file should download. Open it in a text editor and decode the Base64 payload to inspect the embedded envelope.
- Click "Restore from file" and select the `.tcrbak` file — the registration form should prefill and `#backupStatus` should show success.

7) Recommended next improvements (if you want to continue)

- Add optional AES-GCM encryption for backup files using Web Crypto and a user-supplied passphrase (with PBKDF2/Argon2KDF). Document how the passphrase is used and stored (do NOT store passphrases in localStorage!).
- Add migration helpers for future schema versions (e.g., `migrateV1toV2(obj)`), and a test harness for migrations.
- Add unit tests for the `User` and `UserStorage` classes (Jest + jsdom) and small E2E for backup/restore (Playwright).
- Add a server-side endpoint for persistent, secure backups if users opt in (requires auth + secure storage + encryption at rest).


8) Choices made (based on your responses)

a) Backup security: keep simple Base64 encoding for educational/demo purposes (no passphrase). This keeps the flow easy to use and portable. Note: Base64 is not secure.

b) Password handling: use a `passwordSet` boolean flag. The code records `passwordSet: true` on successful registration but does not store the actual password.

c) Retention/expiration policy: default expiration changed to 31 days. The stored envelope includes `meta.notifyAt` set to 30 days after creation to allow sending (or scheduling) a notification one day before expiration.

d) Backup filename: use `tcr_user_backup_YYYYMMDD.tcrbak` (date-based, sortable). This is implemented by `UserStorage.backup()`.

e) Restore UX: keep file-picker restore only (no copy/paste import) to reduce accidental paste exposures.

f) Branch workflow: keep working on the WIP branch (`work/save-local-YYYY...`) — do not merge to `main` yet.

9) Where I placed the doc

- `Storage_Architeture.md` was created at repository root. (I used the exact filename you asked for.)

---

If you answer the questions above I will:
- update the design or implementation per your choices (e.g., add optional Web Crypto encryption, change filename format, change retention policy),
- optionally add the backup "paste/import" UI, and
- merge to `main` if you request it.

If you want, I can also run one quick server-run and programmatic smoke tests for the backup/restore flow and paste the console output here. Let me know which follow-ups to take next.

---

**Recent Q&A: localStorage security and hardening (User prompt + Assistant answer)**

User prompt:

- "Task 5 Explain: Explain the securtity limitation of localStorage and suggest 3 ways to make more secure to storing crdentials."

Assistant response (summary):

- Security limitations of `localStorage`:
  - Accessible to any JavaScript on the page (XSS risk).
  - No HttpOnly/Secure flags like cookies.
  - Persistent and device-local (can be read by anyone with device access or malware).
  - No built-in integrity/authentication (no tamper-detection).
  - Shared origin surface increases supply-chain risk.

- Three safer approaches explained:
  1) Move secrets to the server and use secure session cookies (recommended): store only short-lived session tokens client-side, use `HttpOnly` + `Secure` cookies, hash passwords server-side (Argon2/bcrypt), rotate tokens, and protect against CSRF.
  2) If storing client-side is required, encrypt with Web Crypto + passphrase-derived key: derive a key (PBKDF2/Argon2), encrypt with AES-GCM, store ciphertext+salt+IV; caveat: key management and UX (passphrase) are hard.
  3) Use platform-backed credentials / modern auth (WebAuthn, OS credential manager): rely on hardware-backed keys or the Credential Management API and store only short-lived tokens in memory or HttpOnly cookies.

- Quick hardening tips: store minimal indicators (`passwordSet`), short TTL and rotation, protect backups (HMAC/encrypt), strong XSS defenses (CSP/SRI/sanitization), and logging/monitoring.

---

**Recent Q&A: Base64 encode/decode helpers (User prompt + Assistant answer)**

User prompt:

- "use current approach. did you create a simply encryption / decryption wrapper function?"

Assistant response (summary):

- Short answer: yes — the module contains simple UTF-8-safe Base64 encode/decode helpers (`base64Encode` / `base64Decode`) in `src/js/userStorage.js`.
- Where they are used:
  - `User.toJSON()` uses `base64Encode` when `{ encode: true }`.
  - `UserStorage.backup()` creates a Base64-wrapped envelope and `UserStorage.restore()` uses `base64Decode` to read backups.
- Important note: Base64 is not encryption; it is obfuscation only and does not protect secrets against XSS or local access.
- Quick usage examples (browser console):
  ```js
  // Encode JSON
  const json = JSON.stringify({hello:'world'});
  const b64 = btoa(unescape(encodeURIComponent(json))); // base64Encode equivalent

  // Decode back
  const decoded = decodeURIComponent(escape(atob(b64))); // base64Decode equivalent
  console.log(JSON.parse(decoded));
  ```

- Offer: add cosmetic wrapper functions `encryptDemo()`/`decryptDemo()` that call the Base64 helpers, or optionally implement AES-GCM Web Crypto wrappers (requires passphrase UX). Per your preference we kept the simple Base64 approach.

---

## Migrations & upgrade helpers

This project stores `User` objects in a versioned JSON envelope in client storage. When you change the `User` shape (add/remove/rename fields) you must ensure older records remain readable and upgradable. The guidance below explains a safe, tested approach you can adopt. This is documentation only — no runtime code has been changed as part of this documentation update.

Summary / reasons why:

- Store a `meta.version` in each envelope so code can detect older formats and apply migrations.
- Prefer lazy (read-time) migration for small datasets and batch migration for large datasets or controlled upgrade windows.
- Keep an ordered set of migration functions so any old version can be upgraded to the current one by applying successive steps.
- Make migrations idempotent, testable, and reversible where possible; always take a backup before batch changes.

Migration pattern (recommended)

1. Maintain a single `CURRENT_VERSION` constant in your storage module.
2. Create a `migrations` map keyed by version (e.g., `1 -> migrateV1toV2`, `2 -> migrateV2toV3`). Each function accepts an envelope and returns a new envelope with `meta.version` bumped.
3. Implement an `applyMigrations(envelope)` helper that repeatedly applies the next migration until the envelope reaches `CURRENT_VERSION`.
4. When loading a record (`User.fromJSON()` or `UserStorage.load()`), call `applyMigrations()` before returning. Optionally write the upgraded envelope back to storage (lazy migration).
5. Provide a `batchUpgrade()` admin helper (separate script or debug UI) that iterates all stored keys, applies `applyMigrations()`, and overwrites items after creating a timestamped backup file.

Lazy migration example (doc-only snippet)

```js
const CURRENT_VERSION = 2;
const migrations = {
  1: (envelope) => {
    // v1 -> v2: add `phoneNumber` and `role` defaults
    envelope.user = envelope.user || {};
    if (!('phoneNumber' in envelope.user)) envelope.user.phoneNumber = null;
    if (!('role' in envelope.user)) envelope.user.role = 'user';
    envelope.meta = envelope.meta || {};
    envelope.meta.version = 2;
    return envelope;
  }
};

function applyMigrations(envelope) {
  let v = (envelope.meta && envelope.meta.version) || 1;
  while (v < CURRENT_VERSION) {
    const migrate = migrations[v];
    if (!migrate) {
      console.warn(`No migration defined for version ${v} -> ${v+1}`);
      break;
    }
    envelope = migrate(envelope) || envelope;
    v = envelope.meta.version;
  }
  return envelope;
}

// On load (lazy):
// const env = decodeAndParse(raw); const upgraded = applyMigrations(env); writeBackIfChanged(upgraded);
```

Batch upgrade & backup (doc-only snippet)

```js
function backupAll(prefix = 'tcr_user_') {
  const timestamp = new Date().toISOString().replace(/[:.]/g,'-');
  const backup = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith(prefix)) backup[k] = localStorage.getItem(k);
  }
  // download backup JSON blob (user action)
}

function batchUpgrade(prefix = 'tcr_user_') {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key.startsWith(prefix)) continue;
    try {
      const raw = localStorage.getItem(key);
      const envelope = JSON.parse(raw);
      const upgraded = applyMigrations(envelope);
      if (JSON.stringify(upgraded) !== JSON.stringify(envelope)) {
        localStorage.setItem(key, JSON.stringify(upgraded));
      }
    } catch (err) {
      console.error('Failed to migrate', key, err);
    }
  }
}
```

Where to place the helpers

- Keep migration code alongside `User`/`UserStorage` (e.g., `src/js/userStorage.js`) or in a dedicated `src/js/migrations.js` helper file. Export `applyMigrations()` and call it from `User.fromJSON()` so migration happens automatically on parse.
- Expose `batchUpgrade()` only behind a debug/admin UI or run it manually from the browser console after taking a backup.

Best practices checklist (documentation)

- Backup first: always export all matching localStorage keys before bulk edits.
- Test each migration function: unit tests that assert vN -> vN+1 shapes.
- Make migrations idempotent and safe to re-run.
- Provide sensible defaults for new fields and avoid breaking required-field assumptions.
- Write the upgraded envelope back only after successful migration; use a temporary backup key during the write to reduce corruption risk.
- Log progress and exceptions during batch upgrades; consider small batches for large datasets.

If you want, I wired the helpers into `UserStorage.save()` so the save flow pre-checks quota and triggers a backup download on failure. This is a conservative fallback for demos; production flows should prefer server-side persistence or IndexedDB for large data.

If you answer the questions above I will: