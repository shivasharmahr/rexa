# Security notes

## In place
- **Headers:** Helmet (CSP, HSTS, nosniff, no `X-Powered-By`, same-origin frame rule). CSP allows only our own scripts, reCAPTCHA and Google Analytics hosts (see `api/server.js`).
- **Public files:** only `assets/`, `logos/` and a short allow-list are served. `.env`, source, `package.json`, `routes/` etc. return 404.
- **Forms (`/api/contact`, `/api/lead`):** 10 KB body cap, strict validation (plain strings only), reCAPTCHA v3 (fails closed), hidden honeypot field (`middleware/honeypot.js`), rate limit, CORS limited to our origins, no cookies/credentials.
- **Email:** all user input HTML-escaped; line breaks stripped from subjects/names (no header injection).
- **Google Sheet:** cells that start with `= + - @` are neutralised; the Apps Script requires a shared secret.
- **Secrets:** `.env*` is git-ignored and has never been committed. Only `.env.example` is tracked.
- **Analytics:** GA4 is consent-gated (`docs/analytics.md`).
- **Dependencies:** `npm audit --omit=dev` reports 0 vulnerabilities (the 2 remaining moderates are dev-only tooling: nodemon → minimatch).
- **Vulnerability reports:** `/.well-known/security.txt` (update the `Expires` date yearly).

## Known limits / to do
- **Rate limit store is in memory.** On Vercel each serverless instance has its own counter, so the 5/hour limit is best-effort. reCAPTCHA + the honeypot are the main defences. For a hard limit, back `express-rate-limit` with a shared store (e.g. Upstash Redis).
- **CSP still allows `'unsafe-inline'` scripts** (pages are static HTML with inline scripts). Moving to nonces/hashes would remove this.
- **Outside the code:** set SPF, DKIM and DMARC for the sending domain; use an app password for the mailbox; restrict who can open the enquiries Google Sheet and decide how long rows are kept (personal data); keep `NODE_ENV=production` on Vercel.
- Re-run `npm audit` after every dependency change, and rotate any secret that was ever pasted into chat, email or a screenshot.
