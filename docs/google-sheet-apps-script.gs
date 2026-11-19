// Paste this into the Apps Script editor of the Google Sheet that should
// receive enquiries (Extensions > Apps Script). See google-sheets-setup.md.

var HEADERS = ['Timestamp', 'Source', 'Name', 'Email', 'Phone', 'Company', 'Interest', 'Message'];

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var secret = PropertiesService.getScriptProperties().getProperty('SHEET_SECRET');
    if (!secret || data.secret !== secret) {
      return json_({ ok: false, error: 'unauthorized' });
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.source || '',
      data.name || '',
      data.email || '',
      data.phone || '',
      data.company || '',
      data.interest || '',
      data.message || ''
    ]);

    // Optional email (only if NOTIFY_EMAIL is set). A mail failure must not lose the row.
    try { notify_(data); } catch (mailErr) { console.error('Mail failed: ' + mailErr); }

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Optional plain notification. The website already sends a branded email to
// the team (utils/emailService.js), so this only runs when you set the
// NOTIFY_EMAIL script property. Leave it unset to avoid duplicate emails.
function notify_(d) {
  var to = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL');
  if (!to) return;
  var rows = [['Source', d.source], ['Name', d.name], ['Email', d.email],
    ['Phone', d.phone], ['Company', d.company], ['Interest', d.interest],
    ['Message', d.message]];
  var html = '<h3>New Rexa enquiry</h3><table cellpadding="6">' + rows.map(function (r) {
    return '<tr><td><b>' + r[0] + '</b></td><td>' + esc_(r[1] || '-').replace(/\n/g, '<br>') + '</td></tr>';
  }).join('') + '</table>';
  var opts = { htmlBody: html, name: 'Rexa Website' };
  if (d.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) opts.replyTo = d.email;
  MailApp.sendEmail(to, 'New Rexa enquiry: ' + (d.interest || 'General') + ' - ' + (d.name || ''),
    'New enquiry from ' + (d.name || '') + ' (' + (d.email || '') + '). Open this email in HTML view.', opts);
}

function esc_(v) {
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
