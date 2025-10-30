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
