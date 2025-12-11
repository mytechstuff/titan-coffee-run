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

**Assessment completed successfully. No changes made to codebase per user requirements.**
