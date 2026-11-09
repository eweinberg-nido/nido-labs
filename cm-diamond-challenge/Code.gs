/**
 * Nido Diamond Challenge | Mentor Scheduler — Google Apps Script backend
 *
 * Paste this into Extensions > Apps Script on the Google Sheet that stores
 * mentor sign-ups, then deploy as a Web App (Execute as: Me / Who has access:
 * Anyone). See README.md for the full deployment walkthrough.
 *
 * Rows are written BY HEADER NAME, not by fixed column position. If the header
 * row is missing a column the script needs, it appends that heading rather than
 * shifting every later value one column to the left — which is what previously
 * filed Attendance values under "Mentor Name".
 */

var HEADERS = [
  "Booking ID", "Block ID", "Date", "Time", "Block", "Teacher", "Course",
  "Phase", "Topic", "Attendance", "Mentor Name", "Mentor Email",
  "Organization", "Notes", "Submitted At"
];

// Maps each sheet heading to the field the web app posts.
var FIELD_FOR_HEADER = {
  "Booking ID":   function (it) { return it.bookingId || ""; },
  "Block ID":     function (it) { return it.slotId || it.blockId || ""; },
  "Date":         function (it) { return it.date || ""; },
  "Time":         function (it) { return it.time || ""; },
  "Block":        function (it) { return it.block || ""; },
  "Teacher":      function (it) { return it.teacher || ""; },
  "Course":       function (it) { return it.course || ""; },
  "Phase":        function (it) { return it.phase || ""; },
  "Topic":        function (it) { return it.topic || ""; },
  "Attendance":   function (it) { return it.attendance || "In Person"; },
  "Mentor Name":  function (it) { return it.mentorName || ""; },
  "Mentor Email": function (it) { return it.mentorEmail || ""; },
  "Organization": function (it) { return it.mentorOrg || ""; },
  "Notes":        function (it) { return it.mentorNotes || ""; },
  "Submitted At": function (it) { return it.createdAt || new Date().toISOString(); }
};

function output(payload, callback) {
  var json = JSON.stringify(payload);
  if (callback) {
    return ContentService.createTextOutput(callback + "(" + json + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * True when every non-blank heading in `names` appears in HEADERS in the same
 * relative order, i.e. the sheet uses the canonical columns and is merely
 * missing or mislabeling one of them.
 */
function isCanonicalSubsequence(names) {
  var from = 0;
  for (var i = 0; i < names.length; i++) {
    if (names[i] === "") continue;
    var at = HEADERS.indexOf(names[i], from);
    if (at === -1) return false;
    from = at + 1;
  }
  return true;
}

/**
 * Returns the sheet's header row, repairing it when headings are missing.
 *
 * Rows have always been written in HEADERS order, so a sheet short a heading
 * has correct DATA under wrong LABELS. In that case the fix is to relabel row 1
 * in place — appending the heading at the far right instead would permanently
 * cement the one-column shift for every row already in the sheet.
 */
function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    return HEADERS.slice();
  }

  var width = Math.max(sheet.getLastColumn(), 1);
  var current = sheet.getRange(1, 1, 1, width).getValues()[0].map(function (h) {
    return String(h || "").trim();
  });

  // Drop trailing blanks so new headings append tightly.
  while (current.length && current[current.length - 1] === "") current.pop();

  var missing = HEADERS.filter(function (h) { return current.indexOf(h) === -1; });
  if (!missing.length) return current;

  // Canonical layout, just mislabeled: relabel row 1 so existing rows line up.
  if (width <= HEADERS.length && isCanonicalSubsequence(current)) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    return HEADERS.slice();
  }

  // The sheet has extra columns of its own: leave them, append what is missing.
  sheet.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
  return current.concat(missing);
}

function doGet(e) {
  var callback = (e && e.parameter) ? e.parameter.callback : null;
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = sheet.getDataRange().getValues();
    var rows = [];
    if (data.length > 1) {
      var headers = data[0];
      for (var i = 1; i < data.length; i++) {
        var row = {};
        var hasValue = false;
        for (var j = 0; j < headers.length; j++) {
          var key = String(headers[j] || "").trim();
          if (!key) continue; // skip unlabeled columns instead of emitting a "" key
          var cell = data[i][j];
          // Date cells serialize as ISO strings the front end can parse.
          row[key] = (cell instanceof Date) ? cell.toISOString() : cell;
          if (cell !== "" && cell !== null) hasValue = true;
        }
        if (hasValue) rows.push(row);
      }
    }
    return output(rows, callback);
  } catch (err) {
    return output({ error: err.toString() }, callback);
  } finally {
    lock.releaseLock();
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var headers = ensureHeaders(sheet);

    var body = (e && e.postData) ? e.postData.contents : "";
    var entries = JSON.parse(body);
    if (!Array.isArray(entries)) entries = [entries];

    var rows = entries.map(function (item) {
      return headers.map(function (header) {
        var getter = FIELD_FOR_HEADER[header];
        return getter ? getter(item) : ""; // leave unknown columns untouched
      });
    });

    if (rows.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length)
        .setValues(rows);
    }

    return output({ success: true, written: rows.length });
  } catch (err) {
    return output({ success: false, error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Run once from the Apps Script editor to repair a sheet whose header row is
 * missing columns. Safe to run repeatedly; it only adds absent headings.
 */
function repairHeaders() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  Logger.log(ensureHeaders(sheet).join(" | "));
}
