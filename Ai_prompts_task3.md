# Ai_prompts_task3

## User prompt (Task 3)

Task 3: create the registration.js with ES6 modules, implement a FormValidator class , implement a StorageManager class, use proper separation of concerns.  Create the FromValidator class with methods for each validation typle.Next, explain the difference between procedural an OOP approaches for form validation.  Which is usuallly better for maintainability and why?


## Assistant reply (excerpt)

I created `src/js/registration.js` as an ES module containing:

- FormValidator: encapsulates validation logic and UI updates (validateEmail, calculatePasswordScore, getPasswordLabel, validatePassword, validateConfirmMatch, validateNames, isFormValid, etc.). It binds UI events and fires a `registration:success` custom event on successful (demo) registration.
- StorageManager: safe client-side draft persistence (saves only firstName, lastName, email, terms, savedAt). It intentionally does not store passwords.
- initRegistration(): auto-initializes on DOMContentLoaded and wires FormValidator + StorageManager.

I replaced the inline script in `register.html` with:

```html
<script type="module" src="./src/js/registration.js"></script>
```

Separation of concerns:

- FormValidator handles validation/UI state.
- StorageManager handles draft persistence.
- The module wires them together.

Difference: procedural vs OOP approaches for form validation

- Procedural: standalone functions and shared/global state; simpler for tiny scripts but harder to scale and test.
- OOP/modular: encapsulates state and methods, easier to reuse, extend, and unit-test. Generally better for maintainability in medium+ projects.

Next steps offered: unit tests (Jest), moving wiring to explicit init call, show/hide password toggle, or server-side stubs with secure hashing.
