# Security Vulnerability Report (GudCity Loyalty Platform)

Date: 2025-08-28
Scope: Full repository static review (frontend, server, scripts, configs). No functional changes were made.

## High Severity

- XSS via innerHTML usage
  - Risk: DOM XSS if untrusted strings are injected into the UI.
  - Evidence:
    - `test-award-points.html`: multiple `.innerHTML = \`...${message}\`` (e.g., success/error rendering).
    - `public/quick-award-points.html`: `authStatusDiv.innerHTML = \`...${userData.name}...\``.
    - `public/direct-award-points.html`: multiple `.innerHTML` with interpolated data.
    - `public/emergency-award-points.html`: sets `result.innerHTML` from errors/JSON.
    - `src/components/QRScanner.tsx`: clears containers with `innerHTML = ''` (safe), but be cautious for any dynamic inserts.
  - Mitigation: Prefer `textContent` and DOM nodes. Sanitize any HTML with a robust sanitizer (DOMPurify). Avoid inserting raw strings.

- Usage of dangerouslySetInnerHTML
  - Risk: XSS if sanitizer is bypassed/insufficient.
  - Evidence:
    - `src/pages/admin/PageManager.tsx` lines around preview: `dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedPage.content) }}`.
    - `src/pages/admin/EmailTemplates.tsx` preview similarly uses `sanitizeHtml(getPreviewBody())`.
  - Note: There is a custom `sanitizeHtml` that removes scripts, on* handlers, and javascript: URLs. It is basic, not equivalent to DOMPurify; complex payloads may evade.
  - Mitigation: Replace custom sanitizer with DOMPurify configured with strict policy; only allow required tags/attributes.

- Dynamic code execution in database connector
  - Risk: `new Function` can introduce code injection if `template` becomes attacker-controlled; also blocks CSP without 'unsafe-eval'.
  - Evidence:
    - `src/utils/databaseConnector.ts`: `const taggedTemplate = new Function('sql', 'p', \`return sql\`${template}\`;\`);` then executed with params.
  - Mitigation: Remove `new Function`. Use tagged template function directly or parameterized queries with the postgres client; never reconstruct code from strings.

- Tokens stored in localStorage (XSS-stealable)
  - Risk: Any XSS can exfiltrate access tokens; multiple places read/write `localStorage`.
  - Evidence (non-exhaustive):
    - `src/contexts/AuthContext.tsx`: sets `localStorage.setItem('token', accessToken)` and reads tokens.
    - `src/services/authTokenService.ts`, `src/utils/directPointsAwardService.ts`, `src/components/QuickAwardPoints.tsx`, `public/*-points*.html` utilities repeatedly use localStorage for tokens.
  - Mitigation: Move auth tokens to secure, sameSite=strict, HttpOnly cookies from server; use CSRF protections for state-changing routes; for SPA, use short-lived access tokens and rotate via refresh tokens in cookies.

- CSP allows 'unsafe-inline' and 'unsafe-eval'
  - Risk: Significantly weakens XSS protections; also required by `new Function` usage.
  - Evidence:
    - `src/utils/helmetPolyfill.ts`: `script-src 'self' 'unsafe-inline' 'unsafe-eval'`.
  - Mitigation: Remove `unsafe-eval`; progressively eliminate inline scripts and `new Function`. Replace with strict nonce/sha-based CSP if inline is required only in dev.

## Medium Severity

- Open window without `rel="noopener noreferrer"` on external targets
  - Risk: Reverse tabnabbing.
  - Evidence:
    - `manual-points-fix.html`, `emergency-refresh.html`, `complete-fix.html` use `window.open(url, '_blank')` without specifying `noopener`. Same for localhost links.
  - Mitigation: Use `window.open(url, '_blank', 'noopener,noreferrer')` or set `rel` on anchors.

- Broad development CORS origins
  - Risk: Overly permissive origins in non-production could leak credentials if deployed with wrong NODE_ENV.
  - Evidence:
    - `src/server.ts` Socket.IO CORS: dev allows `['http://localhost:5173','http://localhost:3000']` (OK for dev). Production reads `FRONTEND_URL` fallback `http://localhost:5173`.
    - `src/utils/corsPolyfill.ts` defaultOrigin mirrors above.
  - Mitigation: Ensure production env sets `FRONTEND_URL` and rejects default. Consider validating scheme/host and avoiding http in prod.

- Verbose logs potentially leaking information
  - Risk: Logs may include tokens or PII in dev paths; some demo scripts print credentials.
  - Evidence:
    - Test/repair scripts print demo passwords/users (e.g., `fix-registration.mjs`, `update-password-hashes.mjs`).
    - Some UI logs when storing tokens (`AuthContext.tsx`: "JWT token saved to localStorage").
  - Mitigation: Guard logs behind debug flags; never log secrets. Remove demo credentials from any deployable path.

- Insecure HTTP localhost references in app config
  - Risk: Harmless locally, but ensure not used in prod.
  - Evidence:
    - Multiple `http://localhost:*` in configs and tests (`src/utils/env.ts`, `src/env.ts`, etc.).
  - Mitigation: Confirm production builds source URLs from env and enforce HTTPS.

## Low Severity / Best Practices

- Missing explicit `rel="noopener"` for `target="_blank"` anchors
  - Risk: Tabnabbing.
  - Evidence: Pattern exists; ensure all anchors include `rel`.

- Security headers polyfill rather than using vetted library
  - Risk: Divergence from upstream protections; custom `helmetPolyfill` may miss edge cases.
  - Evidence: `src/utils/helmetPolyfill.ts` implements manual headers including legacy `X-XSS-Protection`.
  - Mitigation: In server (Node), use official `helmet` with tailored CSP. If polyfill is only for browser mock, ensure real server uses real Helmet.

- Inline scripts in `index.html`
  - Risk: Conflicts with strict CSP; increases XSS surface if any variable interpolation occurs in future.
  - Evidence: Multiple inline `<script>` blocks in `index.html`.
  - Mitigation: Move scripts into separate static files and adopt nonce-based CSP.

## Additional Notes

- Sanitizer coverage
  - Custom sanitizer in admin previews removes scripts, event handlers, and javascript: URLs, but may not cover all DOM clobbering/URL schemes or SVG-based vectors.
  - Recommendation: Adopt DOMPurify with trustedTypes support and strict whitelist.

- Rate limiting
  - Server applies general and auth-specific limits (`src/server.ts` using polyfill). Ensure backing store is robust in real server (not just in-browser polyfill).

## File Pointers (non-exhaustive)

- DangerouslySetInnerHTML
  - `src/pages/admin/PageManager.tsx` (preview block)
  - `src/pages/admin/EmailTemplates.tsx` (preview block)

- innerHTML assignments
  - `test-award-points.html`, `public/quick-award-points.html`, `public/direct-award-points.html`, `public/emergency-award-points.html`, and others.

- Dynamic code execution
  - `src/utils/databaseConnector.ts` (use of `new Function`)

- CSP policy
  - `src/utils/helmetPolyfill.ts`

- Token storage
  - `src/contexts/AuthContext.tsx`, `src/services/authTokenService.ts`, `src/utils/directPointsAwardService.ts`, `src/components/QuickAwardPoints.tsx`, `public/test-*.html` tools.

## Remediation Checklist

- Replace `new Function` in DB connector with safe parameterized calls.
- Introduce DOMPurify; wrap all HTML rendering and remove custom sanitizer.
- Migrate auth to HttpOnly secure cookies; remove token usage from localStorage.
- Harden CSP: remove `'unsafe-eval'`; progressively remove inline scripts; use nonces.
- Add `noopener,noreferrer` to all window.open/anchor new-tabs.
- Ensure production env sets `FRONTEND_URL` and all URLs are HTTPS.
- Use official `helmet` in the real server runtime; keep polyfill for browser-only mocks.
- Reduce sensitive logs; strip secrets from any logs/test helpers.

This document is informational only; no code changes were applied.
