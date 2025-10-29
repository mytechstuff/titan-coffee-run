# Titan Coffee Run — Developer Notes

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

---

## Project structure

Key files and folders (top-level):

- `index.html` — root page used for GitHub Pages (loads `./src/index.js`).
- `public/index.html` — demo preview file (useful for local preview setups).
- `src/` — source files (JS and styles):
  - `src/index.js` — carousel module (ES module). Injects the carousel into `<main>`.
  - `src/styles/main.css` — extracted stylesheet for layout and theme variables.
- `README.md` — project README.

Place images and final public assets in `public/` (e.g. `public/assets/`) when ready to publish. See "Styles and asset placement" below for options.

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

---

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

## How to add more notes

Follow this lightweight template when adding detailed notes:

### Title (short, searchable)

- **File(s)**: list the file paths this note concerns
- **Why**: short rationale for the design choice
- **What it does**: brief technical summary
- **Tricky parts / gotchas**: bullet list
- **Suggested improvements**: optional next steps

Place new notes under a new heading in this `devnotes.md` file, or add files under a `docs/` folder for longer guides. Use markdown links to cross-reference topics.

---

## Change log / history

- 2025-10-28: Created devnotes.md with carousel explanations, aside rationale, and guidance for future notes.

---

If you want, I can:

- Add `aria-current` attributes to active dots and `aria-hidden` to hidden slides now.
- Move runtime assets to `public/` and update the HTML references so Live Server and Pages have fewer path issues.

Feel free to ask for either change and I'll make it and push a commit.
