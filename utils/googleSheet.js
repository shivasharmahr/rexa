const axios = require('axios');

// Spreadsheet apps treat cells starting with = + - @ as formulas; prefix them
// so a malicious submission can't run one when the sheet is opened.
const safeCell = (v) => {
  const s = v == null ? '' : String(v);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
};

// Appends one enquiry as a row in the Google Sheet via the Apps Script web
// app (see docs/google-sheets-setup.md). Resolves true/false and never
// throws, so a Google outage can't lose the enquiry or block the emails.
const appendToSheet = async (lead) => {
  const url = process.env.GOOGLE_SHEET_WEBHOOK_URL;
  if (!url) {
    console.warn('Google Sheet not configured (GOOGLE_SHEET_WEBHOOK_URL missing); skipping');
    return false;
  }

  const row = {};
  Object.keys(lead).forEach((k) => { row[k] = safeCell(lead[k]); });

  try {
    const res = await axios.post(
      url,
      { secret: process.env.GOOGLE_SHEET_SECRET, ...row },
      { timeout: 8000, headers: { 'Content-Type': 'application/json' } }
    );
    if (res.data && res.data.ok === true) return true;
    console.error('Google Sheet rejected the row:', JSON.stringify(res.data).slice(0, 200));
    return false;
  } catch (error) {
    console.error('Google Sheet append failed:', error.message);
    return false;
  }
};

module.exports = { appendToSheet };
