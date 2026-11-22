# Google Analytics 4

Consent-gated GA4. Everything lives in `assets/analytics.js` (loaded at the end of `<body>` on every page by `scripts/build-pages.js`).

## Turn it on
1. In GA4 → Admin → Data streams → your web stream, copy the **Measurement ID** (`G-XXXXXXXXXX`).
2. Paste it into the single config line at the top of `assets/analytics.js`:
   ```js
   var GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';
   ```
3. Deploy. Nothing else to change. While the ID is empty the script is inert: no network requests, no banner, no cookies, the footer "Cookie & analytics settings" link stays hidden, and `rexaTrack()` is a no-op.

> The privacy policy (section 5) already describes GA4. Publish the ID and the policy together.

## How consent works (India / DPDP-friendly)
- Google Consent Mode v2: `analytics_storage`, `ad_storage`, `ad_user_data`, `ad_personalization` all start **denied** (pushed to `dataLayer` before `gtag.js` is requested). Nothing is stored until the visitor clicks **Accept analytics** (`analytics_storage` → `granted`).
- Choice is remembered in `localStorage` key `rexa_consent_v1` (`granted` / `denied`). The banner shows on the first visit only, and appears once the visitor has scrolled about a third of a screen or been on the page for 10 s (whichever is first), so the first view stays clean.
- Footer link **Cookie & analytics settings** (any element with `[data-consent-settings]`, or `rexaOpenConsent()`) re-opens the banner to change/withdraw.
- Browser Do Not Track or Global Privacy Control = decline: analytics stays off and the banner shows only an informational "OK".
- If `localStorage` is blocked we can't remember a choice, so we treat it as declined and don't show the banner on every page.
- GA config: `anonymize_ip`, `allow_google_signals: false`, `allow_ad_personalization_signals: false`.
- On phones the banner is a bottom sheet; it adds `html.consent-open` and `--consent-h` so the Raksha launcher (`#rohiniWidget`) moves above it.

## Events
Sent through `rexaTrack(name, params)`; params that look like an email or phone number are dropped. Never pass what a visitor typed.

| Event | When | Params |
|---|---|---|
| `page_view` | automatic | `page_type` (home / product / about / contact / legal / other) |
| `click_to_call` | `tel:` link | `contact_point` (the company number), `location` (path) |
| `click_email` | `mailto:` link | `contact_point` (the company address), `location` |
| `cta_click` | link to `/contact`, `.open-lead-modal`, `[data-cta]`; header "Talk to an Advisor" | `label` (≤60 chars), `location` (path, or `header`) |
| `nav_click` | other links in the header | `label`, `destination` |
| `outbound_click` | link to another domain | `link_domain`, `link_url` (no query string) |
| `scroll_depth` | 25 / 50 / 75 / 90 % once per page (pages that fit one screen are skipped) | `percent`, `location` |
| `generate_lead` | enquiry/lead form success (`lead-form.js`, `contact.html`) | `source` (e.g. `contact`, `corporate-risk-audit`) |
| `raksha_open`, `raksha_option`, `raksha_link_click`, `raksha_search` | Raksha assistant | topic ids / link targets only; search sends the matched topic id or `no_match`, never the typed text |
| `raksha_persona` | visitor picks who they are in Raksha | `persona` (`business`, `hr`, `individual`, `customer`), `source` (`picker` or `remembered`) |
| `raksha_intent` | visitor picks what they need after choosing a persona | `persona`, `intent` (topic id) |
| `raksha_recommendation_click` | visitor clicks a recommended product/link | `persona`, `href` (internal path; `tel:`/`mailto:` targets are dropped by the PII filter, and are already covered by `click_to_call` / `click_email`) |

User property: `page_type`.

### Raksha → contact hand-off
Raksha links to the enquiry page as `/contact?interest=<key>&from=raksha`, where `<key>` is one of `corporate`, `benefits`, `wellness`, `retail`, `claims`, `policy-review`, `general` (anything else is ignored; `general` has no matching form option, so nothing is pre-selected). It only sets the form's default "Primary interest". GA4 may record the page URL including these parameters; they carry a product category only, never personal data. Don't add names, emails or phone numbers to such links.

Tip: GA4's built-in Enhanced Measurement also reports `scroll` (90 %) and outbound `click`. Ours use different names (`scroll_depth`, `outbound_click`) so nothing collides; switch the built-ins off in the stream settings if you don't want both.

## Verify
- GA4 → Admin → **DebugView**, or the **Tag Assistant** extension (tagassistant.google.com) pointed at the site. Accept the banner first; you should see `page_view` and, as you click, the events above.
- Browser console: `dataLayer` should start with `consent / default` (all denied) before any `config`.
- Realtime report shows traffic within a minute. Before consent only cookieless pings arrive (modelled, not user-level).

## Key event
GA4 → Admin → Events → find `generate_lead` (after it has fired once) → toggle **Mark as key event**.

## If a CSP is added later
Allow `script-src https://www.googletagmanager.com` and `connect-src https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com` (plus `img-src` the same hosts). The existing reCAPTCHA hosts stay as they are.
