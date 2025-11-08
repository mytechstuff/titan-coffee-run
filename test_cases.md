# Credit Application Form — Test Cases

This test plan contains manual test scenarios (positive and negative) to validate the credit application form UI and client-side behavior in this project.

Each test case includes: ID, Title, Objective, Steps, Test Data (where applicable), Expected Result, Priority, and Notes.

---

## Test Case 1 — Valid submit: income > $20,000 (Approved)
- ID: TC-01
- Objective: Verify that a submission with all valid fields and gross income greater than $20,000 is accepted and shows an approval decision.
- Steps:
  1. Open the application page with the form (`apply.html`).
  2. Fill all required fields with valid values (see Test Data).
  3. Submit the form.
- Test Data:
  - email: user@example.com
  - emailConfirm: user@example.com
  - firstName: Alice
  - lastName: Smith
  - city: Anytown
  - state: NY
  - zip: 10001
  - grossIncome: 30000
  - ssnLast4: 1234
  - consent: checked
  - requestedAmount: 1500
- Expected Result:
  - No validation errors shown.
  - Decision banner appears with an "Approved" state and displays a credit amount.
  - Banner receives focus briefly and is announced via assistive tech (aria-live/role=status).
- Priority: High
- Notes: This uses the canonical approval threshold (>= $20,000).
Results: Pass
---

## Test Case 2 — Invalid submit: mismatched emails (Negative)
- ID: TC-02
- Objective: Verify the form rejects submission when Email and Confirm Email do not match.
- Steps:
  1. Fill the form with valid values except emailConfirm.
  2. Submit the form.
- Test Data:
  - email: user1@example.com
  - emailConfirm: other@example.com
  - grossIncome: 25000 (other fields valid)
- Expected Result:
  - Validation summary lists an error for the email mismatch.
  - An inline error message is shown next to the email confirmation field.
  - The emailConfirm input has `aria-invalid="true"` and an `aria-describedby` reference pointing to the inline error node.
- Priority: High
- Notes: Ensure inline error is accessible and focus moves to the first invalid field when submitting.
---
Result: Pass
---

## Test Case 3 — Valid submit: income below $20,000 (Declined)
- ID: TC-03
- Objective: Verify that a submission with valid fields but gross income below the approval threshold results in a decline decision.
- Steps:
  1. Open the form and fill all required fields with valid values, but set grossIncome below 20000.
  2. Submit the form.
- Test Data:
  - email: lowincome@example.com
  - emailConfirm: lowincome@example.com
  - firstName: Bob
  - lastName: Jones
  - city: Smallville
  - state: TX
  - zip: 75001
  - grossIncome: 15000
  - ssnLast4: 4321
  - consent: checked
  - requestedAmount: 500
- Expected Result:
  - No validation errors for required fields.
  - Decision banner appears with a "Declined" state and a brief reason (e.g., insufficient income).
  - Banner is announced by assistive tech (aria-live) and receives temporary focus.
- Priority: High
- Notes: This verifies qualification logic (income threshold) rather than field validation.

---

## Test Case 4 — Missing consent (Negative)
- ID: TC-04
- Objective: Verify that the form requires explicit consent and blocks submission if not checked.
- Steps:
  1. Fill all required fields with valid data except leave the consent checkbox unchecked.
  2. Submit the form.
- Test Data:
  - email: consent@test.example
  - emailConfirm: consent@test.example
  - grossIncome: 40000
  - consent: unchecked
- Expected Result:
  - Validation summary lists an error about missing consent.
  - An inline error appears near the consent checkbox and the checkbox receives `aria-invalid="true"` (or other visible error affordance).
  - Form is not submitted and decision banner does not appear.
- Priority: High
- Notes: Consent is required for processing; verify the error is keyboard accessible.

---

## Test Case 5 — Invalid SSN last 4 (Negative)
- ID: TC-05
- Objective: Verify SSN last-4 validation rejects non-numeric or incorrectly sized values.
- Steps:
  1. Enter invalid SSN last-4 values (e.g., "12A", "123", "12345") in separate attempts.
  2. Submit or blur the field to trigger per-field validation.
- Test Data & Variants:
  - ssnLast4: "12A" (non-numeric)
  - ssnLast4: "123" (too short)
  - ssnLast4: "12345" (too long)
- Expected Result:
  - Per-field validation shows an inline error for each invalid input variant.
  - The field has `aria-invalid="true"` and an `aria-describedby` pointing to the error node.
  - The validation summary lists the SSN error on submit.
- Priority: Medium
- Notes: Acceptable SSN last-4 is 4 numeric digits only.

---

## Test Case 6 — Export CSV contains combined valid + invalid rows
- ID: TC-06
- Objective: Verify the export behavior creates a CSV that includes both valid and invalid rows (the combined validation-results CSV).
- Steps:
  1. Populate the form so that some fields are valid and at least one field is invalid (e.g., mismatched emails).
  2. Submit to render the combined validation-results table.
  3. Click "Export" (Export validation results) button.
  4. Open the downloaded CSV in a text editor or spreadsheet.
- Test Data:
  - email: good@example.com
  - emailConfirm: bad@example.com
  - grossIncome: 22000
  - other fields valid
- Expected Result:
  - The CSV file is downloaded (filename `validation_results.csv`).
  - The CSV contains a header row and one row per field in the `FIELD_ORDER`, with a column indicating `Valid` or `Invalid` and either the formatted value or the error message.
  - The invalid field(s) contain the validation message in the value_or_message column.
- Priority: Medium
- Notes: This checks content correctness and that exported rows match the in-page table.

---

## Test Case 7 — Reset / Clear behavior and ARIA cleanup
- ID: TC-07
- Objective: Verify that the native form Reset and the Clear Errors button remove inline errors, clear the validation-summary and table, and remove aria-describedby references so screen readers do not reference removed nodes.
- Steps:
  1. Trigger validation errors by submitting with invalid fields (e.g., missing consent or mismatched email).
  2. Confirm inline error nodes are present and inputs have `aria-describedby` that reference error node ids.
  3. Click the form's Reset button.
  4. Repeat the flow and instead click the Clear Errors button.
- Expected Result:
  - After Reset: inline error nodes are removed, inputs no longer have `aria-invalid` or `aria-describedby` that reference removed ids, the validation summary is hidden, the validation-results table is cleared, and the decision banner (if any) is hidden and has no lingering aria-live/role/tabindex attributes.
  - After Clear Errors: same cleanup of table and aria attributes; decision banner persists only if it was not cleared by the button's intended behavior (confirm the current UI behavior matches expectations).
- Priority: High
- Notes: Use DOM inspection or accessibility tools to confirm `aria-describedby` attributes are updated.

---

## Test Case 8 — Accessibility: inline errors & decision banner announcements
- ID: TC-08
- Objective: Confirm that inline errors are announced to assistive tech and the decision banner is announced and focusable briefly when shown.
- Steps:
  1. Using a screen reader (NVDA, VoiceOver, or TalkBack), submit an invalid form to produce inline errors.
  2. Observe whether the screen reader announces the summary and/or inline errors when focus moves to the first invalid field.
  3. Submit a valid (approved) application and observe the announcement for the decision banner.
- Test Data:
  - For errors: mismatched emails or missing consent.
  - For success: valid data with income >= 20000.
- Expected Result:
  - Inline errors are exposed via `aria-invalid` and `aria-describedby` so screen readers can announce them when focusing the input or when the summary receives focus.
  - The decision banner uses `role="status"` and `aria-live="polite"`, is focusable briefly, and is announced by the screen reader when it appears.
  - No stale `aria-describedby` references remain after clearing/reset.
- Priority: High
- Notes: Accessibility behavior depends on the assistive tech and browser; verify with at least one major screen reader and report any differences.

---

### Additional notes
- Run these scenarios in a modern browser that supports ES modules (Chrome, Edge, Firefox, Safari). The app is client-only; no server is required for these manual tests.
- For automated checks you can write Playwright or Cypress tests that assert the presence/absence of DOM attributes (`aria-invalid`, `aria-describedby`) and that downloaded CSV contents match expectations.

---

End of test cases.

Test Case Results: (Pass/ Fail/ Bugs?)
1. 