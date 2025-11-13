# Titan Coffee Run — Developer Notes



## How to add more notes

Follow this lightweight template when adding detailed notes:

### Title (short, searchable)

- **File(s)**: list the file paths this note concerns
- **Why**: short rationale for the design choice
- **What it does**: brief technical summary
- **Tricky parts / gotchas**: bullet list
- **Suggested improvements**: optional next steps

Place new notes under a new heading in this `devnotes.md` file, or add files under a `docs/` folder for longer guides. Use markdown links to cross-reference topics.
## Project description

Titan Coffee Run is a small, static front-end scaffold for a coffee shop promo site. It includes a lightweight hero area, a small informational grid, and a simple, dependency-free image carousel/banner rotator that auto-rotates every 3 seconds. The project is intentionally minimal so it can be used as a starting point for a simple marketing site or as a template for a slightly larger front-end app.

This document is the living developer notes for the project. Add new sections under the "Notes index" so other contributors can quickly find design rationale, tricky bits, and instructions for local development or deployment.

---

## Notes index

- [Project structure](#project-structure)
- [How the carousel loads](#how-the-carousel-loads)
- [Carousel — slides.forEach explained](#carousel---slidesforeach-explained)
- [Carousel — indicators explained](#carousel---indicators-explained)
- [Aside element rationale](#aside-element-rationale)
- [Styles and asset placement](#styles-and-asset-placement)
- [Accessibility considerations](#accessibility-considerations)
- [How to add more notes](#how-to-add-more-notes)
- [Change log / history](#change-log--history)

- [Browser storage options — localStorage, sessionStorage, IndexedDB](#browser-storage-options---localstorage-vs-sessionstorage-vs-indexeddb)

- [Security review — repository scan and recommendations](#security-review---repository-scan-and-recommendations)

---

## Project structure

Key files and folders (top-level):

- `index.html` — canonical root page used for GitHub Pages (loads `./src/index.js`).
- `src/` — source files (JS and styles):
  - `src/index.js` — carousel module (ES module). Injects the carousel into `<main>`.
  - `src/styles/main.css` — extracted stylesheet for layout and theme variables.
- `public/` — static runtime assets (images, etc.). Keep published assets here when ready.
- `README.md` — project README.

Planned pages (deferred):

- `menu.html` — static menu page with sample items and pricing (generic content).
- `locations.html` — addresses, hours, and placeholder map or direction links.
- `contact.html` — contact details and a simple contact form placeholder (mailto or integration later).

These pages will reuse the carousel by including the same module script (`<script type="module" src="./src/index.js"></script>`). The work is intentionally deferred; see the project TODO list for the task.

---

## How the carousel loads

- The root `index.html` includes this tag near the end of the `<body>`:

```html
<script type="module" src="./src/index.js"></script>
```

- `type="module"` causes the browser to fetch `src/index.js` as an ES module. Modules are deferred and executed after parsing.
- `src/index.js` checks `document.readyState` and either waits for `DOMContentLoaded` or runs immediately if the DOM is already ready. This guarantees `<main>` exists before the script injects the carousel.
- Note: modules must be served over HTTP(S). Use Live Server for local testing or GitHub Pages for production previews. Opening `index.html` with `file://` in the browser will not work for modules in many browsers.

---

## Carousel — slides.forEach explained

This is the block that creates slide DOM nodes from the `slides` data array.

What the script does for each slide (pseudocode):

1. Create a container `div.slide` and mark the first slide `active`.
2. Set a `data-index` attribute on the slide (`slide.dataset.index = i`).
3. Create an `<img>` element, set `src` and `alt`, and append it to the slide.
4. Append the slide node to the slides wrapper (`slidesWrap`).

Why each step matters:

- `data-index` provides a stable numeric identifier linking slides to indicators and to the `show(index)` function. It avoids fragile DOM traversal.
- The first slide gets `active` so CSS shows it initially. The `show()` function toggles `.active` between the previous and new slide.
- Building slides programmatically means the carousel can accept dynamic data (API-driven slides or a CMS later) with minimal markup changes.

Edge cases and tips:

- If `slides.length === 0`, consider rendering a placeholder or hiding the carousel controls/indicators.
- For large images, use `loading="lazy"` on `<img>` or swap data-uris for small placeholders to reduce initial payload.
- If you add captions or action buttons to slides, create semantic child elements (e.g., `<figcaption>` or `<div class="caption">`) and style them in the CSS file.

---

## Carousel — indicators explained

Indicators are the small dots that let users jump to a specific slide. Implementation summary:

1. Create an `indicators` container (`<div class="indicators">`).
2. For each slide, create a `<button class="dot">` and set `data-index` to the same index as the slide.
3. Add an `aria-label` like `Go to slide ${i + 1}` for screen readers.
4. Add a click handler that calls `show(index)` to display the selected slide.

How indicators and slides stay in sync:

- Both lists are created in the same order. `show(index)` updates the `active` class for both the slide and the corresponding dot by using the same `index` value.
- This single-source-of-truth approach (index-based) avoids keeping separate counters or mapping objects.

Accessibility notes for indicators:

- Use `<button>` so the control is focusable and keyboard accessible.
- We add descriptive `aria-label` attributes; optionally add `aria-current="true"` to the active dot for explicit screen-reader hints.
- Consider enabling `aria-live` on captions if you want assistive tech to be notified when slides auto-advance.

Behavior with autoplay:

- Autoplay uses `setInterval` to call `nextSlide()` every 3000ms.
- Manual interactions (clicks) call `show(index)` immediately. Current behavior does not restart the autoplay timer automatically, but the script does pause autoplay while the carousel is hovered or focused.

Suggested small improvements (optional):

- Restart autoplay after the user clicks a dot or navigation button (call `start()` after `show()`).
- Add `aria-hidden="true"` to non-active slides and `aria-current` to the active dot.
- Hide indicators/controls when there is 1 or 0 slides.

## Carousel — State management & timing explained

This section describes the carousel's runtime state and timing model. It mirrors the comments inside `src/index.js` and is intended to help students reason about the control flow.

Key variables and their roles:

- `current` (number): the index of the slide that is currently visible. This is the single source of truth for which slide to display.
- `total` (number): the total number of slides (cached from DOM). Used to normalize indexes and for bounds checks.
- `timer` (number|null): the ID returned by `setInterval` when autoplay is active. `null` means autoplay is paused/stopped.
- `interval` (number): the autoplay period in milliseconds (3000ms by default).

How transitions happen (`show(index)`):

- `show` normalizes the requested index to a valid range (so callers can pass negative or large indexes without error).
- If the normalized index equals `current`, `show` returns early (cheap no-op).
- Otherwise, `show` removes the `.active` class from the previous slide and indicator, updates `current`, and adds `.active` to the new slide and dot.

Why centralize transitions in `show()`?

- Centralizing prevents bugs from duplicated DOM updates across multiple event handlers.
- It makes it easy to add extra side-effects later (e.g., update `aria-hidden`, animate captions, or emit analytics events) by changing just one function.

Autoplay control (`start()` / `stop()`):

- `start()` clears any existing timer (defensive) and calls `setInterval(nextSlide, interval)`.
- `stop()` clears the timer and sets it to `null`.
- The carousel pauses autoplay on `mouseenter` and `focusin`, and resumes on `mouseleave` and `focusout`. This improves usability for keyboard and mouse users.

Keyboard navigation and focusability:

- The carousel container gets `tabIndex=-1` so it can receive keyboard events if focused programmatically or by assistive tech.
- Left/Right arrows trigger `prevSlide()` / `nextSlide()` which both delegate to `show()`.

Edge cases and classroom exercises:

- Exercise: Modify `show()` to add `aria-hidden="true"` to non-active slides and `aria-current="true"` to the active dot. Test with a screen reader.
- Exercise: Change the autoplay strategy so that manual interaction (click a dot) pauses autoplay for N seconds rather than indefinitely.
- Edge case: if `slides.length === 0`, ensure the carousel does not attempt to build controls or start a timer; show a graceful fallback message instead.

This prose should now match the in-file comments in `src/index.js`. Keep them in sync when you refactor or change timing behavior.

---

## Preparing responsive crops & using srcset

For the best visual results you should serve images that are pre-cropped to the
carousel's aspect ratio for each target size (mobile/desktop). `src/index.js`
now supports a `srcsetArray` per slide which is an array of objects with the
shape `{ file: 'name-800.jpg', width: 800 }` and an optional `sizes` string.

How to prepare assets:

1. Pick a target aspect ratio (we use the carousel padding-bottom values, e.g., 40% for desktop). Export a desktop crop (e.g. 1600×640) and a mobile crop (e.g. 800×960) for each slide.
2. Name files consistently (e.g., `banner-hero-800.jpg`, `banner-hero-1600.jpg`). Place them in `public/assets/img/`.
3. Add entries to the `slides` array in `src/index.js` or keep the default examples already present. The JS will build a `srcset` from the `srcsetArray` and set `sizes`.

Why this works: the browser picks the best image candidate from `srcset` for the current viewport and DPR, giving you crisp images and predictable cropping.

Example slide entry (already in `src/index.js`):

```
{ 
  alt: 'Freshly brewed coffee',
  img: 'banner-hero.jpg',
  objectPosition: 'top center',
  srcsetArray: [ { file: 'banner-hero-800.jpg', width: 800 }, { file: 'banner-hero-1600.jpg', width: 1600 } ],
  sizes: '(max-width:640px) 100vw, 1100px'
}
```

If you want, I can add a small script that reads `public/assets/img/` and prints a suggested `srcsetArray` block (file discovery + widths) for each slide to speed up asset prep.
 
---

## Browser storage options — localStorage vs sessionStorage vs IndexedDB

This section summarises the key differences between `localStorage`, `sessionStorage`, and `IndexedDB`, and gives guidance on when to use each. The short table below helps you pick the right tool for common scenarios.

| Storage | Persistence & Scope | Typical capacity | API complexity | Typical use cases | Security & privacy notes |
|---|---|---:|---|---|---|
| `localStorage` | Persistent until explicitly cleared (survives tab/window and browser restart). Per-origin (site-wide). | ~5–10 MB in most browsers | Very simple (synchronous `getItem`/`setItem`) | Small, non-sensitive state: UI preferences, feature flags, last-viewed page, demo data for offline UX | Data stored in clear text; accessible to any script on the origin. Not suitable for secrets (tokens/passwords) unless additionally protected.
| `sessionStorage` | Lives for the lifetime of a top-level browsing context (tab or window). Separate per-tab. | Similar to `localStorage` (per-origin per-tab quota) | Very simple (synchronous API) | Short-lived state: ephemeral UI state, single-tab wizards, temporary form drafts that shouldn't persist across sessions | Same script-accessible caveats as `localStorage`. Good when you want per-tab isolation.
| `IndexedDB` | Persistent (unless cleared). Per-origin. Designed for larger datasets. | Hundreds of MBs (browser-dependent) | Asynchronous, more complex (promises/requests/transactions) | Structured or bulk data: caching API responses, offline-first apps, large blobs (images/files), client-side DB for read/write queries | More control over access patterns; still accessible to scripts in the origin. Use with encryption for sensitive content and follow same-origin security practices.

Quick guidance:

- Use `localStorage` when you need a tiny, synchronous key/value store for non-sensitive preferences or light demo data and you want the simplest API.
- Use `sessionStorage` when the data must be isolated to a single tab and must disappear when the tab/window is closed (e.g., a multi-step form that shouldn’t survive a new tab or browser restart).
- Use `IndexedDB` for larger, structured, or performance-sensitive data (offline caches, complex objects, images, progressive web app storage). It’s asynchronous but scales far better.

Notes & examples:

- Capacity: `localStorage`/`sessionStorage` are typically limited to a few MB and are synchronous — avoid storing large objects that block the main thread.
- API model: prefer `IndexedDB` for anything that needs transactions, queries, or bulk storage. Libraries like `idb` (tiny wrapper) make IndexedDB easier to use with promises.
- Security: never store raw passwords or long-lived auth secrets in client-side storage. For tokens consider short-lived tokens stored in memory or managed by secure cookies (HttpOnly) on the server.
- UX: for fast lookups of small bits of state (theme, locale, small feature flags), `localStorage` is convenient. For offline-first caching and structured records, use `IndexedDB`.

If you'd like, I can add a short code snippet showing safe patterns for each API (e.g., small `localStorage` helper, a `sessionStorage` use-case, and an `idb` example).


## Aside element rationale

- The `<aside>` contains complementary information: pickup time and a short blurb. It is related to the page content but not part of the main narrative. Using `<aside>` is semantic and signals to assistive tech and search engines that this box is tangential.
- Keep the CTA (Order Now) inside the main flow; the aside should never contain the primary action that you want every user to take.

---

## Styles and asset placement

- Styles live in `src/styles/main.css`. Variables are defined in `:root` for easy theming.
- For deployment and simpler GitHub Pages hosting, you may prefer to place final runtime assets in `public/` (e.g., `public/js/index.js`, `public/css/main.css`, and `public/assets/`). That helps when Pages is configured to publish from a specific folder.

Recommendation:

1. For rapid edits and Pages preview, keep the files in root (`index.html`, `src/...`) as they are now.
2. When moving to production or a build step, copy/minify assets into `public/` or a `dist/` folder and configure Pages to serve from that folder.

---

## Accessibility considerations

- Carousel supports keyboard left/right navigation.
- Dots are buttons with `aria-label`.
- Consider adding `aria-live` on captions or `role="region" aria-label="Featured content"` on the carousel container for clearer announcements.
- Ensure images include descriptive `alt` text (current placeholders are friendly but replace with real descriptions).

---

## Security review — repository scan and recommendations
Summary — what I reviewed
- Scope: client-side JS and small dev-server in this workspace (login/registration, session storage, rate-limiter, backup, apply/qualification UI).
- Primary focus: common web security issues (XSS, token/storage misuse, sensitive-data leakage, crypto misuse, client-side-only enforcement).
- Files reviewed (representative): `src/js/userStorage.js`, `src/js/sessionManager.js`, `src/js/loginRateLimiter.js`, `src/js/login.js`, `src/qualify.js`, `src/js/registration.js`, `apply.html`, `login.html`, `menu.html`, `protected.html`, `dev-server/server.js`.

High-level assessment
- The codebase is currently implemented as a demo; many modules include explicit warnings that their approaches are educational only. That’s great.
- However, a few real risks remain that could lead to user data exposure or easy abuse if the demo code is reused in production without change.
- Prioritized issues are below with evidence, impact, and action items.

Critical / High issues (fix ASAP)
- **Token storage in `localStorage` / sessionStorage (High):**
  - Files: `src/js/sessionManager.js`, `src/js/login.js`, other pages that call `SessionManager.saveToken()` or read tokens.
  - Evidence: tokens are stored via `localStorage.setItem` or `sessionStorage.setItem`.
  - Risk: tokens in `localStorage` are accessible to any JS on the page (XSS leads to token theft). Using unsigned Base64 tokens (see below) compounds the risk by enabling forgery.
  - Recommendation:
    - For any real authentication, use server-issued signed tokens (JWTs) and persist them in HttpOnly, Secure cookies (set by server). Avoid `localStorage` for auth tokens.
    - If local testing requires a token, mark it clearly as demo-only, short lifetimes, and restrict scope.
    - Implement token rotation, refresh tokens, and server-side token revocation/list.

- **Unsigned demo tokens (Forgery risk) (High):**
  - File: `src/js/sessionManager.js`.
  - Evidence: `createToken()` returns `btoa(JSON.stringify(payload))` (unsigned).
  - Risk: Any attacker (or client-side script) can craft valid-looking tokens. Unsigned tokens should never be used for real auth.
  - Recommendation:
    - Switch to server-signed tokens (JWTs signed with HS256/RS256) when moving beyond demo. On the client, validate only server-provided confirmations.
    - For local dev server the server should issue signed JWTs and perform server-side checks.

- **Storing sensitive data in client storage (High):**
  - File: `src/js/userStorage.js`.
  - Evidence: `User` shape includes optional `passwordBase64` and comments show it can be saved to localStorage.
  - Risk: Storing credentials (even Base64-encoded) on client persists secrets unprotected. Also other sensitive PII (SSN last-4) appears in forms (see `src/qualify.js` / `apply.html`).
  - Recommendation:
    - Never store raw passwords or PII client-side. Remove any code path that writes password-related fields to persistent storage. Use `passwordSet` boolean instead (as already provided).
    - Remove or never persist SSN or similar PII. If you must persist, encrypt with Web Crypto and justify risk/retention.
    - For backups, warn users clearly; don’t auto-include sensitive fields.

Medium issues (fix soon)
- **Client-side only rate-limiter (Medium):**
  - File: `src/js/loginRateLimiter.js`.
  - Evidence: rate-limiter stores attempts in localStorage and enforces lockouts only client-side.
  - Risk: Client-side controls are bypassable (adversary can clear localStorage or call server directly).
  - Recommendation:
    - Implement server-side rate limits (IP + account) and login throttling. Keep client-side limiter as UX only.
    - Add server-side exponential backoff and monitoring/alerts for brute-force.

- **DOM insertion using `innerHTML` (XSS vector) (Medium):**
  - File: `src/qualify.js` (function `showSummary` uses `s.innerHTML = '<ul>'+msgs.map(m=>'<li>'+m+'</li>').join('')+'</ul>'`).
  - Evidence: direct `innerHTML` with string concatenation.
  - Risk: If any message ever includes user-controlled content (or future change), this enables XSS.
  - Recommendation:
    - Replace `innerHTML` usage with safe DOM creation using `createElement` + `textContent`, or sanitize the content with a vetted library before insertion.
    - Wherever user input is rendered, explicitly escape or use `textContent`.

- **Use of `btoa` / `atob` and `unescape/escape` polyfill (Medium):**
  - Files: `src/js/userStorage.js`, `src/js/sessionManager.js`.
  - Evidence: `base64Encode` uses `btoa(unescape(encodeURIComponent(...)))` and decode uses `decodeURIComponent(escape(atob(...)))`.
  - Risk: `unescape`/`escape` are legacy and may be problematic; explicit UTF-8 handling via TextEncoder/TextDecoder or standard helpers is better. Also base64 wrappers are not encryption.
  - Recommendation:
    - Replace `unescape/escape` pattern with `TextEncoder`/`TextDecoder` or using a small tested helper that handles Unicode safely.
    - Keep the demo warnings and never treat base64 as secure.

Low / informational issues (consider)
- **No Content Security Policy (CSP) or security headers (Low/Medium):**
  - Files: static pages like `index.html`, `login.html`, `apply.html`.
  - Recommendation:
    - Add a CSP meta tag (or configure server headers) to restrict script sources, disallow inline scripts/styles, and block unsafe-eval unless required.
    - Example meta: `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; object-src 'none';">` — tune for your resource needs.

- **Potential Storage quota handling/logging (Low):**
  - Files: `src/js/userStorage.js` (prompts backup on quota triggers).
  - Recommendation:
    - The backup UX is okay — ensure it never includes sensitive fields (SSN/password). Prefer instructing the user rather than automatically prompting if sensitive fields present.

Concrete suggested code fixes (safe, minimal)
1. Replace `innerHTML` usage in `src/qualify.js` with safe DOM creation:
   - Why: eliminates XSS risk.
   - Example change (conceptual):
     - Replace:
       - `s.innerHTML = msgs.length ? '<ul>'+msgs.map(m=>'<li>'+m+'</li>').join('')+'</ul>' : '';`
     - With:
       - const ul = document.createElement('ul');
         msgs.forEach(m => { const li = document.createElement('li'); li.textContent = m; ul.appendChild(li); });
         s.replaceChildren(ul); s.hidden = !msgs.length;
   - I can apply this patch for you if you want.

2. Stop storing passwords in `User` persisted data:
   - Audit any code that sets `passwordBase64` (search for `.passwordBase64 =` or the `User` constructor usage).
   - Ensure registration/login only sets `passwordSet` and never writes `passwordBase64` to `localStorage`.
   - If `UserStorage.save()` currently could write `passwordBase64`, ensure callers don't pass it.

3. Migrate to server-signed JWTs and HttpOnly cookies for auth:
   - For dev/testing, have `dev-server` issue signed tokens and set them in an HttpOnly cookie, or provide an endpoint to return a signed token that the client uses in an `Authorization` header to call protected endpoints (not to store in `localStorage`).
   - Add server-side verification on any protected server endpoints.

4. Replace base64 Unicode helpers with TextEncoder/TextDecoder:
   - Example:
     - const encoder = new TextEncoder(); const bytes = encoder.encode(str); use window.btoa(String.fromCharCode(...bytes)) OR use base64-arraybuffer helper. Decoder via TextDecoder.
   - This avoids `unescape/escape`.

5. Add server-side rate-limiting:
   - For `dev-server`, add express-rate-limit or similar middleware and apply to auth routes.

6. Add a CSP meta tag to HTML pages:
   - e.g.: `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline';">`
   - Note: `'unsafe-inline'` should be avoided; prefer nonce-based or external scripts only.

Prioritized action plan
- Immediate (minutes):
  - Fix `src/qualify.js` innerHTML -> DOM + textContent (low-effort, high-impact).
  - Audit and remove any code paths that persist `passwordBase64` or PII to localStorage/backups.
  - Add clear comments/warnings at top of `sessionManager.js` and `userStorage.js` (already present) and to pages that demo tokens to avoid accidental reuse.
- Near-term (hours):
  - Update `sessionManager` demo flow to short-lived tokens only and mark as demo. Implement dev-server route to issue signed JWTs if you want realistic testing.
  - Add server-side rate limiting to `dev-server`.
  - Replace `btoa/atob` helpers with robust Unicode-safe routines.
- Medium-term (days):
  - Move auth to server-signed tokens and keep tokens in HttpOnly cookies; remove storing tokens in `localStorage`.
  - Add tests covering SessionManager and login rate-limiter behavior.
  - Add CSP and other security headers on the server.

Would you like me to
- Apply the safe `innerHTML` -> DOM patch in `src/qualify.js` now? (small, low-risk).
- Search the repo for any places where `passwordBase64` is written and open or patch them?
- Add a short checklist PR that implements the immediate fixes (CSP meta tag, qualify.js patch, remove password persistence)? I can prepare patches and push them here.

If you'd like the quick fix I recommended for `src/qualify.js`, I can apply it now — tell me to go ahead and I'll make the patch and show the changed file.
- 2025-10-28: Created devnotes.md with carousel explanations, aside rationale, and guidance for future notes.

---

## Recent refactor: SessionManager and timing-attack mitigation

- **What I changed**: Introduced `src/js/sessionManager.js` to centralize demo token creation, parsing, validation and storage. Updated `menu.html` and `protected.html` to use `SessionManager` instead of ad-hoc token parsing. Refactored `src/js/login.js` to rely on `SessionManager` for token creation and storage.

- **Why**: Centralizing token handling makes the demo code easier to maintain and reduces duplicated parsing/validation logic across pages.

- **Timing-attack mitigation**: The login flow previously compared password strings with `===`, which can short-circuit and leak timing information about the correct password or user existence. For the client-side demo I implemented a conservative constant-time comparison helper (`constantTimeEquals`) in `src/js/login.js` and used a dummy comparison when the user does not exist to make timing more uniform. See `login.js` comments for details.

  - Note: Client-side mitigations are only educational. Real protection requires server-side hashed passwords (bcrypt/argon2), proper salting, and server-side constant-time compares. Use short-lived tokens and HttpOnly cookies for production.



