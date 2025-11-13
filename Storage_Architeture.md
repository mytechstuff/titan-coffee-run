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