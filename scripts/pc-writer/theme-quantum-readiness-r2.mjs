// Quantum ETF R2: bounded READ-ONLY inventory of already stored PC observations.
// No network, collection, scoring, source replacement, SQLite writes or publication.
// Writes a metadata-only JSON report BESIDE this script, never on the E: data drive.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const reportPath = path.join(here, 'QUANTUM_R2_READONLY_RESULT.json');
const sourceRoot = process.env.ZGMINI_QUANTUM_R2_TEST_ROOT || 'E:\\ZGmini\\data\\pc-writer';
const tickers = Object.freeze(['QTUM', 'WQTM', 'SPY']);
const minPriceSessions = 628; // 125 lookback + 251 ranking warmup + 252 chart points.
const maxFiles = 180;
const maxDepth = 2;
const maxJsonBytes = 24 * 1024 * 1024;
const maxJsonNodes = 80000;
const maxTables = 25;
const maxDbRowsPerTable = 5000;
const interesting = /theme|etf|market|price|history|hour|fund|asset|aum|qtum|wqtm|spy/i;
const subdir = /^(theme|etf|market|price|history|local|fund|asset|source|raw)/i;
const sensitive = /secret|password|token|credential|cookie|private|config|auth|access.?key/i;
const symField = /^(ticker|symbol|etf|asset_symbol|instrument_symbol|security_symbol)$/i;
const dateField = /^(date|day|trade_date|tradedate|trading_date|tradingdate|observation_date|asof|as_of|timestamp|time)$/i;
const priceField = /^(proxyclose|close|adjustedclose|adjclose|adj_close|marketclose|market_close)$/i;
const aumField = /^(netassetsusd|fundnetassetsusd|totalnetassetsusd|assetsundermanagementusd|aumusd|fundsizeusd)$/i;
const output = {
  version: 'QUANTUM_ETF_LOCAL_READINESS_R2', status: 'NOT_READY',
  checkedAt: new Date().toISOString(), sourceRoot,
  expectedTickers: tickers, minimumAlignedPriceSessions: minPriceSessions,
  reportOnly: true, providerCalls: 0, databaseWrites: 0, sourceDataWrites: 0,
  scoreComputed: false, published: false, publishedDataRightsVerified: false,
  scan: {jsonFilesChecked: 0, jsonFilesParsed: 0, sqliteTablesChecked: 0,
    sqliteRowsSampled: 0, largeFilesSkipped: 0, invalidFilesSkipped: 0,
    traversalCapped: false, sqliteReadAvailable: false},
  price: {}, netAssetsUSD: {}, alignedPriceSessions: null,
  candidateSources: [], blockers: [], notes: [
    'ETF fund net assets, not underlying portfolio-company capitalization, set proportional weights.',
    'Each historical date requires its own observed fund net assets. Today\'s AUM cannot backfill history.',
    'Bounded metadata sampling cannot prove absent data or independently licensed rights.',
    'Hourly bars may repeat trading dates. Only unique dates count; duplicates are not automatically errors.',
    'Do not publish a quantum score or replace the seven existing public theme formulas from this inventory.'
  ]
};
const found = Object.fromEntries(tickers.map(t => [t, {prices: new Set(), aum: new Set(), sources: new Set()}]));

function asDate(value) {
  if (typeof value === 'string') {
    const date = value.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) &&
      !Number.isNaN(Date.parse(date + 'T00:00:00Z')) &&
      new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) === date) return date;
  }
  if (typeof value === 'number' && Number.isFinite(value) && value > 1e9) {
    const timestamp = value > 1e12 ? value : value * 1000;
    try { return new Date(timestamp).toISOString().slice(0, 10); } catch { /* invalid */ }
  }
  return null;
}
const validAmount = v => typeof v === 'number' && Number.isFinite(v) && v > 0;
const tickerOf = value => tickers.includes(String(value ?? '').toUpperCase())
  ? String(value).toUpperCase() : null;
function tickerFromName(name) {
  const matches = tickers.filter(t => new RegExp('(^|[^A-Z0-9])' + t + '([^A-Z0-9]|$)', 'i').test(name));
  return matches.length === 1 ? matches[0] : null;
}
function findValue(row, pattern) {
  const key = Object.keys(row).find(k => pattern.test(k));
  return key ? row[key] : undefined;
}
function record(row, inheritedTicker, source) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return;
  const ticker = tickerOf(findValue(row, symField)) || inheritedTicker;
  if (!ticker) return;
  const date = asDate(findValue(row, dateField));
  if (!date) return;
  let matched = false;
  if (validAmount(findValue(row, priceField))) {
    found[ticker].prices.add(date);
    matched = true;
  }
  if (ticker !== 'SPY' && validAmount(findValue(row, aumField))) {
    found[ticker].aum.add(date);
    matched = true;
  }
  if (matched) found[ticker].sources.add(source);
}

function inspectJson(file) {
  const stat = fs.statSync(file);
  if (stat.size > maxJsonBytes) { output.scan.largeFilesSkipped++; return; }
  let data;
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { output.scan.invalidFilesSkipped++; return; }
  output.scan.jsonFilesParsed++;
  let visited = 0;
  const source = path.relative(sourceRoot, file);
  const fileTicker = tickerFromName(path.basename(file));
  function walk(value, context, depth = 0) {
    if (++visited > maxJsonNodes) { output.scan.traversalCapped = true; return; }
    if (depth > 7 || !value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      for (const item of value.slice(0, maxJsonNodes)) {
        if (visited > maxJsonNodes) break;
        walk(item, context, depth + 1);
      }
      return;
    }
    const explicit = tickerOf(findValue(value, symField)) || context;
    record(value, explicit, source);
    for (const [key, child] of Object.entries(value)) {
      if (visited > maxJsonNodes) break;
      if (!child || typeof child !== 'object' || sensitive.test(key)) continue;
      walk(child, tickerOf(key) || explicit, depth + 1);
    }
  }
  walk(data, fileTicker);
}

function walkFiles(dir, depth = 0) {
  let entries;
  try { entries = fs.readdirSync(dir, {withFileTypes: true}); } catch { return; }
  for (const entry of entries) {
    if (output.scan.jsonFilesChecked >= maxFiles) { output.scan.traversalCapped = true; break; }
    if (sensitive.test(entry.name) || entry.isSymbolicLink()) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && depth < maxDepth && subdir.test(entry.name))
      walkFiles(full, depth + 1);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json') && interesting.test(entry.name)) {
      output.scan.jsonFilesChecked++;
      try { inspectJson(full); } catch { output.scan.invalidFilesSkipped++; }
    }
  }
}

async function inspectSqlite() {
  let DatabaseSync;
  try { ({DatabaseSync} = await import('node:sqlite')); output.scan.sqliteReadAvailable = true; }
  catch { output.notes.push('node:sqlite unsupported: SQLite metadata scan skipped.'); return; }
  const quote = name => '"' + name.replaceAll('"', '""') + '"';
  for (const name of ['core.sqlite', 'history.sqlite']) {
    const filename = path.join(sourceRoot, 'storage', name);
    if (!fs.existsSync(filename)) continue;
    let db;
    try {
      db = new DatabaseSync(filename, {readOnly: true, timeout: 1000});
      db.exec('PRAGMA query_only=ON');
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name LIMIT 250")
        .all().map(row => row.name).filter(v => interesting.test(v) && !sensitive.test(v)).slice(0, maxTables);
      for (const table of tables) {
        const cols = db.prepare('PRAGMA table_info(' + quote(table) + ')').all().map(row => row.name);
        const sym = cols.find(c => symField.test(c));
        const date = cols.find(c => dateField.test(c));
        const price = cols.find(c => priceField.test(c));
        const aum = cols.find(c => aumField.test(c));
        if (!sym || !date || (!price && !aum)) continue;
        output.scan.sqliteTablesChecked++;
        const select = [quote(sym) + ' AS ticker', quote(date) + ' AS date'];
        if (price) select.push(quote(price) + ' AS close');
        if (aum) select.push(quote(aum) + ' AS netAssetsUSD');
        let rows;
        try {
          rows = db.prepare(`SELECT ${select.join(', ')} FROM ${quote(table)} ORDER BY rowid DESC LIMIT ${maxDbRowsPerTable}`).all();
        } catch {
          rows = db.prepare(`SELECT ${select.join(', ')} FROM ${quote(table)} LIMIT ${Math.min(1000, maxDbRowsPerTable)}`).all();
        }
        output.scan.sqliteRowsSampled += rows.length;
        for (const row of rows) record(row, null, name + ':' + table);
      }
    } catch (error) {
      output.notes.push('SQLite read-only scan skipped for ' + name + ': ' + (error.code || 'UNAVAILABLE'));
    } finally { try { db?.close(); } catch { /* no-op */ } }
  }
}

function summarize() {
  for (const t of tickers) {
    const p = [...found[t].prices].sort(), a = [...found[t].aum].sort();
    output.price[t] = {uniqueDates: p.length, firstDate: p[0] ?? null, lastDate: p.at(-1) ?? null};
    if (t !== 'SPY') output.netAssetsUSD[t] = {
      uniqueDatedObservations: a.length, firstDate: a[0] ?? null, lastDate: a.at(-1) ?? null,
      // This scanner does not verify AUM data provenance/rights or NAV * shares reconciliation.
      historicalSourceRightsVerified: false
    };
    output.candidateSources.push({ticker: t, sourceFilesOrTables: [...found[t].sources].slice(0, 12)});
    if (!p.length) output.blockers.push('PRICE_NOT_FOUND_IN_BOUNDED_SCAN_' + t);
    else if (p.length < minPriceSessions) output.blockers.push('PRICE_UNDER_628_IN_SCAN_' + t);
    if (t !== 'SPY' && !a.length) output.blockers.push('DAILY_HISTORICAL_AUM_NOT_FOUND_IN_BOUNDED_SCAN_' + t);
  }
  if (tickers.every(t => found[t].prices.size)) {
    const common = [...found.QTUM.prices].filter(d => found.WQTM.prices.has(d) && found.SPY.prices.has(d)).sort();
    output.alignedPriceSessions = {uniqueDates: common.length, firstDate: common[0] ?? null, lastDate: common.at(-1) ?? null};
    if (common.length < minPriceSessions) output.blockers.push('QTUM_WQTM_SPY_UNDER_628_ALIGNED_DATES');
    const chartDates = common.slice(-252);
    if (chartDates.length === 252) {
      for (const t of ['QTUM', 'WQTM']) {
        const count = chartDates.filter(d => found[t].aum.has(d)).length;
        output.netAssetsUSD[t].observationsCoveringLast252CommonSessions = count;
        if (count !== 252) output.blockers.push('AUM_MISSING_ON_CHART_DATES_' + t);
      }
    }
  }
  output.blockers.push('WQTM_ISSUER_INCEPTION_2025_10_09_INSUFFICIENT_FOR_628_PRICE_HISTORY');
  output.blockers.push('WISDOMTREE_DATA_LICENSE_OR_WRITTEN_PERMISSION_NOT_VERIFIED');
  output.blockers.push('SOURCE_RIGHTS_AND_PRICE_RECONCILIATION_NOT_VERIFIED');
  if (output.scan.traversalCapped) output.blockers.push('BOUNDED_SCAN_INCOMPLETE');
}

try {
  if (!fs.existsSync(sourceRoot) || !fs.statSync(sourceRoot).isDirectory())
    output.blockers.push('SOURCE_ROOT_MISSING');
  else {
    walkFiles(sourceRoot);
    await inspectSqlite();
  }
  summarize();
  fs.writeFileSync(reportPath, JSON.stringify(output, null, 2) + '\r\n', 'utf8');
  console.log('QUANTUM_R2=' + output.status + ' REPORT=' + reportPath);
} catch (error) {
  console.error('QUANTUM_R2_DIAGNOSTIC_FAILED=' + (error.code || 'UNKNOWN'));
  process.exitCode = 1;
}
