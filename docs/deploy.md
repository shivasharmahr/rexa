# Deploying to Vercel (production)

The site is one Vercel project: static pages + `api/server.js` (Express) as the only serverless function.
`vercel.json` routes everything to it, except public static paths, which are served directly.

## Project settings (Vercel dashboard → Settings)
- **Framework preset:** Other. **Build Command:** leave empty / default (there is intentionally no `build` script in package.json).
  Committed assets (`assets/tailwind*.css`, pages) are the source of truth; rebuild CSS locally with `npm run build:css` and commit.
- **Output Directory:** leave empty. **Install Command:** default (`npm install`).
- **Node.js Version:** newest LTS Vercel offers (22.x).
- **Git → Production Branch:** the branch that should be live (currently `redesign-saas`). Other branches get Preview deployments.
- **Domains:** `www.rexabroking.com` (primary) and apex `rexabroking.com` redirecting to it.

## Environment variables (Settings → Environment Variables)
Set each for **Production**, and for **Preview** too if you want forms to work on preview URLs. Never commit values.

| Name | Purpose |
|---|---|
| `RECAPTCHA_SECRET_KEY` | reCAPTCHA v3 secret (server). The public site key lives in `lead-form.js` / `contact.html`. |
| `RECAPTCHA_SCORE_THRESHOLD` | e.g. `0.5` |
| `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_HOST`, `EMAIL_PORT` | SMTP login (use an app password) |
| `ADMIN_EMAIL` | where new enquiries are sent |
| `REPLY_TO_EMAIL` | optional reply-to for confirmations |
| `CORS_ORIGIN` | `https://www.rexabroking.com` |
| `GOOGLE_SHEET_WEBHOOK_URL`, `GOOGLE_SHEET_SECRET` | enquiries sheet (see `docs/google-sheets-setup.md`) |
| `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS` | optional, defaults 1 hour / 5 |

`NODE_ENV` is set by Vercel (production). Do not set it to `development`.

## Other places to configure
- **reCAPTCHA admin:** the key's allowed domains must include `rexabroking.com`, `www.rexabroking.com` (and the `*.vercel.app` preview host if you test forms there).
- **Google Analytics:** paste the Measurement ID into `assets/analytics.js`, commit, deploy (`docs/analytics.md`).
- **Email DNS:** SPF, DKIM and DMARC for the sending domain.
- **Search Console:** submit `https://www.rexabroking.com/sitemap.xml`; request indexing for `/`.
- **Google Business Profile:** claim/verify Chennai and Bengaluru.

## Smoke test after every deploy
1. `/`, `/about`, `/contact`, the four product pages and the legal pages load, styled, no console errors.
2. `/general` and `/life` return 301 to `/corporate-risk` and `/employee-benefits`; an unknown URL returns a real 404.
3. `/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/.well-known/security.txt` load.
4. Submit one real enquiry on `/contact` and one product-page form; confirm the email and the Sheet row arrive.
5. Response headers include a CSP and HSTS; mobile menu and Raksha work on a real phone.

## Rollback
Vercel → Deployments → previous good deployment → **Instant Rollback** (or `git revert` and push).

## Cache-busting
Shared assets are linked with `?v=YYYYMMDD…`. When you change `rhythm.css/js`, `raksha.css/js`, `motion.*`, `team.css` or `product-art.css`, bump the number on every page so browsers refetch.
