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