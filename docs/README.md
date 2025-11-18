# Documentation Index

This folder (`docs/`) contains the canonical Markdown documentation for the Titan Coffee Run project.

Files
- `docs/devnotes.md` — Developer notes, architecture rationale, and change-log.
- `docs/securty_review.md` — Security recommendations and password-history/reset guidance.
- `docs/sprint_1_notes.md` — Sprint 1 summary, tasks, and next steps.
- `docs/Storage_Architeture.md` — Notes about client-side storage, backup/restore and migrations.
- `docs/test_cases.md` — Manual test cases for the credit application flow.
- `docs/test_cases_reg.md` — Registration form test cases.
- `docs/Ai_promts_task2.md` — Saved AI prompt and assistant reply (task 2).
- `docs/Ai_prompts_task3.md` — Saved AI prompt and assistant reply (task 3).
- `docs/sales_graph_instructions.md` — Student-facing instructions for the sales SVG chart.

Why these files were moved

To keep the repository tidy and make documentation easier to find, the project's Markdown files have been consolidated under `docs/`. The root README now points to these files.

If you relied on the old root paths: update links to `docs/<filename>.md` (most references in the repo were updated automatically).

Suggested PR details

- Title: Move top-level Markdown docs into `docs/` and update README links

- Description (copy into PR body):

  This change tidies repository structure by moving all top-level Markdown documentation into a `docs/` folder and updating in-repo links to point at `docs/<filename>.md`.

  Summary:
  - Moved: `devnotes.md`, `sprint_1_notes.md`, `Storage_Architeture.md`, `test_cases.md`, `test_cases_reg.md`, `Ai_promts_task2.md`, `Ai_prompts_task3.md`, `securty_review.md` → `docs/`
  - Updated `README.md` to reference `docs/` paths for the moved files.
  - Removed duplicate root files.

  Rationale:
  - Organizes documentation in a single place for easier discovery and cleaner repo root.

  Review notes:
  - Please scan any external references (links from issues/PRs or wiki pages) and update them if they rely on the old root-file paths.
  - If you prefer a different docs structure (e.g., `documentation/` or subfolders), I can move files accordingly and update links.

Next steps (optional)
- Add a `docs/CONTRIBUTING.md` or `docs/README-guidelines.md` if you want contributors to add docs in a particular style or structure.
- Add a GitHub Pages / mkdocs config to publish `docs/` as project documentation.

---

If you want, I will:
- Open a PR with this branch (I can prepare a PR description for you), or
- Create a `docs/CONTRIBUTING.md` and a short index page for the docs with links grouped by topic.

Tell me which of these you'd like me to do next.