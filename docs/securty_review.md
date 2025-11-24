````markdown
# Secure password-history and reset guidance

This file contains a focused explanation of how to securely store password history without keeping plaintext passwords, and a short summary of a secure reset approach for context. This is intended as guidance for the dev-server demo and for future production hardening.

## Short answer
Never store plaintext passwords. Store a short history of strong password hashes (Argon2id), each with a unique salt and stored hashing parameters. To detect reuse, verify the candidate password against each historical hash using the stored parameters. Optionally, use an HMAC 'fingerprint' with a server-only pepper for faster checks at the cost of additional secret handling.

## Concrete design

- Hash algorithm: Argon2id (use a maintained library such as `argon2`).
- Per-history entry stored fields:
  - `argon_hash` (encoded Argon2 hash string)
  - `argon_params` (optional JSON describing time/memory/parallelism)
  - `created_at` timestamp
- Keep only the last N entries (recommend 3–7, commonly 5).

### Password-change flow
1. On a password-change request, fetch last N history entries for the user.
2. For each entry, perform `argon2.verify(entry.argon_hash, candidate + pepper)` (if using pepper).
3. If any verify true, reject the new password as reused.
4. Otherwise, hash the new password with Argon2id and insert it as the newest history entry; trim older entries to keep N.
5. Invalidate existing sessions/tokens for the user as appropriate.

### Optional fast check
- Compute `fingerprint = HMAC_SHA256(password, server_pepper)` and store it in a separate `password_history_fast` table for quick equality checks. This avoids repetitive Argon2 work but places critical trust on the pepper kept secret (HSM/KMS recommended).

## Security & operational notes
- Argon2 is intentionally slow; hashing candidate against N history entries costs N Argon2 ops — acceptable for small N and infrequent changes, but rate-limit the endpoint to prevent abuse.
- Protect pepper and HMAC keys in a secrets manager (do not commit to repo).
- Store Argon2 params per-entry so old entries remain verifiable after parameter upgrades.
- Re-hash active password on next login when parameters improve.
- Monitor, log (without passwords), and rate-limit password-change requests.

## Demo server example
A demo `dev-server` in this repo includes `POST /change-password` which verifies candidate passwords against an in-memory history using Argon2, and `GET /password-history` which lists history timestamps for the demo user. This is for demonstration only — in production you must use a persistent DB and secure secret storage.

---

*This file is guidance and documentation only. It does not change the running application by itself.*

## Password-reset flow (Mermaid)

The diagram below shows a compact flow for the recommended password-reset process (no email) discussed in this document. You can paste this snippet into any Mermaid-compatible renderer (GitHub, Markdown preview with Mermaid, or diagrams.net with Mermaid support).

```mermaid
flowchart TD
  A[User requests password reset] --> B{Choose registered method}
  B --> C[TOTP (authenticator app)]
  B --> D[WebAuthn / Passkey]
  B --> E[Verified device / push]
  C --> F[Verify method]
  D --> F
  E --> F
  F --> G[Issue short-lived single-use reset token (store only token hash server-side)]
  G --> H[Open reset page and submit new password]
  H --> I[Validate password, check history, store hashed password]
  I --> J[Invalidate existing sessions, log event, notify user]

  style G fill:#f9f,stroke:#333,stroke-width:1px
```

## Security Findings (Code Review)

This section documents high-priority issues discovered during a quick repository review. Each finding includes a short explanation and a pointer (file + comment anchor) that appears in the codebase. The code comments link back to these numbered findings so reviewers can find the details here.

### 1) Client-side storage of authentication / sensitive flags
- Problem: Storing authentication state (e.g. `adminLoggedIn`) in `localStorage` is insecure because it can be trivially modified by any script running in the page or by a user.
- Impact: Elevated privileges can be simulated by an attacker or by accidental tampering, allowing access to admin-only UI.
- Files: `index.html` (script that toggles `#sales-link`), `src/js/sales-graph-simple.js` (initialization checks `adminLoggedIn`), `src/js/login.js` (sets `localStorage.setItem('adminLoggedIn','true')`).
- Remediation (summary): Do not rely on client-side flags for authorization. Perform authorization checks on the server and surface only UI hints based on server-signed, short-lived tokens (HTTP-only cookies or signed JWTs validated server-side).

### 2) Base64 encoding used as "encryption" and storing optional encoded passwords
- Problem: `src/js/userStorage.js` exposes `encryptDemo`/`decryptDemo` which perform Base64 encoding only; Base64 is NOT encryption. In addition `User` objects optionally include `passwordBase64` in the persisted payload.
- Impact: Sensitive data persisted to localStorage can be read by any script or by anyone with access to the device; encoding gives a false sense of security.
- Files: `src/js/userStorage.js` (see `encryptDemo`, `decryptDemo`, `User` and `UserStorage.backup()` / `.restore()`).
- Remediation (summary): Remove any storage of raw or encoded passwords. Mark demo code clearly and keep such payloads out of production branches. For production, use server-side storage of password hashes and short-lived client tokens only.

### 3) Client-side rate-limiting is tamperable
- Problem: `src/js/loginRateLimiter.js` implements a client-side rate limiter using `localStorage`. This is useful for UX but can be reset or modified by users or malicious scripts.
- Impact: Attackers can bypass client-side throttling to brute-force credentials if server-side limits are not present.
- Files: `src/js/loginRateLimiter.js`.
- Remediation: Enforce rate limits and lockouts on the server, using IP + account heuristics and progressive delays. Keep the client-only limiter for UX only.

### 4) Demo credentials & client-side authentication checks
- Problem: `src/js/login.js` contains `DEMO_USERS` with plaintext passwords and performs client-side authentication (via `fakeAuth`) including creating tokens client-side for demo purposes.
- Impact: These demo secrets should never be used in production and cause dangerous expectations about client-side checks. They can leak if logs are captured.
- Files: `src/js/login.js`.
- Remediation: Keep demo credentials strictly in demo branches and remove them before production. Always verify credentials on the server.

### 5) innerHTML assignment without escaping (XSS risk)
- Problem: `src/qualify.js` uses `innerHTML` to insert user-visible messages (`showSummary`) without escaping content.
- Impact: If any of the messages include user-supplied content (or are constructed from untrusted strings), this permits XSS.
- Files: `src/qualify.js` (function `showSummary`).
- Remediation: Escape/encode user-supplied strings before adding to `innerHTML`, or use DOM APIs (`createElement`/`textContent`) to build nodes.

### 6) Password-reset placeholder and UI behavior
- Problem: `src/js/password-reset.js` contains a `fakeRequest()` placeholder and client-side guidance but the demo must not be used as production behavior. The file already recommends server-side token issuance and uniform responses, but reviewers must ensure server handling implements these.
- Impact: If developers copy/paste the fake behavior into a server implementation without token validation, account compromise is possible.
- Files: `src/js/password-reset.js`.
- Remediation: Implement server-side one-time token issuance, store only token hashes server-side, rate-limit requests, and always return a generic success response.

### 7) Backup / restore file handling
- Problem: `UserStorage.backup()` creates a downloadable Base64 envelope that can include the entire stored payload. While convenient for demos it is risky if backups include sensitive data.
- Impact: Backups on disk can be exfiltrated and give attackers direct access to stored user data.
- Files: `src/js/userStorage.js` (`backup()` / `restore()`).
- Remediation: Do not include passwords in backups; encrypt backups using a user-provided passphrase and recommend secure storage for backup files.

### 8) Additional notes and testing
- Serve the site over HTTPS during testing. Use secure cookie flags (`Secure`, `HttpOnly`, `SameSite`) for session cookies. Ensure CORS and CSRF protections are in place for any server endpoints.

---

References:
- See file comments that point to these numbered findings (e.g. `docs/securty_review.md#client-side-storage`).
- OWASP Top Ten: https://owasp.org/www-project-top-ten/
- MDN Web Docs on storage and cookies: https://developer.mozilla.org/
