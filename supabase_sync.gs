/**
 * Google Sheets → Supabase Sync (Daily Upsert)
 * ------------------------------------------------
 * Copy-paste this file into your Google Sheets Apps Script
 * project (Extensions → Apps Script), then follow the
 * README.md for step-by-step setup.
 *
 * It reads the tabs you configure below (e.g. Accounts,
 * Transactions), converts the header row to snake_case so
 * it matches your database column names, and bulk-upserts
 * every non-blank row to the matching table in Supabase.
 *
 * The script is designed to be run by a daily time-driven
 * trigger but you can also execute `syncAllFintableData()`
 * manually from the Run menu.
 */

// 1.  Your Supabase project details — replace the placeholder
//     sub-domain with your own (e.g. "abcd1234").
//     Keep the URL format exactly as shown.
const SUPABASE_URL = 'https://<YOUR_PROJECT_ID>.supabase.co';

// 2.  Store your *Service Role* key securely in the project
//     properties, then read it at runtime. NEVER hard-code
//     the key directly in your source.
const SUPABASE_KEY = PropertiesService
  .getScriptProperties()
  .getProperty('SUPABASE_SERVICE_ROLE_KEY');

// 3.  Map each Sheet tab to its Supabase table & primary key.
//     Feel free to change names or add more configs.
const SHEET_CONFIGS = [
  {
    sheetName: 'Accounts',      // Tab name in Google Sheets
    tableName: 'accounts',      // Table name in Supabase
    primaryKey: 'account_id'    // Column that defines uniqueness
  },
  {
    sheetName: 'Transactions',
    tableName: 'transactions',
    primaryKey: 'transaction_id'
  }
];

/**
 * Main entry point — iterates over each configured sheet.
 * Attach a daily time-driven trigger to this function.
 */
function syncAllFintableData() {
  SHEET_CONFIGS.forEach(cfg => {
    try {
      upsertSheet(cfg);
    } catch (e) {
      console.error(`Error syncing ${cfg.sheetName}: ${e}`);
    }
  });
}

/**
 * Reads data from a single sheet and upserts it via Supabase
 * REST API using the `on_conflict` parameter.
 */
function upsertSheet({ sheetName, tableName, primaryKey }) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);

  // 1) Fetch *all* values (including header row)
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return; // Only header present → nothing to sync

  // Separate headers from data rows
  const rawHeaders = data.shift().map(String);

  // 2) Normalize headers to snake_case so "Account ID" → "account_id"
  const headers = rawHeaders.map(h =>
    h
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_') // Any non-alphanum → underscore
      .replace(/^_+|_+$/g, '')     // Trim leading/trailing underscores
  );

  // 3) Build an array of objects {colName: value}
  const rows = data
    .filter(r => r.some(c => String(c).trim() !== '')) // Skip fully-blank rows
    .map(r => {
      const obj = {};
      headers.forEach((col, i) => {
        obj[col] = r[i];
      });
      return obj;
    });

  if (!rows.length) return; // No meaningful rows → skip API call

  // 4) POST to Supabase with on_conflict to merge duplicates
  const url = `${SUPABASE_URL}/rest/v1/${tableName}?on_conflict=${primaryKey}`;
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(rows),
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    muteHttpExceptions: false
  };

  const resp = UrlFetchApp.fetch(url, options);
  if (resp.getResponseCode() < 200 || resp.getResponseCode() >= 300) {
    throw new Error(`Supabase error ${resp.getResponseCode()}: ${resp.getContentText()}`);
  }
  console.log(`Synced ${rows.length} rows → ${tableName}`);
} 