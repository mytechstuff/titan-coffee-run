# Security Vulnerability Assessment
**Titan Coffee Run - Demo Application**  
**Assessment Date:** December 10, 2025  
**Assessor:** GitHub Copilot  
**Status:** READ-ONLY AUDIT (No changes made)

---

## Executive Summary

This security assessment identifies critical vulnerabilities in the Titan Coffee Run demo application. The application is designed for **demonstration and educational purposes only** and should **NOT be deployed to production** without significant security hardening.

### Risk Overview
- **Critical Issues:** 3
- **High Issues:** 4
- **Medium Issues:** 3
- **Low Issues:** 2

**Overall Risk Level:** 🔴 **CRITICAL** - Not suitable for production use without major security improvements.

---

## Critical Vulnerabilities

### 1. Client-Side Authentication Bypass
**Severity:** 🔴 CRITICAL  
**Location:** `src/js/login.js` (lines 103-107), `sales.html` (lines 68-72)  
**CWE:** CWE-602: Client-Side Enforcement of Server-Side Security

**Description:**  
Admin authentication is enforced entirely on the client-side using a localStorage flag (`adminLoggedIn`). Any user can bypass this protection by opening browser DevTools and executing:
```javascript
localStorage.setItem('adminLoggedIn', 'true');
location.replace('sales.html');
```

**Code Evidence:**
```javascript
// login.js line 106
localStorage.setItem('adminLoggedIn', 'true');

// sales.html line 69
if (localStorage.getItem('adminLoggedIn') !== 'true') {
  location.replace('login.html');
}
```

**Impact:**  
- Unauthorized access to admin dashboard (`sales.html`)
- Exposure of sales data and admin features
- Complete bypass of authentication system

**Exploitation:** Trivial - requires only basic browser knowledge

**Recommendation:**
- Implement server-side session management with signed JWT tokens
- Use HttpOnly cookies for session storage (not accessible via JavaScript)
- Validate all admin requests on the backend with proper authorization checks
- Never trust client-side authorization flags

---

### 2. Plaintext Passwords in Source Code
**Severity:** 🔴 CRITICAL  
**Location:** `src/js/login.js` (lines 39-42)  
**CWE:** CWE-798: Use of Hard-coded Credentials

**Description:**  
Demo user credentials are hardcoded in plaintext in the client-side JavaScript bundle:

```javascript
const DEMO_USERS = {
  'demo@example.com': { password: 'DemoPass123', id: 'user-demo' }
};

// Admin credentials (line 105)
if (password === 'test123') { /* admin login */ }
```

**Impact:**
- Credentials visible to anyone viewing page source or network requests
- Impossible to revoke or change credentials without redeploying
- Credentials can be extracted and reused

**Exploitation:** Trivial - view source or inspect bundled JavaScript

**Recommendation:**
- Move ALL authentication to the backend server
- Hash passwords using bcrypt or Argon2 with proper salts
- Never transmit plaintext passwords (always use HTTPS)
- Implement proper credential management (rotation, revocation)

---

### 3. No Server-Side Validation on API Endpoints
**Severity:** 🔴 CRITICAL  
**Location:** `titan-run-backend/db.json`, all fetch calls  
**CWE:** CWE-20: Improper Input Validation

**Description:**  
The json-server backend (localhost:3001) accepts ANY data without authentication or validation. An attacker can:
- POST arbitrary orders with any data structure
- Modify or delete any order
- Inject malicious data into the database

**Code Evidence:**
```javascript
// checkout.html line 125 - no auth headers
const resp = await fetch('http://localhost:3001/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(orderObj)  // No validation, no auth
});
```

**Impact:**
- Data integrity compromise (malicious orders, price manipulation)
- Database pollution with invalid/malicious records
- Potential for injection attacks if data is rendered unsafely

**Exploitation:** Trivial - use curl or Postman to POST malicious data

**Recommendation:**
- Replace json-server with proper backend framework (Express, Fastify, etc.)
- Implement authentication middleware (JWT validation)
- Add input validation and sanitization (Joi, Zod, express-validator)
- Implement rate limiting to prevent abuse
- Use parameterized queries to prevent injection

---

## High Severity Issues

### 4. PII Stored in Unencrypted Browser Storage
**Severity:** 🟠 HIGH  
**Location:** `checkout.html` (line 133), `src/js/userStorage.js`, `src/js/cart.js`  
**CWE:** CWE-312: Cleartext Storage of Sensitive Information

**Description:**  
Personally Identifiable Information (PII) is stored in plaintext in localStorage/sessionStorage:
- Customer names
- Email addresses
- Phone numbers
- Order details

**Code Evidence:**
```javascript
// checkout.html line 133
localStorage.setItem('tcr_last_order', JSON.stringify(saved));
// Contains: { name, email, phone, cart, totals, createdAt }

// cart.js line 81
sessionStorage.setItem(CART_KEY, JSON.stringify(cart));
```

**Impact:**
- PII accessible to any JavaScript running on the page (XSS vulnerability)
- Data persists across sessions (localStorage never expires)
- Accessible via browser DevTools by any user with physical access
- GDPR/CCPA compliance violations

**Recommendation:**
- Store PII only on the backend with encryption at rest
- Use session IDs instead of storing full user data client-side
- Implement data retention policies (automatic deletion)
- Add encryption for sensitive fields if client-side storage is required
- Provide user data export/deletion capabilities for compliance

---

### 5. No HTTPS Enforcement
**Severity:** 🟠 HIGH  
**Location:** All fetch calls, hardcoded URLs  
**CWE:** CWE-319: Cleartext Transmission of Sensitive Information

**Description:**  
All API calls use `http://localhost:3001` without HTTPS enforcement:

```javascript
// menu.html line 68
const resp = await fetch('http://localhost:3001/products');

// orders.js line 102
const resp = await fetch(API_URL);  // API_URL = 'http://localhost:3001/orders'
```

**Impact:**
- Credentials transmitted in plaintext over network
- PII exposed in network traffic
- Man-in-the-middle (MITM) attacks possible
- Session hijacking via network sniffing

**Recommendation:**
- Enforce HTTPS in production (HSTS headers)
- Use environment variables for API URLs (not hardcoded http://)
- Implement Content Security Policy to block mixed content
- Use Secure and HttpOnly flags on cookies

---

### 6. Unsigned Demo Tokens
**Severity:** 🟠 HIGH  
**Location:** `src/js/sessionManager.js` (lines 34-44)  
**CWE:** CWE-347: Improper Verification of Cryptographic Signature

**Description:**  
Session tokens are unsigned Base64-encoded JSON, easily forged:

```javascript
createToken(sub, expiresInSec = 60 * 60) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + expiresInSec;
  const payload = { sub, iat, exp };
  return btoa(JSON.stringify(payload));  // NO SIGNATURE
}
```

**Impact:**
- Attackers can forge tokens with arbitrary user IDs
- Token expiration can be bypassed (set exp to distant future)
- No way to verify token authenticity

**Exploitation:** Easy - decode existing token, modify, re-encode

**Recommendation:**
- Use industry-standard JWT libraries (jsonwebtoken, jose)
- Sign tokens with HS256/RS256 using secret key
- Validate signature on every protected request
- Implement token refresh mechanism
- Use short expiration times (15 minutes)

---

### 7. Missing Rate Limiting
**Severity:** 🟠 HIGH  
**Location:** `src/js/loginRateLimiter.js`, backend endpoints  
**CWE:** CWE-307: Improper Restriction of Excessive Authentication Attempts

**Description:**  
While there is client-side rate limiting for login attempts, it can be bypassed by:
- Clearing localStorage
- Using different browser
- Sending requests directly to backend (bypassing frontend)

**Code Evidence:**
```javascript
// loginRateLimiter.js stores attempts in localStorage
localStorage.setItem(STORAGE_PREFIX + identifier, JSON.stringify(envelope));
```

Backend (json-server) has **no rate limiting at all**.

**Impact:**
- Brute force attacks on demo accounts
- Denial of service via request flooding
- Credential stuffing attacks

**Recommendation:**
- Implement server-side rate limiting (express-rate-limit)
- Use IP-based or token-based throttling
- Implement CAPTCHA after N failed attempts
- Consider using WAF (Web Application Firewall) in production

---

## Medium Severity Issues

### 8. XSS Vulnerability via innerHTML
**Severity:** 🟡 MEDIUM  
**Location:** `src/js/cart.js` (lines 181-187), `src/js/orders.js` (lines 272-286), `src/qualify.js` (line 255)  
**CWE:** CWE-79: Cross-Site Scripting (XSS)

**Description:**  
Multiple locations use `innerHTML` to render user-controlled data without sanitization:

```javascript
// qualify.js line 255 - DOCUMENTED SECURITY NOTE
s.innerHTML = msgs.length ? '<ul>'+msgs.map(m=>'<li>'+m+'</li>').join('')+'</ul>' : '';

// orders.js line 286 - renders order data
thead.innerHTML = `<tr>...</tr>`;
```

**Impact:**
- Stored XSS if malicious data is POSTed to orders
- Session hijacking via stolen tokens
- Phishing attacks via injected content

**Note:** The code includes security warnings about innerHTML usage, indicating awareness of the risk.

**Recommendation:**
- Use `textContent` for all user-controlled data
- Sanitize HTML using DOMPurify library if innerHTML is required
- Implement Content Security Policy (CSP) headers
- Use template literals with escape functions

---

### 9. CORS Not Configured
**Severity:** 🟡 MEDIUM  
**Location:** json-server backend  
**CWE:** CWE-942: Permissive Cross-domain Policy

**Description:**  
json-server allows requests from any origin by default (no CORS restrictions).

**Impact:**
- Any website can make requests to the backend
- CSRF attacks possible
- Data exfiltration from malicious sites

**Recommendation:**
- Configure CORS with allowed origins whitelist
- Implement CSRF tokens for state-changing operations
- Use SameSite cookie attributes

---

### 10. Console Logging Sensitive Data
**Severity:** 🟡 MEDIUM  
**Location:** Multiple files (login.js, orders.js, sales.html)  
**CWE:** CWE-532: Information Exposure Through Log Files

**Description:**  
Debug logs contain sensitive information:

```javascript
// login.js line 85
console.log('[login.js] credentials', { email, passwordPresent: !!password });

// sales.html line 68
console.log('[sales.html] adminLoggedIn value:', localStorage.getItem('adminLoggedIn'));
```

**Impact:**
- Credentials/PII visible in browser console
- Logs may be collected by monitoring tools
- Information leakage in production builds

**Recommendation:**
- Remove debug logs in production builds (webpack DefinePlugin)
- Use log levels and disable debug logs in production
- Never log passwords, tokens, or PII

---

## Low Severity Issues

### 11. Missing Content Security Policy
**Severity:** 🟢 LOW  
**Location:** All HTML pages (no CSP headers)  
**CWE:** CWE-1021: Improper Restriction of Rendered UI Layers

**Description:**  
No Content Security Policy headers configured, allowing inline scripts and any external resources.

**Recommendation:**
- Add CSP headers: `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'`
- Incrementally tighten policy as needed
- Use CSP reporting to identify violations

---

### 12. Base64 Encoding Mistaken for Encryption
**Severity:** 🟢 LOW  
**Location:** `src/js/userStorage.js` (lines 156-157)  
**CWE:** CWE-327: Use of a Broken or Risky Cryptographic Algorithm

**Description:**  
Code includes `passwordBase64` field with comments warning it's not encryption:

```javascript
// SECURITY NOTE: The `passwordBase64` field is supported for demo/education only.
// Base64 is NOT encryption. Storing passwords (even encoded) in localStorage
```

**Impact:**  
Low - The code explicitly documents this is for education only and should not be used.

**Recommendation:**
- Remove `passwordBase64` functionality entirely in production
- If educational context is needed, add prominent warnings in UI

---

## Dependency Analysis

**Backend Dependencies (titan-run-backend):**
```json
{
  "devDependencies": {
    "json-server": "^1.0.0-beta.3"
  }
}
```

**npm audit result:** ✅ **0 vulnerabilities found**

**Frontend Dependencies:**  
No npm dependencies (vanilla JavaScript)

**Assessment:**  
- json-server is beta software (1.0.0-beta.3) - not recommended for production
- No known CVEs at time of assessment
- Minimal attack surface due to lack of dependencies

---

## Compliance Considerations

### GDPR Violations
- ❌ No consent mechanism for PII collection
- ❌ No data retention policy
- ❌ No user data export/deletion capabilities
- ❌ PII stored without encryption

### OWASP Top 10 (2021) Coverage
1. ✅ **A01:2021-Broken Access Control** - IDENTIFIED (client-side auth bypass)
2. ✅ **A02:2021-Cryptographic Failures** - IDENTIFIED (plaintext storage, no HTTPS)
3. ✅ **A03:2021-Injection** - IDENTIFIED (innerHTML XSS risk)
4. ⚠️ **A04:2021-Insecure Design** - PARTIAL (demo architecture is inherently insecure)
5. ✅ **A05:2021-Security Misconfiguration** - IDENTIFIED (no CSP, permissive CORS)
6. ❌ **A06:2021-Vulnerable Components** - NOT FOUND (no vulnerable dependencies)
7. ✅ **A07:2021-Identification/Authentication Failures** - IDENTIFIED (client-side auth, plaintext passwords)
8. ⚠️ **A08:2021-Software and Data Integrity** - PARTIAL (unsigned tokens)
9. ⚠️ **A09:2021-Security Logging/Monitoring** - PARTIAL (excessive debug logs, no security monitoring)
10. ⚠️ **A10:2021-Server-Side Request Forgery** - N/A (no server-side request functionality)

---

## Summary of Findings

| Severity | Count | Issues |
|----------|-------|--------|
| 🔴 Critical | 3 | Client-side auth bypass, Plaintext passwords, No server validation |
| 🟠 High | 4 | Unencrypted PII storage, No HTTPS, Unsigned tokens, Missing rate limiting |
| 🟡 Medium | 3 | XSS via innerHTML, CORS not configured, Console logging PII |
| 🟢 Low | 2 | No CSP, Base64 not encryption |
| **Total** | **12** | |

---

## Recommended Action Plan

### Phase 1: Critical Fixes (Required before any production use)
1. **Implement Backend Authentication**
   - Replace json-server with Express/Fastify
   - Add JWT-based authentication with signed tokens
   - Move all credential verification to server
   - Use bcrypt/Argon2 for password hashing

2. **Add Server-Side Validation**
   - Implement input validation middleware
   - Add authorization checks on all protected endpoints
   - Use parameterized queries

3. **Remove Client-Side Security**
   - Delete all client-side auth checks (they provide false security)
   - Remove hardcoded credentials
   - Stop storing PII in localStorage

### Phase 2: High Priority Security Hardening
4. **Enable HTTPS**
   - Obtain TLS certificate (Let's Encrypt)
   - Configure HSTS headers
   - Redirect all HTTP to HTTPS

5. **Secure Data Storage**
   - Move PII storage to backend database
   - Implement encryption at rest
   - Add data retention policies

6. **Implement Rate Limiting**
   - Add express-rate-limit middleware
   - Implement CAPTCHA for login

### Phase 3: Medium Priority Improvements
7. **Fix XSS Vulnerabilities**
   - Replace innerHTML with textContent
   - Add DOMPurify for HTML sanitization
   - Implement CSP headers

8. **Configure CORS**
   - Whitelist allowed origins
   - Add CSRF protection

9. **Remove Debug Logs**
   - Strip console.log statements in production
   - Implement proper logging (Winston, Pino)

### Phase 4: Long-Term Improvements
10. **Add Security Headers** (helmet.js)
11. **Implement Session Management** (express-session with Redis)
12. **Add Security Testing** (OWASP ZAP, Burp Suite)
13. **GDPR Compliance** (consent forms, data export, deletion)

---

## Testing Recommendations

### Penetration Testing Scenarios
1. **Authentication Bypass Test**
   - Attempt to access sales.html without login
   - Manipulate localStorage to gain admin access
   - Test token forgery

2. **Injection Testing**
   - POST orders with XSS payloads
   - Test for SQL/NoSQL injection (when backend is implemented)

3. **Data Exposure Testing**
   - Inspect localStorage/sessionStorage for PII
   - Monitor network traffic for plaintext data

4. **Rate Limiting Testing**
   - Automate login attempts to test lockout
   - Flood backend endpoints

---

## Conclusion

The Titan Coffee Run application is a **well-documented educational demo** with explicit security warnings in the code. The current architecture is **NOT suitable for production deployment** and requires complete security redesign to protect user data and prevent unauthorized access.

**Key Takeaway:** This is an excellent learning resource that clearly demonstrates authentication flows and API integration, but should **never handle real user data or real transactions** without implementing ALL recommendations in Phase 1 and Phase 2.

---

## References

- [OWASP Top 10 (2021)](https://owasp.org/www-project-top-ten/)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)
- [GDPR Compliance Checklist](https://gdpr.eu/checklist/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

## User-Defined Vulnerability Checklist

This section addresses specific security concerns through a targeted questionnaire format.

### 1. Does it accept user input without validation or sanitization?

**Answer:** ✅ **YES - CRITICAL ISSUE**

**Details:**
- **Backend (json-server):** Accepts ALL POST/PUT/PATCH requests to `/orders` and `/products` endpoints without ANY validation
- **Frontend validation exists** but is client-side only and easily bypassed
- **No server-side input sanitization** for special characters, SQL injection, or script injection

**Evidence:**
```javascript
// checkout.html line 125 - NO validation before POST
const resp = await fetch('http://localhost:3001/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(orderObj)  // Directly sends user input
});
```

**Examples of Unvalidated Input:**
- Order form fields (name, email, phone) - client-side validation only
- Product search/filter inputs - no sanitization
- Cart quantities - type checking on client only
- Credit application form (`apply.html`) - validates format but not malicious content

**Risk Impact:**
- Malicious data can be injected into database
- Price manipulation possible (change cart item prices)
- Data structure corruption (send unexpected fields)
- Potential for stored XSS attacks

**Specific Vulnerabilities:**
- `src/js/orders.js` - `post()` method sends data without sanitization
- `checkout.html` - contact form data sent directly to backend
- `src/qualify.js` - validates format but not malicious patterns

---

### 2. Is user-provided data inserted directly into HTML without escaping?

**Answer:** ⚠️ **YES - MEDIUM TO HIGH RISK**

**Details:**
- Multiple locations use `innerHTML` to render user-controlled data
- Some instances have security warnings in comments (indicating awareness)
- No HTML escaping or sanitization library (e.g., DOMPurify) implemented

**Evidence:**

**Location 1: `src/qualify.js` (line 255)**
```javascript
// DOCUMENTED XSS RISK - includes security warning comment
s.innerHTML = msgs.length ? '<ul>'+msgs.map(m=>'<li>'+m+'</li>').join('')+'</ul>' : '';
```
- Renders validation messages directly into HTML
- If validation error messages contain user input, XSS is possible

**Location 2: `src/js/cart.js` (lines 181-187)**
```javascript
itemsEl.innerHTML = '';
// ...
thead.innerHTML = '<tr><th style="width:72px">Qty</th><th>Item</th>...</tr>';
```
- Renders cart items which include product names from database
- If product names are compromised (injected via unvalidated POST), XSS occurs

**Location 3: `src/js/orders.js` (lines 272-286)**
```javascript
container.innerHTML = '';
// ...
thead.innerHTML = `<tr>...</tr>`;
```
- Renders order data including customer names, emails
- If malicious order data is POSTed, it will execute when rendered

**Safe Usage (for comparison):**
```javascript
// Some code DOES use textContent safely:
itemsEl.textContent = 'Cart is empty.';  // Safe - no XSS risk
```

**Risk Scenarios:**
1. **Stored XSS via Orders:** Attacker POSTs order with name: `<script>alert(document.cookie)</script>` → executes when admin views orders
2. **Reflected XSS via Validation:** Error messages might echo unsanitized user input
3. **DOM-based XSS:** URL parameters rendered without encoding

**Mitigation Status:**
- ❌ No DOMPurify or similar sanitization library installed
- ❌ No Content Security Policy to block inline scripts
- ✅ Code comments show security awareness (partial credit)

---

### 3. Are passwords stored in plain text?

**Answer:** ✅ **YES - CRITICAL ISSUE**

**Details:**
- **Demo user passwords hardcoded in plaintext** in client-side JavaScript
- **Admin password hardcoded in plaintext** in authentication logic
- **Base64-encoded passwords** in optional user storage (Base64 is NOT encryption)

**Evidence:**

**Location 1: `src/js/login.js` (lines 39-42)**
```javascript
// PLAINTEXT PASSWORDS IN SOURCE CODE
const DEMO_USERS = {
  'demo@example.com': { password: 'DemoPass123', id: 'user-demo' }
};
```
- Password visible to anyone viewing page source
- Impossible to change without code deployment

**Location 2: `src/js/login.js` (line 105)**
```javascript
// HARDCODED ADMIN PASSWORD
if (password === 'test123') {
  // Admin authentication logic
}
```
- Admin password `test123` is weak and hardcoded
- No password hashing or secure comparison

**Location 3: `src/js/userStorage.js` (lines 146-157)**
```javascript
// OPTIONAL BASE64 PASSWORD STORAGE (with security warning)
constructor({ firstName = '', lastName = '', email = '', 
              passwordBase64 = undefined, passwordSet = false, ...
  this.passwordBase64 = passwordBase64; // Base64 is NOT encryption
  // SECURITY NOTE: Base64 is NOT encryption. Storing passwords (even encoded)
  // in localStorage is insecure and for demo/education only.
```
- `passwordBase64` field allows storing Base64-encoded passwords in localStorage
- Code includes warnings but functionality exists

**Storage Locations:**
- **Client-side source code:** Demo passwords in `login.js`
- **localStorage:** Optional Base64 passwords in `tcr_user_v1` key
- **No backend storage:** json-server doesn't authenticate, stores no passwords

**Why This Is Critical:**
- Anyone can view passwords in browser DevTools or page source
- localStorage accessible to any JavaScript (XSS can steal)
- Base64 decoding is trivial: `atob('RGVtb1Bhc3MxMjM=')` → `DemoPass123`
- No salting, hashing, or key derivation functions used

**Demo Credentials Exposed:**
- Demo user: `demo@example.com` / `DemoPass123`
- Admin: `admin` / `test123`

---

### 4. Are API keys or credentials visible in the client-side code?

**Answer:** ⚠️ **PARTIAL - MODERATE RISK**

**Details:**
- **No third-party API keys found** (e.g., Stripe, AWS, Google APIs)
- **Demo credentials are hardcoded** (covered in Question 3)
- **Backend URL hardcoded** but is localhost (low risk for production if changed)
- **No secrets management** implemented

**Evidence:**

**Hardcoded Backend URLs:**
```javascript
// menu.html line 68
const resp = await fetch('http://localhost:3001/products');

// src/js/orders.js line 17
const API_URL = 'http://localhost:3001/orders';

// checkout.html line 125
const resp = await fetch('http://localhost:3001/orders', {...});
```
- Backend URL hardcoded in multiple locations
- Not an immediate risk (localhost only) but problematic for production
- Should use environment variables: `process.env.API_URL`

**What's NOT Found (Good):**
- ✅ No AWS access keys
- ✅ No Stripe publishable/secret keys
- ✅ No Firebase config objects
- ✅ No database connection strings
- ✅ No OAuth client secrets

**What IS Exposed:**
- ❌ Demo user credentials (see Question 3)
- ❌ Admin credentials (see Question 3)
- ❌ Backend endpoint structure visible

**Risk Assessment:**
- **Current State:** Low risk for third-party services (none used)
- **Production Risk:** HIGH if deployed without environment variables
- **Credential Exposure:** CRITICAL (hardcoded passwords)

**Recommendation:**
- Use `.env` files with `dotenv` package for configuration
- Never commit API keys to version control
- Use environment-specific builds (dev/staging/prod)
- Implement secrets management (AWS Secrets Manager, Azure Key Vault)

---

### 5. Does the app display detailed error messages to users? To developers?

**Answer:** ⚠️ **YES - MIXED BEHAVIOR**

**Details:**
- **Users:** Receive some generic error messages (good) but also see console errors (bad)
- **Developers:** Extensive console.log debugging in production code (high risk)
- **Error handling:** Try/catch blocks present but leak implementation details

**Evidence:**

### **A. User-Facing Error Messages (Mostly Generic - Good)**

```javascript
// orders.js line 110 - Generic error message
console.error('Orders.fetchAll error:', err);
return [];  // Silent failure with empty array
```

```javascript
// login.js lines 153-154 - Generic message
if (msg) { 
  msg.textContent = 'An unexpected error occurred. Check console.'; 
  msg.className = 'error'; 
}
```
- User sees "An unexpected error occurred" (generic)
- BUT directed to "Check console" (exposes debugging info)

### **B. Developer/Console Logging (Excessive - Bad)**

**Authentication Debugging:**
```javascript
// login.js line 85
console.log('[login.js] credentials', { email, passwordPresent: !!password });

// login.js line 129
console.log('[login.js] auth result', res);
```
- Logs authentication attempts and results
- Visible in production browser console

**Admin Authorization Debugging:**
```javascript
// sales.html line 68
console.log('[sales.html] adminLoggedIn value:', localStorage.getItem('adminLoggedIn'));

// sales.html line 72
console.log('[sales.html] admin verified — showing page');
```
- Reveals authorization logic and state
- Helps attackers understand security model

**API Error Details:**
```javascript
// orders.js line 110
console.error('Orders.fetchAll error:', err);
// Logs full error object including stack traces
```

### **C. Alert Dialogs (Mixed Security)**

```javascript
// login.js line 142
window.alert('Sign in failed — check your email/password and try again.');
```
- Generic message (good)

```javascript
// login.js line 153
window.alert('An error occurred while signing in — see console.');
```
- Directs user to console (bad - leaks debug info)

**What Gets Exposed:**
- Implementation details (file names, function names in console logs)
- Authentication flow logic
- Error stack traces
- localStorage key names and values
- API endpoint structure
- Client-side authorization checks

**Risk Impact:**
- **Information Disclosure:** Attackers learn system architecture
- **Attack Surface Mapping:** Console logs reveal security mechanisms
- **Debugging Aids Exploitation:** Stack traces help craft attacks

**Recommendation:**
- Remove ALL console.log statements in production builds
- Use build-time stripping (webpack, terser)
- Implement proper error logging service (Sentry, LogRocket)
- Show generic user messages only
- Log detailed errors server-side only

---

### 6. Are there default or weak passwords in this configuration?

**Answer:** ✅ **YES - CRITICAL ISSUE**

**Details:**
- **Weak default passwords** present and documented in UI
- **No password complexity requirements** enforced server-side
- **Easily guessable credentials** for both demo and admin accounts

**Evidence:**

### **Documented Default Credentials**

**From `login.html` (visible to all users):**
```html
<p class="note">Demo accounts:<br>
<strong>demo@example.com / DemoPass123</strong><br>
<strong>Admin: admin / test123</strong></p>
```
- Credentials displayed directly on login page
- No requirement to change on first login
- No password expiration policy

### **Password Strength Analysis**

| Account | Username | Password | Strength | Issues |
|---------|----------|----------|----------|---------|
| Demo User | `demo@example.com` | `DemoPass123` | 🟡 WEAK | Dictionary word + predictable numbers |
| Admin | `admin` | `test123` | 🔴 VERY WEAK | Common default, appears in breach databases |

**Password Weaknesses:**
1. **`test123` (Admin):**
   - Extremely common default password
   - Only 7 characters
   - No special characters
   - Dictionary word + sequential numbers
   - Appears in top 1000 most common passwords

2. **`DemoPass123` (Demo User):**
   - Predictable pattern (word + numbers)
   - Contains "Demo" and "Pass" (hint words)
   - 11 characters but low entropy
   - No special characters

### **No Password Policies Enforced**

**Registration Form Has Client-Side Strength Meter:**
```javascript
// src/js/registration.js line 106
calculatePasswordScore(value) {
  // Checks length and character variety
  // But NO server-side enforcement
}
```
- Password strength calculated but not enforced
- Client-side only (easily bypassed)
- No minimum score requirement on backend

**Missing Security Features:**
- ❌ No password complexity requirements (upper/lower/number/special)
- ❌ No minimum length enforcement (server-side)
- ❌ No password expiration/rotation policy
- ❌ No checking against common password lists
- ❌ No force password change on first login
- ❌ No multi-factor authentication (MFA)
- ❌ No account lockout after repeated failures (backend)

### **Default Credentials Risk**

**Attack Scenarios:**
1. **Credential Stuffing:** `admin/test123` likely tried first by automated tools
2. **Brute Force:** Weak passwords crack in seconds
3. **Social Engineering:** "Demo" credentials obvious to attackers
4. **Documentation Exposure:** README or login page shows credentials

**Real-World Impact:**
- If deployed to internet with default passwords → **immediate compromise**
- Automated scanners try common credentials (`admin/admin`, `admin/test123`, etc.)
- Default credentials listed in public GitHub repo (searchable)

**Recommendation:**
- **NEVER use default passwords in any environment**
- Force password change on first login
- Implement password complexity policy (NIST SP 800-63B):
  - Minimum 12-15 characters
  - Check against breach databases (HaveIBeenPwned API)
  - Allow passphrases and special characters
- Use multi-factor authentication (MFA)
- Implement account lockout (5 failed attempts)
- Remove credentials from source code and documentation

---

### 7. Is data transmitted without encryption?

**Answer:** ✅ **YES - HIGH RISK**

**Details:**
- **All API traffic uses HTTP** (not HTTPS)
- **No TLS/SSL encryption** on localhost development server
- **Passwords transmitted in plaintext** over the network
- **PII sent unencrypted** in POST requests

**Evidence:**

### **Unencrypted API Endpoints**

```javascript
// menu.html line 68
const resp = await fetch('http://localhost:3001/products');

// orders.js line 17
const API_URL = 'http://localhost:3001/orders';

// checkout.html line 125
const resp = await fetch('http://localhost:3001/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(orderObj)  // PII sent over HTTP
});
```
- **Protocol:** `http://` (plaintext)
- **Port:** 3001 (non-standard, no HTTPS)
- **Encryption:** NONE

### **Sensitive Data Transmitted Unencrypted**

**1. Authentication Credentials:**
```javascript
// login.js - password sent during authentication
// (currently client-side only, but pattern shows risk)
const password = pwdEl.value || '';
// If sent to backend: transmitted in plaintext over HTTP
```

**2. Personal Identifiable Information (PII):**
```javascript
// checkout.html line 125-130
const orderObj = {
  name,      // Full name in plaintext
  email,     // Email in plaintext
  phone,     // Phone number in plaintext
  cart,      // Purchase history in plaintext
  totals
};
const resp = await fetch('http://localhost:3001/orders', {
  method: 'POST',
  body: JSON.stringify(orderObj)  // ALL PII UNENCRYPTED
});
```

**3. Session Tokens:**
```javascript
// sessionManager.js - tokens stored in localStorage
// If sent via Authorization header: transmitted in plaintext
```

### **Network Traffic Analysis**

**What's Visible on Network (Wireshark/tcpdump):**
- ✅ Complete HTTP request/response bodies
- ✅ Customer names, emails, phone numbers
- ✅ Order details and cart contents
- ✅ Session tokens (if implemented)
- ✅ API endpoint structure

**Example HTTP Request (plaintext):**
```http
POST /orders HTTP/1.1
Host: localhost:3001
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "555-1234",
  "cart": [...]
}
```

### **Attack Vectors**

**1. Man-in-the-Middle (MITM):**
- Attacker on same WiFi network can intercept traffic
- HTTP traffic visible to ISP, network admin, proxy servers
- No integrity protection (traffic can be modified)

**2. Session Hijacking:**
- Session tokens transmitted without encryption
- Token stolen → attacker impersonates user

**3. Credential Sniffing:**
- If passwords sent to backend, visible on network
- Replay attacks possible

**4. Data Exfiltration:**
- PII collected by passive network monitoring
- GDPR/CCPA violations (PII must be encrypted in transit)

### **Current State: Localhost Only**

**Mitigating Factor:**
- Traffic stays on `localhost` (127.0.0.1) → not exposed to external network
- Loopback interface not accessible remotely

**Why This Still Matters:**
1. **Malicious local processes** can sniff loopback traffic
2. **Pattern established** - developers might deploy with same config
3. **No HTTPS enforcement** - easy to forget when moving to production
4. **Code examples** - others might copy HTTP pattern

### **Compliance Impact**

**Regulatory Violations:**
- ❌ **PCI DSS:** Credit card data must use TLS 1.2+ (N/A here, but pattern is wrong)
- ❌ **HIPAA:** PHI must be encrypted in transit (if handling health data)
- ❌ **GDPR Article 32:** "Encryption of personal data" required
- ❌ **CCPA:** Reasonable security measures include encryption

**Risk Level:**
- **Development (localhost):** LOW (traffic doesn't leave machine)
- **Production (deployed):** CRITICAL (immediate security breach)

**Recommendation:**
- **Enforce HTTPS everywhere** (even in development with self-signed certs)
- Use TLS 1.3 or TLS 1.2 minimum
- Implement HSTS headers: `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- Use environment variables for API URLs (prevent hardcoded http://)
- Block mixed content (CSP: `upgrade-insecure-requests`)
- Obtain free TLS certificates (Let's Encrypt, Cloudflare)

---

### 8. Does the app lack input length or type restrictions?

**Answer:** ⚠️ **YES - MODERATE TO HIGH RISK**

**Details:**
- **Client-side validation exists** but is insufficient and bypassable
- **No server-side length restrictions** (json-server accepts any size)
- **Type validation on client** but not enforced on backend
- **No rate limiting** to prevent resource exhaustion

**Evidence:**

### **A. Length Restrictions - Missing on Backend**

**Client-Side Validation (Present but Insufficient):**

```javascript
// src/qualify.js - Client-side format validation
export function isEmail(value) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(value).trim());
}

export function isSSNLast4(value) {
  return /^\d{4}$/.test(String(value).trim());  // Enforces exactly 4 digits
}

// ZIP validation
if (!/^\d{5}$/.test(String(data.zip || '').trim())) {
  errors.push({ field: 'zip', message: 'ZIP code must be 5 digits.' });
}
```
- ✅ Email format checked
- ✅ SSN must be exactly 4 digits
- ✅ ZIP must be exactly 5 digits
- ❌ No maximum length checks (email could be 10,000 characters)
- ❌ Validation easily bypassed (client-side only)

**Backend Validation (NONE):**
```javascript
// json-server accepts ANY data structure without validation
// No length limits, no type checks, no sanitization
POST http://localhost:3001/orders
Body: { "name": "A".repeat(1000000) }  // Accepted!
```

### **B. Missing Length Limits by Field**

| Field | Client Limit | Server Limit | Risk |
|-------|--------------|--------------|------|
| **Name** | None | None | 🔴 Can submit megabytes of data |
| **Email** | Format only | None | 🔴 No max length (buffer overflow potential) |
| **Phone** | None | None | 🔴 Could be gigabytes |
| **Address** | None | None | 🔴 Unlimited text |
| **Order Notes** | None | None | 🔴 Could contain massive payloads |
| **Cart Items** | None | None | 🔴 Unlimited array size |
| **Product Name** | None | None | 🔴 No DB constraints |

### **C. Type Restrictions - Partial Client-Side Only**

**Type Checking Present (Client):**

```javascript
// src/qualify.js line 106
export function isNonNegativeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0;
}
```
- ✅ Validates gross income is numeric
- ❌ No server-side enforcement

**Type Confusion Possible (Backend):**
```javascript
// Expected: { "quantity": 2 }
// Attacker sends: { "quantity": "2 OR 1=1--" }
// json-server stores: ✅ Accepted without type check
```

**Missing Type Enforcement:**
- Quantity could be string instead of number
- Prices could be negative or non-numeric
- Dates could be invalid format
- Boolean fields could be strings

### **D. HTML Input Attributes (Weak Client-Side Protection)**

**Some HTML5 Validation Exists:**
```html
<!-- Likely patterns in forms (not shown in files but typical) -->
<input type="email" required>        <!-- Browser validates format -->
<input type="number" min="0">        <!-- Browser prevents negatives -->
<input type="text" maxlength="50">   <!-- Browser limits length -->
```
- ⚠️ HTML5 validation easily bypassed (edit DOM or send raw HTTP)
- ⚠️ Different browsers enforce differently
- ⚠️ Not a security control

### **E. Resource Exhaustion Attack Scenarios**

**1. Database Bloat:**
```javascript
// Attack: Submit 1GB order with massive name field
fetch('http://localhost:3001/orders', {
  method: 'POST',
  body: JSON.stringify({
    name: 'A'.repeat(1000000000),  // 1 billion characters
    email: 'attacker@evil.com',
    cart: []
  })
});
```
- json-server writes to `db.json` → file grows to 1GB
- Application becomes unusable
- Disk space exhausted

**2. Memory Exhaustion:**
```javascript
// Attack: Submit array with 1 million cart items
body: JSON.stringify({
  cart: Array(1000000).fill({ id: 'latte', qty: 1, price: 5 })
})
```
- Backend attempts to parse massive JSON → out of memory
- Denial of service

**3. Processing Time Attack:**
```javascript
// Attack: Deeply nested JSON (CPU exhaustion)
body: JSON.stringify({
  nested: { nested: { nested: { /* 10,000 levels deep */ } } }
})
```
- JSON parser consumes excessive CPU
- Server becomes unresponsive

### **F. What IS Validated (Partial Coverage)**

**Credit Application Form (`src/qualify.js`):**
- ✅ Email format (regex)
- ✅ Email confirmation match
- ✅ SSN last-4 (exactly 4 digits)
- ✅ State code (2-letter valid US state)
- ✅ ZIP code (exactly 5 digits)
- ✅ Gross income (positive number)
- ✅ Consent checkbox (boolean)

**What's NOT Validated:**
- ❌ First/last name length
- ❌ Email max length (could be 1MB)
- ❌ City name length
- ❌ Gross income max value (could enter 999999999999999)

### **G. Registration Form Password Validation**

```javascript
// src/js/registration.js line 106
calculatePasswordScore(value) {
  let score = 0;
  if (value.length >= 8) score++;   // Length check
  if (value.length >= 12) score++;
  if (/[a-z]/.test(value)) score++; // Lowercase
  if (/[A-Z]/.test(value)) score++; // Uppercase
  if (/\d/.test(value)) score++;    // Digit
  if (/[^a-zA-Z0-9]/.test(value)) score++; // Special char
  return score;
}
```
- ✅ Encourages strong passwords (client-side meter)
- ❌ Not enforced (can submit weak password)
- ❌ No max length (could submit 1MB password)

### **H. Comparison: What Should Be Implemented**

**Industry Best Practices (Missing):**

| Field | Recommended Limit | Current Limit | Status |
|-------|-------------------|---------------|--------|
| Name | 100 chars | None | ❌ Missing |
| Email | 254 chars (RFC 5321) | None | ❌ Missing |
| Phone | 20 chars | None | ❌ Missing |
| Address | 200 chars | None | ❌ Missing |
| Password | 8-128 chars | None | ❌ Missing |
| Cart Items | 100 items | None | ❌ Missing |
| Order Total | $0-$10,000 | None | ❌ Missing |
| Request Size | 100KB max | None | ❌ Missing |

### **Risk Impact**

**Severity: HIGH**
- **Denial of Service (DoS):** Resource exhaustion via massive payloads
- **Database Corruption:** Invalid data types stored
- **Storage Costs:** Unlimited data growth
- **Performance Degradation:** Slow queries on oversized fields
- **Buffer Overflow:** (If backend uses unsafe languages)

**Recommendation:**

**Server-Side (Critical):**
1. Implement request size limits: `express.json({ limit: '100kb' })`
2. Validate field lengths (Joi/Zod schemas)
3. Enforce type constraints (TypeScript, JSON Schema)
4. Add database constraints (VARCHAR limits, CHECK constraints)
5. Implement rate limiting (10 requests/minute per IP)

**Client-Side (Defense in Depth):**
1. Add `maxlength` attributes to all inputs
2. Use `type="number"` with `min`/`max` for numeric fields
3. Show character count UI for text areas
4. Disable submit button until validation passes

**Example Secure Validation:**
```javascript
// Server-side with express-validator
const { body } = require('express-validator');

router.post('/orders', [
  body('name').isLength({ min: 1, max: 100 }).trim().escape(),
  body('email').isEmail().isLength({ max: 254 }).normalizeEmail(),
  body('phone').isLength({ max: 20 }).matches(/^[\d\s\-\+\(\)]+$/),
  body('cart').isArray({ max: 100 }),
  body('cart.*.quantity').isInt({ min: 1, max: 99 }),
  body('total').isFloat({ min: 0, max: 10000 })
], (req, res) => { /* handle validated request */ });
```

---

## Checklist Summary

| # | Question | Answer | Severity | Status |
|---|----------|--------|----------|--------|
| 1 | Does it accept user input without validation? | ✅ YES | 🔴 CRITICAL | Backend has NO validation |
| 2 | Is data inserted into HTML without escaping? | ⚠️ YES | 🟠 HIGH | innerHTML used, no sanitization |
| 3 | Are passwords stored in plain text? | ✅ YES | 🔴 CRITICAL | Hardcoded, Base64 in storage |
| 4 | Are API keys/credentials visible in code? | ⚠️ PARTIAL | 🟡 MEDIUM | Demo credentials exposed |
| 5 | Does it display detailed error messages? | ⚠️ YES | 🟡 MEDIUM | Excessive console logging |
| 6 | Are there default/weak passwords? | ✅ YES | 🔴 CRITICAL | `test123`, `DemoPass123` |
| 7 | Is data transmitted without encryption? | ✅ YES | 🟠 HIGH | HTTP only, no HTTPS |
| 8 | Does it lack input length/type restrictions? | ⚠️ YES | 🟠 HIGH | No server-side limits |

**Overall Assessment:** 🔴 **CRITICAL RISK** - Application fails majority of basic security checks.

---

**Assessment completed successfully. No changes made to codebase per user requirements.**
