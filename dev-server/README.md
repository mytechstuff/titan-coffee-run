# Dev Server — Titan Coffee Run

This folder provides a tiny Express server for local testing of JWT issuance and login flows.

Install and run:

```powershell
cd dev-server
npm install
npm start
```

The server listens on `http://localhost:3000` by default.

POST /login
- body: `{ "email": "demo@example.com", "password": "DemoPass123" }`
- response: `{ ok: true, token: "<jwt>" }`

This is for local development only. The `JWT_SECRET` can be set via environment variable.
