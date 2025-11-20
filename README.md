# Titan Coffee Run

**Tested**

- Chrome (Latest): [ ]
- Firefox (Latest): [ ]
- Edge (Latest): [ ]

_How to test:_ Open `sales.html` (or `index.html`) in each browser, use the "Play Sales" button and the "Reset Graph" button to verify animation and hover behavior. Record results above.


Tools Used: VS Code CoPilot
Google Gemini

Percentage estimate: 85-90% AI code, but tested and reviewed.  Personal notations were made in several files. 

Lightweight demo site and teaching scaffold for a small client-side application (forms, storage, and simple auth demos).

Status (current)
- Branch: `work/save-local-20251112-2036`
- Last update: 2025-11-12
- This repo is primarily a static front-end demo with an optional local dev server used for testing authentication flows.
- Several client-side demo modules were added: onboarding/registration, a versioned local storage user model, a demo SessionManager, a client-side rate-limiter, and a dev-server scaffold for testing password-history checks.

Quick start

1. Static preview (no server): open pages in a browser (some ES modules require HTTP).
   - Open `index.html`, `apply.html`, `login.html`, or `register.html` directly for quick static previews.
2. Local dev server (demo auth features):

```powershell
cd "c:\Users\mikec\Titan Coffee Run\dev-server"
npm install
# optional: set secrets for demo behavior
# $env:JWT_SECRET = 'dev-secret-please-change'
# $env:SERVER_PEPPER = 'replace-with-secure-pepper'
npm start
```

Files and notable modules

- Top-level pages:
  - `index.html`, `apply.html`, `login.html`, `register.html`, `menu.html`, `protected.html`
- Source (client JS): `src/`
  - `src/index.js` — carousel and root script
  - `src/qualify.js` — form validation and demo wiring for `apply.html`
  - `src/js/userStorage.js` — versioned user model, storage helpers, backup/restore
  - `src/js/registration.js` — registration form wiring
  - `src/js/login.js` — login wiring and demo token flow
  - `src/js/loginRateLimiter.js` — client-side rate-limiter (UX layer)
  - `src/js/sessionManager.js` — centralized demo token handling

- Dev server: `dev-server/`
  - `dev-server/server.js` — small Express demo server (issues JWTs, added password-history demo endpoints)
  - `dev-server/package.json` — includes `express`, `jsonwebtoken`, and `argon2` for the demo

- Documentation and notes:
  - `docs/devnotes.md` — developer notes, architecture rationale, and change-log
  - `docs/securty_review.md` — security review and guidance (password history, reset flows)
  - `secure_optios.md` — duplicate pointer (typo file)

Security / important warnings

- This project contains multiple client-side demo implementations of auth and storage. These are deliberately educational and are NOT production-ready:
  - Demo tokens are unsigned Base64 tokens in the client by default — do not use for real auth.
  - Sensitive data such as passwords or PII must not be stored in localStorage in production. See `docs/securty_review.md` for guidance.
  - The `dev-server` includes an in-memory password-history demo using Argon2 for testing only; it is not persistent and is for local development.


Contact / notes

Student: Michael Chretien
ID: 

---

_This README was updated automatically to reflect the current workspace state._
