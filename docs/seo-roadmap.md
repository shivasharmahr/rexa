# SEO roadmap: what the code can't fix

Source: SEOptimer audit of www.rexabroking.com, 22 Nov 2026 (overall B+; On-Page A, GEO A+, Performance A+, Usability C, Links F).
The items below need a DNS, Google or business account change, or a decision. The code-side fixes are already in the repo.

## 1. Email DNS: SPF and DMARC (audit: both missing)
Enquiry emails are sent through Gmail SMTP from `corporate.blr@rexabroking.com`. Without SPF/DKIM/DMARC they can land in spam.
Add at the DNS host for `rexabroking.com` (confirm the exact values against your mail provider first):
- **SPF** (TXT on `@`): `v=spf1 include:_spf.google.com ~all` (Google Workspace). Only one SPF record per domain.
- **DKIM**: generate the key in Google Admin (Apps > Gmail > Authenticate email) and publish the TXT it gives you.
- **DMARC** (TXT on `_dmarc`): start with `v=DMARC1; p=none; rua=mailto:<a mailbox you read>`, then move to `quarantine` after a few weeks of clean reports.

## 2. Spammy backlinks (audit: 380 backlinks, almost all junk)
About 374 of the links use the anchor "Professional rexabroking.com SEO Backlinks for Stronger Website Authority" from throwaway `.space/.shop/.online/.store` sites. Google usually ignores these, but they are worth disavowing.
Seen in the audit (add more from Google Search Console > Links as they appear):
```
domain:takes.sbs
domain:quero.party
domain:bye.fyi
domain:urls-shortener.eu
domain:drjack.world
domain:atomizelink.icu
domain:blogsphere.top
domain:metamagic.top
domain:byteshort.xyz
domain:anchorurl.cloud
```
Upload at https://search.google.com/search-console/disavow-links (needs a verified Search Console property). Don't pay for "link building" services: that is what created this list.
Real links to earn instead: the LinkedIn page (already linked), Google Business Profile, insurer and client case-study mentions, industry directories (IIB, IRDAI broker listings), local Chennai/Bengaluru business directories.

## 3. Redirect chain (audit: "avoid multiple page redirects", 0.2 to 0.6 s)
353 backlinks point to `https://rexabroking.com/` (apex). Make that a single hop to `https://www.rexabroking.com/`:
Vercel > Settings > Domains: keep `www.rexabroking.com` as primary and set `rexabroking.com` to redirect (308) to it directly. Avoid http > https > www double hops.

## 4. Analytics (audit: none detected)
GA4 is built and consent-gated but switched off until a Measurement ID (`G-XXXXXXXXXX`) is supplied. See `docs/analytics.md`.

## 5. Social profiles (audit: only LinkedIn linked)
Create, then link in the footer and in the Organization `sameAs` schema: Facebook page, X, Instagram, YouTube. Only worth doing if someone will post. A Facebook Pixel is only needed if you plan paid Facebook ads.

## 6. Local SEO
Claim and verify the Google Business Profile for Chennai (head office) and Bengaluru (branch); keep the name, address and phone identical to the website footer.

## 7. Items deliberately not changed
- **Plain-text email addresses:** public business emails are on purpose (contact, grievance, IRDA requirements). Hiding them would hurt users more than it protects.
- **Inline styles (about 20 to 30 per page):** low impact; removing them is a refactor with regression risk.
- **hreflang:** the site is English (en-IN) only, so none is needed.
- **Keyword consistency and thin content:** improved with a visible FAQ and answers on the homepage. More long-form content (a blog or guides on group health, claims and risk audits) is the real lever and is Phase 2 work.

## 8. Measure again
Re-run the audit and Google PageSpeed Insights (mobile) 2 to 3 weeks after deploying. Mobile LCP was 9.6 s in the 22 Nov run; deferring Font Awesome, Google Fonts and reCAPTCHA targets the render-blocking and unused-JavaScript warnings, but only a new run shows the actual change.
