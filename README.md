# Titan Coffee Run

**Tested**

- Chrome (Latest):  [x]
- Firefox (Latest): [ ]
- Edge (Latest):    [ ]

Notes: I could NOT figure out how to test for Firefox or Edge (oddly) without seemingly having to make a server for this as it's client side only app.  More research should go into this.

_How to test:_ Open `sales.html` (or `index.html`) in each browser, use the "Play Sales" button and the "Reset Graph" button to verify animation and hover behavior. Record results above.

Module 4 Questions: 
1. Biggest AhA moment:  
   Asking to "dumb" down many times to make sure code was readable, usable, testable.  Had multiple failures before success on several parts...nav menu (still needs Hamburger style for small screens),  actual security without becoming a full blown security coding expert (which i'm not...hence the many code comments by me and the AI)

   A second AI is that it is constantly evolving.  Agents, Agentic AI Automation,  Spec Driven development.  In some ways it helps devs create basic infrastructure and some details that were previously handed to UI/UX devs can be done "in house" in mere moments. Not days.  

   This AI is not going away.  New dev entry level jobs will go pooof.  As is happening NOW not later.  Not when the tech stack matures...but now.  

   I am ashamed I had to use too much of it but I can't imagine what CS Grads are going to do.  

Tools Used: 
1. VS Code CoPilot
2. Google Gemini

Percentage estimate: 
85-90% AI code, but tested and reviewed.  
Personal notations were made in several files. 

Specific Comments:
1. Form Validation class (will rework and insert) --- see registration.js ---
2. Will see about vulnerabilities.  I believe it asked me to add test software and automated testing.  I thought that was beyond my scope and asked to doc the security instead.  I will try to reassess and upload the changes.
3. See security_review.md for changes I asked to be made to point out vulnerabilities but not make those chages (yet)  --- has ## security findings ## section on top.

To Start: 
Lightweight demo site and teaching scaffold for a small client-side application (forms, storage, and simple auth demos).

Status (current)
- Branch: `work/save-local-20251112-2036`
- Last update: 2025-11-12
- This repo is primarily a static front-end demo with an optional local dev server used for testing authentication flows.
- Several client-side demo modules were added: onboarding/registration, a versioned local storage user model, a demo SessionManager, a client-side rate-limiter, and a dev-server scaffold for testing password-history checks.



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

_This README was updated automatically to reflect the current workspace state._

---

_This README was updated automatically to reflect the current workspace state._

## Cart & Orders (Demo)

- **Cart storage:** Client-side demo cart is persisted in `sessionStorage` under the key `tcr_demo_cart_v1`. See `src/js/cart.js` for the API (`Cart.addItem`, `Cart.updateQty`, `Cart.removeItem`, `Cart.clear`, `Cart.getTotals`). This keeps cart data across page reloads for the current tab but clears when the tab/window closes.
- **Checkout flow:** `checkout.html` reads the cart from the Cart API, shows a contact form (Name, Email, Phone), and provides a `Final Pay Now` button which simulates payment for demo purposes. After successful payment the demo clears the cart and reveals a `View Receipt` button the user can click to inspect the saved receipt.
- **Receipt storage:** The demo saves the last receipt to `localStorage` under the key `tcr_last_order` as a JSON object with shape `{ id, name, email, phone, cart, totals, createdAt }`. Use the browser DevTools Storage panel or `localStorage.getItem('tcr_last_order')` in Console to view it.
- **Receipt page:** `receipt.html` displays the last saved receipt (items and totals) and includes a link back to `menu.html`.

Note: these behaviors are for demonstration only. Client-side storage and client-only payment simulation are insecure for production.

```

## Small inline styles

- The `checkout.html` page includes a very small inline CSS block used only by that page to keep the demo focused and self-contained. The inline rules are intentionally minimal (layout tweaks for the checkout column) and are documented in the page header explaining that they may be moved to `src/styles/main.css` later. Keeping a few page-specific styles inline speeds teaching/debugging and avoids large refactors in class exercises.
