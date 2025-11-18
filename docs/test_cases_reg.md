```markdown
# Registration Form — Test Cases

> Summary checklist (quick)

- [x ] Invalid email "test@" displays an error and keeps Register disabled (P0)
- [x ] Password of only spaces is rejected (P0)
- [x ] Confirm password mismatch blocks submit (P0)
- [x ] Terms unchecked blocks submit (P0)
- [  ] Attempted SQL injection strings are treated as text; document the client payload (P0)
- [ ] XSS strings are not executed; ensure any rendering escapes HTML (P0)
- [ ] Draft persistence restores name/email/terms but not password (P2)
- [x ] Focus moves to first invalid field on submit (P1)
- [x ] aria-live messages announced on validation changes (P0)

Note: an X in the checkbox indicates the test PASSED.

This document lists edge cases and standard test cases for the Titan Coffee Run registration form. It covers input validation, security edge cases, accessibility checks, and suggested unit/automation tests.

---

## Summary

Targets:
- Fields: First name, Last name, Email, Password, Confirm Password, Terms checkbox
- Client-side behavior (FormValidator): real-time validation, password strength, confirm match, enable/disable register button
- StorageManager: safe draft persistence (saves only firstName, lastName, email, terms, savedAt). It intentionally does not store passwords.
- Accessibility: aria-live messaging, labels, keyboard navigation
- Security: do not rely on client-side checks; server-side validation required for production

Priority key: P0 = must-fix/critical, P1 = high, P2 = normal, P3 = low

---

## Input Validation Edge Cases

1) Invalid email: `test@`
- Input: `test@`
- Steps: Type `test@` into the email field and pause (trigger debounced validation).
- Expected: Email field marked invalid; error message shown: "Please enter a valid email address."; register button remains disabled.
- Priority: P0
- Notes: The client regex (`/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/`) should reject this input because no domain/TLD follows the dot requirement.

2) Invalid email: missing TLD `user@example`
- Input: `user@example`
- Expected: invalid with message, same as above.
- Priority: P0

3) Email with leading/trailing spaces: `  user@example.com  `
- Input: leading/trailing spaces
- Expected: trimmed before validation; if valid after trim, no error. Register should be enable-able when other fields valid.
- Priority: P1
- Notes: FormValidator trims the email — confirm behavior.

4) Unusual but valid email forms (acceptance tests)
- Inputs: `user+tag@example.co.uk`, `user.name@sub.domain.example.com`
- Expected: accepted by client-side regex (these should pass) and no false negative.
- Priority: P2

5) Email with spaces inside: `user @example.com`
- Input: contains space
- Expected: invalid.
- Priority: P1

6) Password only spaces: `'       '` (e.g., 7 spaces)
- Input: sequence of spaces in password field
- Expected: Treated as invalid; password score should be 0 or fail because no variety; confirm that whitespace-only passwords do not pass (client should mark aria-invalid and do not enable register).
- Priority: P0
- Notes: Also ensure storage manager does not save password fields; server-side must reject whitespace-only passwords.

7) Password too short: `Ab1!`
- Input: 4 characters with variety
- Expected: score low; validation fail; register disabled.
- Priority: P0

8) Password long but only letters: `aaaaaaaaaaaaaaaa`
- Input: long but single char type
- Expected: moderate score (length points) but still possibly Weak if variety insufficient; decision depends on minScore. Confirm expected rating.
- Priority: P1

9) Password with unicode characters/emojis: `Pässwörd😊123!`
- Input: characters outside ASCII
- Expected: variety recognized (symbols, upper/lowercase, digits) — score should count for non-alphanumeric. Ensure no breaking of regex or UI.
- Priority: P2
- Notes: Important to ensure server can handle UTF-8 consistently.

10) Confirm password mismatch
- Input: password `Abc123!!`, confirm `Abc123!`
- Expected: confirm field shows error "Passwords don't match." and register disabled.
- Priority: P0

11) Missing required names
- Input: empty first or last name
- Expected: form invalid; register disabled; optional: show inline hint to fill names.
- Priority: P1

12) Terms not checked
- Input: all fields valid but terms unchecked
- Expected: register remains disabled; a submitted form should surface the requirement.
- Priority: P0

---

## Security / Malicious Input Tests

These tests document common attack strings to use for both client- and server-side testing. Even if the app is client-only for teaching, test how the client behaves with these inputs and note server expectations.

13) SQL injection-like input in name/email fields
- Inputs to try:
  - `Robert'); DROP TABLE users; --`
  - `'; SELECT * FROM users; --`
  - `test@example.com' OR '1'='1`
- Steps: Paste these into first name, last name, and email fields and submit.
- Expected (client-only app): client should treat these as text and not execute anything. If the app later sends to a server, the server must sanitize and parameterize queries. Record the payload the client would send.
- Priority: P0
- Notes: On server, these must be rejected/handled safely (use parameterized queries, ORM, or prepared statements).

14) XSS attempt in name or email
- Inputs: `<script>alert(1)</script>`, `<img src=x onerror=alert(1)>`
- Expected: client displays them as plain text in inputs; if any value is later rendered into the DOM by the app, it must be escaped. If server returns data that will be rendered, it must be sanitized.
- Priority: P0

15) Very large input sizes (long names, huge email)
- Input: 10k characters in any field
- Expected: UI should behave reasonably (not crash), but server should enforce a maximum length and reject overly long payloads. Client may show error on too-long input.
- Priority: P1

16) Binary/non-printable data or control characters
- Input: insert control characters (e.g., NULL `\0`, `\x1F`)
- Expected: fields should either sanitize or reject such input; server must not allow binary in text fields.
- Priority: P2

---

## Accessibility & UX Tests

17) Tab order and keyboard navigation
- Steps: Tab through the form from top to bottom, including skip link, header, inputs, checkboxes, and buttons.
- Expected: Logical tab order; focus styles visible; skip link moves focus to #main-content; register button focusable only when enabled.
- Priority: P0

18) Screen reader announcements (aria-live)
- Steps: Trigger invalid state (e.g., type invalid email) and listen using a screen reader (or use Accessibility Inspector's aria-live monitor).
- Expected: Error messages announced via aria-live politely and associated with the field.
- Priority: P0

19) Focus management on submit failure
- Steps: Leave required fields empty and submit; observe focus.
- Expected: Focus shifts to first invalid field or to an error summary so keyboard/screen-reader users can act.
- Priority: P1

---

## Integration / Flow Tests

20) Draft persistence tests (StorageManager)
- Steps: Fill first/last/email and terms, *do not* fill password; reload page.
- Expected: Draft data (excluding passwords) is restored; password fields empty; terms restored.
- Priority: P2

21) Draft storage quota or localStorage disabled
- Steps: Simulate storage failure (e.g., private mode or quotas full) or block localStorage.
- Expected: StorageManager fails gracefully (no uncaught errors); app still works — no data lost beyond inability to persist.
- Priority: P2

22) Successful submit demo flow
- Steps: Fill form with valid data; submit; observe success message.
- Expected (client demo): success message shown, draft cleared, form reset, register disabled.
- Priority: P2

---

## Unit / Automated Test Suggestions

These are good candidates for unit tests (FormValidator pure functions) and small integration tests (Jest + JSDOM or Playwright for E2E).

A) Email validation vectors (unit tests for `validateEmail` / regex)
- Valid: `user@example.com`, `user+tag@example.co.uk`, `user.name@sub.domain.com`
- Invalid: `test@`, `user@`, `user@.com`, ` user@example.com ` (should be trimmed and accepted), `user @example.com` (space)
- Expected: function returns true/false accordingly; tests should assert aria-invalid state where applicable.

B) Password scoring (unit tests for `calculatePasswordScore`)
- `''` => 0
- `'      '` => 0
- `'Ab1!'` => score < minScore
- `'Password123'` => score around 3 (length + lowercase + uppercase + digits)
- `'P@ssw0rd2021!'` => high score (5-6)
- Unicode example `Pässwörd😊` => counts symbols/variety as expected

C) Confirm match
- `password` vs `password` => true
- `password` vs `passw0rd` => false

D) StorageManager tests
- Saving and loading a draft (mock localStorage). Ensure password not stored.
- Behavior when localStorage throws (simulate quota exceeded).

E) Accessibility checks (automated)
- Use Playwright or aXe to verify no basic accessibility violations on registration page (label associations, color contrast on error text, role/aria-live present).

---

## Notes for Teaching / Client-only context

- Emphasize the difference between UX validation and security validation. Students should see how client-side checks improve UX but cannot be relied upon for enforcement.
- Use one of the SQL injection tests to demonstrate how a server that does not parameterize queries can be exploited — show safe vs unsafe server code.
- When adding server-side stubs later, write tests for HTTP status handling (400/409/500) and demonstrate how the client should display those errors to users.

---

## Traceability

- Map automated unit tests to functions in `src/js/registration.js`:
  - `validateEmail` -> email tests
  - `calculatePasswordScore` -> password scoring tests
  - `validateConfirmMatch` -> confirm match tests
  - `StorageManager.saveDraft/loadDraft` -> persistence tests

---

If you want, I can:
- Convert the most important unit tests into Jest test files and add them to the repo.
- Create a small Playwright E2E script that runs the manual checklist automatically against the local site.

Which automation (Jest unit tests or Playwright E2E) would you prefer I add next?
```