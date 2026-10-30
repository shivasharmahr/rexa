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
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
