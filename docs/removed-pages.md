# Removed pages

Tracking record of pages retired from the site. Everything here is recoverable from git.

## 2026-11-11 — `general.html` and `life.html`

| Removed | Replaced by | Why |
|---|---|---|
| `general.html` (`/general`) | `corporate-risk.html` (`/corporate-risk`); motor/personal cover is on `retail-insurance.html` | Old text-only page on the previous design system. Not linked from the nav or footer; the footer already pointed at the newer product pages. |
| `life.html` (`/life`) | `employee-benefits.html` (`/employee-benefits`); wellness is on `wellness-and-value.html` | Same as above. |

### References that were still live, and what was done
- `app.js` — the Raksha chatbot linked to both pages. Repointed to `corporate-risk.html`, `retail-insurance.html`, `employee-benefits.html`, `wellness-and-value.html`.
- `api/server.js` — `/general`, `/life` (with or without slash, and `.html`) now `301` to `/corporate-risk` and `/employee-benefits`.
- `vercel.json` — same two `301` redirects, placed before the static `.html` route.
- `sitemap.xml` — removed both URLs. Also added the four product pages that were missing from it (`corporate-risk`, `employee-benefits`, `wellness-and-value`, `retail-insurance`).
- `scripts/build-pages.js` — removed both from the active-nav and styles.css page lists.

### Not removed (left on purpose)
- `styles.css` is still used by `grievance`, `privacy` and `terms`. Rules that only `general`/`life` used are now dead CSS but were not pruned (risk of breaking those pages without a visual diff).
- `assets/apple-touch-icon.png`, `assets/favicon.svg`, `assets/rexa-logo-white.png` are not referenced anywhere. Not deleted — they are tiny and may be wanted for icons/branding.

### Restore
```
git show f8957b9:general.html > general.html
git show f8957b9:life.html > life.html
```
(`f8957b9` is the last commit that contains them. They predate the shared header/footer, so re-run `npm run build:pages` after restoring and re-add them to `ACTIVE` / `STYLES_CSS_PAGES` in `scripts/build-pages.js`.)
