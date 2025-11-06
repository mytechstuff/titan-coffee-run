# Titan Coffee Run

A starter project scaffold for the Titan Coffee Run application.

Structure
```
Titan Coffee Run/
├── node_modules/
├── public/
├── src/
│   ├── api/
│   ├── assets/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── styles/
│   └── utils/
├── .gitignore
├── package.json
└── README.md
```

How to use
- Open the folder in VS Code.
- Run `npm install` to install dependencies (none yet).
- Place source files under `src/` and static assets under `public/`.

Notes
- `node_modules/` is included in the structure but normally managed by npm/yarn.

Recent cleanup
- Removed `public/index.html` demo file (kept the canonical `index.html` at repo root).

Planned pages (deferred)
- `menu.html`, `locations.html`, `contact.html` — planned static pages to be added in a follow-up session. These will reuse the carousel module for visual consistency. See `devnotes.md` for details and the implementation plan.

Client vs Server responsibilities
---------------------------------
- Validation and business rules live in `src/qualify.js` (pure functions). The client imports these functions for immediate feedback and to show the provisional decision banner.
- The `server/` code previously provided an authoritative endpoint and persisted applications. This project is currently configured as a client-only learning app: the server has been removed and sample application records sanitized. The client-side decision UI is intentionally provisional and not an authoritative record.
- If you later need persistence, auditability, or integrations (email, background jobs, or external APIs), reintroduce a server endpoint to perform server-side validation, decisioning and storage. Keep `src/qualify.js` as the single source of truth so server and client stay consistent.

If you want me to restore or archive the previous `server/` implementation instead of deleting it, I can do that.
