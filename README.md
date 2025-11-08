# Titan Coffee Run

Small static demo for a client-side credit application form. Intended for teaching
and quick demos — runs entirely in the browser when hosted on GitHub Pages.

Quick start
1. Open the repo in your editor.
2. No build step required — just open `apply.html` in a browser or publish with GitHub Pages.

What’s included
- `apply.html` — the credit application form UI.
- `src/qualify.js` — compact client-side validation + decision logic (module).
- `src/styles/` — minimal layout and form styles.


Notes about hosting
- This repo is configured as a static site (GitHub Pages). There is no server-side
	code required for the demo. If you need persistence or an API, host a separate
	backend and call it from the client.

Repository notes
- The local Express dev server (`server/index.js`) and the GitHub Actions workflow
  were removed to keep the repo minimal for static hosting. If you need the
  server or CI later I can restore them or add a lightweight replacement.

Enabling GitHub Pages
- To publish the site manually: go to your repository Settings → Pages, choose
  the `main` branch and `/ (root)` as the publish source, then save. The site
  will be available at `https://<your-username>.github.io/<repo-name>/`.

License / Next steps
- Small, focused demo. If you want I can add a short automated deploy workflow
  that publishes the site to GitHub Pages (I can add that on request).

Enjoy the demo — open `apply.html` to try the simplified application flow.
