GitHub Pages deployment (quick guide)
====================================

This repo is a static site and can be published to GitHub Pages.

Option A — Publish from the `main` branch (docs folder optional)
1. In your repository settings on GitHub, go to **Pages**.
2. Under **Source**, select branch `main` and folder `/ (root)` (or `/docs` if you prefer).
3. Save. GitHub will provide a URL like `https://<your-username>.github.io/<repo-name>/`.

Option B — Automatic deploy using GitHub Actions (recommended)

I added a workflow that publishes the site to the `gh-pages` branch automatically when you push to `main`.
The workflow uses `peaceiris/actions-gh-pages` and the built-in `GITHUB_TOKEN`, so no secret setup is required.

What I added
- `.github/workflows/deploy.yml` — deploys contents of the repository root to `gh-pages` on pushes to `main`.

Notes
- After the first successful run, enable Pages to serve from the `gh-pages` branch or choose the `gh-pages` branch in repository Pages settings.
- If you prefer to publish from `main` directly, you can skip the workflow and choose the `main` branch as Pages source.

Troubleshooting
- If the site doesn't appear, check the workflow run under Actions and inspect logs for permission or path issues.
- If URLs 404, confirm that your repository Name and Pages URL are correct and that the workflow published to `gh-pages` branch.

If you'd like, I can also configure the workflow to publish only files in a `docs/` folder or to run a build step (if you add a build tool later).
