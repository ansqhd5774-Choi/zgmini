// Private R2 source discovery. Only reads bounded local JSON/SQLite price rows;
// outputs metadata counts beside this file. Never consumes a source for scoring.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Self-contained to run beside the CMD on Desktop without installing an entire
// repository. Tests compare these public pair labels to the R158 source of truth.
export const R2_EXISTING_PUBLIC_PAIRS = Object.freeze([
  ['로봇·자동화',['BOTZ','ROBO']], ['클라우드·SaaS',['SKYY','CLOU']],
  ['자율주행',['DRIV','BOTZ']], ['원전·SMR',['NLR','URA']],
  ['방산',['ITA','SHLD']], ['핀테크',['FINX','ARKF']], ['사이버보안',['CIBR','BUG']],
]);
const KNOWN_SYMBOLS=['SPY',...new Set(R2_EXISTING_PUBLIC_PAIRS.flatMap(x=>x[1]))];

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPORT = path.join(HERE, 'THEME_R2_PC_SOURCE_RESULT.json');
const DEFAULT_ROOT = 'E:\\ZGmini\\data\\pc-writer';
const MAX_FILES = 140;
const MAX_BYTES = 24 * 1024 * 1024;
const MAX_NODES = 75_000;
const MAX_DEPTH = 2;
const MAX_SQLITE_ROWS = 5_000;
const MAX_SQLITE_TABLES = 20;
const CANDIDATE = /etf|theme|price|histor|spy|market|sector|fund|asset|qtum|wqtm/i;
const CHILD_DIR = /etf|theme|price|histor|market|sector|fund|asset|raw|source/i;
const SENSITIVE = /secret|password|token|credential|cookie|private.?key|oauth|auth|\.env/i;
const DATE_KEY = /^(date|day|trade_date|tradedate|trading_date|tradingdate|observation_date)$/i;
const CLOSE_KEY = /^(proxyclose|close|adjustedclose|adjclose|adj_close|marketclose|market_close)$/i;
const SYMBOL_KEY = /^(symbol|ticker|etf|asset_symbol|instrument_symbol|security_symbol)$/i;
const ticker = v => typeof v === 'string' && /^[A-Z][A-Z0-9.]{0,11}$/.test(v) ? v : null;
const day = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)
  && !Number.isNaN(Date.parse(v.slice(0, 10) + 'T00:00:00Z'))
  && new Date(v.slice(0, 10) + 'T00:00:00Z').toISOString().slice(0, 10) === v.slice(0, 10)
  ? v.slice(0, 10) : null;
const pick = (obj, test) => {
  const key = Object.keys(obj).find(k => test.test(k));
  return key === undefined ? undefined : obj[key];
};
const validPrice = x => typeof x === 'number' && Number.isFinite(x) && x > 0;

function origin(rel) {
  if (/alpaca/i.test(rel)) return 'EXCLUDED_ALPACA';
  if (/marketparquet|market.parquet/i.test(rel)) return 'EXCLUDED_MARKETPARQUET';
  if (/iex/i.test(rel)) return 'EXCLUDED_IEX_HIST';
  if (/getmarkethistory/i.test(rel)) return 'HELD_GETMARKETHISTORY';
  return 'UNKNOWN_UNVERIFIED';
}

function analyzeShape(root) {
  const discovered = new Map();
  let scannedNodes = 0, capped = false;
  function walk(value, inherited, depth) {
    if (++scannedNodes > MAX_NODES) { capped = true; return; }
    if (depth > 9 || !value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (capped) break;
        walk(item, inherited, depth + 1);
      }
      return;
    }
    const explicit = ticker(String(pick(value, SYMBOL_KEY) ?? '').toUpperCase());
    const symbol = explicit || inherited;
    const date = day(pick(value, DATE_KEY));
    if (symbol && date && validPrice(pick(value, CLOSE_KEY))) {
      if (!discovered.has(symbol)) discovered.set(symbol, new Set());
      discovered.get(symbol).add(date);
    }
    for (const [key, child] of Object.entries(value)) {
      if (capped) break;
      if (SENSITIVE.test(key) || !child || typeof child !== 'object') continue;
      // Ticker-keyed series can be nested under `series`, `joined`, or root.
      const byKey = ticker(key) && (Array.isArray(child) || Array.isArray(child?.days)) ? key : null;
      walk(child, byKey || inherited, depth + 1);
    }
  }
  walk(root, null, 0);
  const symbols = Object.fromEntries([...discovered].sort(([a],[b])=>a.localeCompare(b)).map(([t, set]) => {
    const dates = [...set].sort();
    return [t, {sampledUniqueDates: dates.length, firstDate: dates[0], lastDate: dates.at(-1),
      countOnly188ThresholdMet: dates.length >= 188, countOnly377ThresholdMet: dates.length >= 377,
      countOnly628ThresholdMet: dates.length >= 628}];
  }));
  return {symbols, scannedNodes, capped};
}

function surveyJson(rootDir, rel, stats) {
  const filename = path.join(rootDir, rel);
  const entry = {source: rel.replaceAll('\\', '/'), sourceClass: origin(rel),
    sourceRightsVerified: false, dataSuitableForScoringVerified: false};
  try {
    const stat = fs.statSync(filename);
    if (stat.size > MAX_BYTES || stat.size <= 0) {
      stats.largeOrEmpty++; entry.scanStatus = 'SIZE_LIMIT'; return entry;
    }
    const parsed = JSON.parse(fs.readFileSync(filename, 'utf8'));
    const shape = analyzeShape(parsed);
    stats.jsonParsed++;
    if (shape.capped) stats.nodeCapped++;
    entry.scanStatus = shape.capped ? 'BOUNDED_PARTIAL' : 'BOUNDED_COMPLETE';
    entry.symbols = shape.symbols;
    return entry;
  } catch {
    stats.invalidOrUnreadable++; entry.scanStatus = 'UNREADABLE_OR_INVALID_JSON'; return entry;
  }
}

function inspectPaths(base, stats) {
  const files = [];
  function visit(dir, depth) {
    let list;
    try {list = fs.readdirSync(dir, {withFileTypes:true});}
    catch {stats.unreadableDirectories++; return;}
    // Known candidate filenames first; do not blindly walk the E: tree.
    list.sort((a,b)=>Number(CANDIDATE.test(b.name))-Number(CANDIDATE.test(a.name)) || a.name.localeCompare(b.name));
    for (const item of list) {
      if (stats.jsonInspected >= MAX_FILES) {stats.fileCapReached = true; return;}
      if (SENSITIVE.test(item.name) || item.isSymbolicLink()) continue;
      const full = path.join(dir,item.name);
      if (item.isDirectory() && depth < MAX_DEPTH && CHILD_DIR.test(item.name)) visit(full, depth+1);
      else if (item.isFile() && item.name.endsWith('.json') && CANDIDATE.test(item.name)) {
        stats.jsonInspected++;
        const result = surveyJson(base,path.relative(base,full),stats);
        if (Object.keys(result.symbols ?? {}).length) files.push(result);
      }
    }
  }
  visit(base,0);
  return files;
}

async function inspectSqlite(base,stats) {
  let DatabaseSync;
  try {({DatabaseSync} = await import('node:sqlite')); stats.sqliteReadAvailable = true;}
  catch {return [];}
  const out = [];
  const quote = value => '"' + value.replaceAll('"','""') + '"';
  for (const name of ['core.sqlite','history.sqlite']) {
    const full = path.join(base,'storage',name);
    if (!fs.existsSync(full)) continue;
    let db;
    try {
      db = new DatabaseSync(full,{readOnly:true,timeout:1000});
      db.exec('PRAGMA query_only=ON');
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name LIMIT 100").all()
        .map(r=>r.name).filter(x=>CANDIDATE.test(x) && !SENSITIVE.test(x)).slice(0,MAX_SQLITE_TABLES);
      for (const table of tables) {
        const columns = db.prepare('PRAGMA table_info('+quote(table)+')').all().map(x=>x.name);
        const sym = columns.find(x=>SYMBOL_KEY.test(x)), date = columns.find(x=>DATE_KEY.test(x));
        const close = columns.find(x=>CLOSE_KEY.test(x));
        if (!sym || !date || !close) continue;
        stats.sqliteTables++;
        let rows;
        try {rows=db.prepare(`SELECT ${quote(sym)} AS ticker, ${quote(date)} AS date, ${quote(close)} AS close FROM ${quote(table)} ORDER BY ${quote(date)} DESC LIMIT ${MAX_SQLITE_ROWS}`).all();}
        catch {stats.invalidOrUnreadable++; continue;}
        stats.sqliteRowsSampled+=rows.length;
        const shape=analyzeShape(rows);
        if (shape.capped) stats.nodeCapped++;
        if (Object.keys(shape.symbols).length) out.push({source:'storage/'+name+':'+table,
          sourceClass:'UNKNOWN_UNVERIFIED',sourceRightsVerified:false,
          dataSuitableForScoringVerified:false,scanStatus:'SQLITE_BOUNDED_SAMPLE',symbols:shape.symbols});
      }
    } catch {stats.invalidOrUnreadable++;}
    finally {try {db?.close();}catch {/* read-only close */}}
  }
  return out;
}

export async function auditThemeR2Sources(rootDir = DEFAULT_ROOT) {
  const stats={jsonInspected:0,jsonParsed:0,largeOrEmpty:0,nodeCapped:0,
    invalidOrUnreadable:0,unreadableDirectories:0,fileCapReached:false,
    sqliteReadAvailable:false,sqliteTables:0,sqliteRowsSampled:0};
  const exists=fs.existsSync(rootDir) && fs.statSync(rootDir).isDirectory();
  const files=exists ? inspectPaths(rootDir,stats) : [];
  if (exists) files.push(...await inspectSqlite(rootDir,stats));
  // This is file-local *inventory*, not joining across providers or point-in-time validation.
  const tickers=[...new Set([...KNOWN_SYMBOLS,'QTUM','WQTM',...files.flatMap(f=>Object.keys(f.symbols))])].sort();
  const byTicker=Object.fromEntries(tickers.map(t=>[t,{
    candidateSources:files.filter(f=>f.symbols[t]).map(f=>({source:f.source,sourceClass:f.sourceClass,
      sampledUniqueDates:f.symbols[t].sampledUniqueDates,firstDate:f.symbols[t].firstDate,lastDate:f.symbols[t].lastDate}))
      .sort((a,b)=>b.sampledUniqueDates-a.sampledUniqueDates).slice(0,8),
  }]));
  return {version:'THEME_R2_PC_SOURCE_INVENTORY_V1',status:exists?'BOUNDED_DISCOVERY_NOT_VALIDATED':'SOURCE_ROOT_MISSING',
    checkedAt:new Date().toISOString(),sourceRoot:rootDir,knownPublicPairs:R2_EXISTING_PUBLIC_PAIRS.map(([theme,etfs])=>({theme,etfs})),
    thresholds:{firstShortSamplePriceDays:188,firstMaturePointPriceDays:377,
      full252MatureChartPriceDays:628,absoluteEtfAdmissionRequirement:false},
    inventory:byTicker,files:files.map(({source,sourceClass,scanStatus,symbols})=>({source,sourceClass,
      scanStatus,symbols:Object.keys(symbols)})).slice(0,90),scan:stats,
    limits:'Bounded samples; date counts across separate files/providers are NOT combined or certified.',
    blockingReasons:[...(!exists?['SOURCE_ROOT_MISSING']:[]),'SOURCE_LICENSE_NOT_VERIFIED','PRICE_ADJUSTMENT_AND_LINEAGE_NOT_RECONCILED','HISTORICAL_DATED_ETF_AUM_NOT_VERIFIED'],
    priceScoresComputed:false,providerCalls:0,databaseWrites:0,sourceWrites:0,
    productionChanged:false,published:false,
    next:'Review candidate source and its permission/lineage. Only then authorize a selected-file offline 63/126/252 numerical test.'};
}

async function run() {
  if (process.argv.length !== 2 && (process.argv.length !== 4 || process.argv[2] !== '--root' || !path.isAbsolute(process.argv[3])))
    throw Error('THEME_R2_READONLY_ROOT_INVALID');
  const result=await auditThemeR2Sources(process.argv[3] || DEFAULT_ROOT);
  const stage=REPORT+'.'+process.pid+'.tmp';
  try {fs.writeFileSync(stage,JSON.stringify(result,null,2)+'\r\n',{flag:'wx'});fs.renameSync(stage,REPORT);}
  finally {if(fs.existsSync(stage))fs.unlinkSync(stage);}
  console.log('THEME_R2_SOURCE='+result.status);
  console.log('REPORT='+REPORT);
  console.log('MATCHED_FILES='+result.files.length);
  console.log('PUBLICATION=NO');
}

if (process.argv[1] && path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url))) {
  run().catch(e=>{console.error(/^THEME_R2_READONLY_[A-Z_]+$/.test(e?.message??'') ? e.message : 'THEME_R2_READONLY_FAILED');process.exitCode=1;});
}
