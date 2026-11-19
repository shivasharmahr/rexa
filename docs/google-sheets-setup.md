# Saving enquiries to Google Sheets

Every form on the site (contact page, homepage pop-up, and the four product-page
forms) posts to the backend, which now also appends a row to a Google Sheet.
Email to `ADMIN_EMAIL` keeps working; an enquiry is only reported as failed if
both the Sheet and the email fail.

## One-time setup (about 5 minutes)

1. Create a Google Sheet (e.g. "Rexa Enquiries") in the Google account that
   should own the data.
2. **Extensions > Apps Script**. Delete the sample code and paste the contents of
   `docs/google-sheet-apps-script.gs`. Save.
3. **Project Settings (gear) > Script properties > Add script property**:
   name `SHEET_SECRET`, value a long random string (e.g. `openssl rand -hex 24`).
4. **Deploy > New deployment > type: Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
   Authorise when asked (it will ask for permission to send email as you), then copy the **Web app URL** (ends in `/exec`).
5. In Vercel (Project > Settings > Environment Variables, Production) add:
   - `GOOGLE_SHEET_WEBHOOK_URL` = the Web app URL
   - `GOOGLE_SHEET_SECRET` = the same string as `SHEET_SECRET`
6. Redeploy (`npx vercel --prod`).

The same two variables can go in your local `.env` to test locally.

## Gmail notification (optional)

The website already emails the team a branded notification and sends the visitor
an acknowledgement (see `utils/emailService.js`), so the script does **not** email
by default. To also get a plain copy from the script, add a script property
`NOTIFY_EMAIL` with the address. A mail failure never stops the row being saved.

## Columns

Timestamp, Source, Name, Email, Phone, Company, Interest, Message.
`Source` says which form it came from.

## Notes

- The URL is only a write endpoint protected by the secret; keep both private.
- After editing the Apps Script you must create a **new deployment version**
  (Deploy > Manage deployments > Edit > New version) for changes to go live.
- Values starting with `= + - @` are prefixed with `'` so they can't run as
  spreadsheet formulas.
