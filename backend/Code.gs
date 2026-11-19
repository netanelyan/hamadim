/**
 * @OnlyCurrentDoc
 *
 * המדים: orders sheet (Google Apps Script, bound to one Google Sheet).
 *
 * The quote builder on index.html posts every request here, and each one becomes a row
 * in the "הזמנות" tab. The columns after "סה״כ יחידות" are yours to fill in as the
 * order moves along. Rows are never deleted automatically: the privacy page promises
 * to keep order details for at least 6 months.
 *
 * Setup steps are in README.md next to this file.
 */

var SHEET_NAME = 'הזמנות';

// Keys match data-key on the quote builder inputs in index.html.
var ITEMS = ['set', 'shirts', 'shorts', 'gloves'];

var HEADERS = [
  'מספר בקשה', 'תאריך', 'מועדון',
  'סטים', 'חולצות', 'שורטים', 'כפפות (זוגות)', 'סה״כ יחידות',
  'סטטוס', 'איש קשר', 'טלפון', 'סכום (₪)', 'חשבונית Morning', 'הערות'
];
var STATUS_COL = HEADERS.indexOf('סטטוס') + 1;
var STATUSES = [
  'בקשה חדשה', 'נשלחה הצעה', 'העיצוב אושר', 'שולם',
  'בייצור', 'בנקודת האיסוף', 'נאסף', 'בוטל'
];

// The web app URL is public (it sits in the page source), so cap how fast rows can be added.
var MAX_REQUESTS = 30;
var WINDOW_SECONDS = 600;
var MAX_CLUB_LENGTH = 80;
var MAX_UNITS = 999;

/** Run once from the Apps Script editor. Safe to run again. */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone('Asia/Jerusalem');
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME, 0);
  sheet.setRightToLeft(true);
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  var rows = sheet.getMaxRows() - 1;
  sheet.getRange(2, STATUS_COL, rows, 1).setDataValidation(statusRule());
  sheet.getRange(2, 2, rows, 1).setNumberFormat('dd/MM/yyyy HH:mm');
}

/** Lets you open the web app URL in a browser to check that it's deployed. */
function doGet() {
  return ContentService.createTextOutput('OK');
}

/** Receives one quote request from the site. */
function doPost(e) {
  var request = parseRequest(e);
  if (!request) return reply(false, 'invalid request');

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return reply(false, 'busy');
  try {
    if (overLimit()) return reply(false, 'too many requests');
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) return reply(false, 'run setup first');

    var counts = ITEMS.map(function (key) { return request.items[key]; });
    var total = counts.reduce(function (a, b) { return a + b; }, 0);
    sheet.appendRow([request.ref, new Date(), request.club].concat(counts, [total, STATUSES[0]]));
    var row = sheet.getLastRow();
    sheet.getRange(row, STATUS_COL).setDataValidation(statusRule());
    sheet.getRange(row, 2).setNumberFormat('dd/MM/yyyy HH:mm');
  } finally {
    lock.releaseLock();
  }
  return reply(true);
}

/** Returns a clean request, or null if anything in it is off. */
function parseRequest(e) {
  if (!e || !e.postData || !e.postData.contents) return null;
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return null;
  }
  if (!data || typeof data !== 'object') return null;

  // Made by the page, e.g. 261119-K7P. The same number is in the WhatsApp message.
  if (typeof data.ref !== 'string' || !/^\d{6}-[A-Z0-9]{3}$/.test(data.ref)) return null;

  var club = typeof data.club === 'string' ? data.club : '';
  club = club.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_CLUB_LENGTH);
  // A cell that starts with one of these would be read as a formula.
  if (/^[=+\-@]/.test(club)) club = "'" + club;

  if (!data.items || typeof data.items !== 'object') return null;
  var items = {}, total = 0;
  for (var i = 0; i < ITEMS.length; i++) {
    var n = data.items[ITEMS[i]];
    if (n === undefined) n = 0;
    if (typeof n !== 'number' || n % 1 !== 0 || n < 0 || n > MAX_UNITS) return null;
    items[ITEMS[i]] = n;
    total += n;
  }
  if (total === 0) return null;

  return { ref: data.ref, club: club, items: items };
}

function overLimit() {
  var cache = CacheService.getScriptCache();
  var count = Number(cache.get('requests') || 0);
  if (count >= MAX_REQUESTS) return true;
  cache.put('requests', String(count + 1), WINDOW_SECONDS);
  return false;
}

function statusRule() {
  return SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).build();
}

function reply(ok, error) {
  var body = ok ? { ok: true } : { ok: false, error: error };
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}
