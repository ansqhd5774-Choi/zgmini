import {calculateBreadth, validMarketDate} from './korea-market-v2.mjs';
import {PHASE3_POLICY} from './phase3-korea-stock-price.mjs';
import {calculateResearchFactors, researchHistoriesFromPublicIndicators} from './korea-research-v2.mjs';

export const RESEARCH_METHODOLOGY = 'KFG_RESEARCH_V2';
export const D1_PARAMETER_LIMIT = 100;
const ROW_COLUMNS = ['date','security_id','short_code','market','close','return_pct','trading_value','market_cap'];
export const ROWS_PER_INSERT = Math.floor(D1_PARAMETER_LIMIT / ROW_COLUMNS.length);
const ROW_KEYS = ['date','securityId','shortCode','market','close','returnPct','tradingValue','marketCap'];
const STATUSES = ['IDLE','RUNNING','PAUSED','COMPLETE','ERROR'];
const fail = code => { throw Error(code); };
const integer = n => Number.isSafeInteger(n) && n >= 0;
const factorOf = s => ({factor:'Breadth', advanceRatio:s.breadth.advanceRatio,
  advanceValueShare:s.breadth.advanceValueShare, score:s.breadth.score, status:s.breadth.status,
  coverage:{return:s.returnCoverage,tradingValue:s.tradingValueCoverage,marketCap:s.marketCapCoverage}});

/** Internal usage only. Missing metadata is unknown, never a fabricated zero. */
export function sumRowsWritten(results) {
  return Array.isArray(results) && results.length && results.every(r => integer(r?.meta?.rows_written))
    ? results.reduce((sum,r) => sum + r.meta.rows_written, 0) : null;
}

function validateSnapshot(s) {
  if (!s || !validMarketDate(s.requestedDate) || s.requestedDate > '20260910' || !s.complete ||
      !Array.isArray(s.rows) || !integer(s.totalCount) || s.rowsReceived !== s.totalCount ||
      !['SUCCESS','NO_TRADING_OBSERVATION'].includes(s.status)) fail('INVALID_SNAPSHOT');
  const seen = new Set();
  for (const row of s.rows) {
    if (row.date !== s.requestedDate || typeof row.securityId !== 'string' || !row.securityId ||
        typeof row.shortCode !== 'string' || !row.shortCode || !['KOSPI','KOSDAQ'].includes(row.market) ||
        seen.has(row.securityId)) fail('INVALID_ROW');
    seen.add(row.securityId);
    for (const key of ROW_KEYS.slice(4)) {
      const n = row[key];
      if (n !== null && (typeof n !== 'number' || !Number.isFinite(n) ||
          (Number.isInteger(n) && !Number.isSafeInteger(n)) || (key !== 'returnPct' && n < 0))) fail('INVALID_NUMERIC');
    }
  }
  const n = s.rows.length;
  for (const key of ['universeCount','kospiCount','kosdaqCount','validReturnCount','validTradingValueCount',
    'validMarketCapCount','konexExcluded','duplicateCount']) if (!integer(s[key])) fail('INVALID_QUALITY');
  if (s.universeCount !== n || s.kospiCount !== s.rows.filter(r=>r.market==='KOSPI').length ||
      s.kosdaqCount !== n-s.kospiCount || s.rowsReceived !== n+s.konexExcluded+s.duplicateCount) fail('INVALID_QUALITY');
  for (const [field,count,coverage] of [['returnPct','validReturnCount','returnCoverage'],
    ['tradingValue','validTradingValueCount','tradingValueCoverage'],['marketCap','validMarketCapCount','marketCapCoverage']]) {
    const expected = s.rows.filter(r=>Number.isFinite(r[field])).length;
    if (s[count] !== expected || s[coverage] !== (n ? expected/n : null)) fail('INVALID_QUALITY');
  }
  const breadth = calculateBreadth(s.rows);
  for (const k of ['score','status','advanceRatio','advanceValueShare']) if (s.breadth?.[k] !== breadth[k]) fail('INVALID_BREADTH');
  if (s.status === 'SUCCESS' ? (!n || breadth.status !== 'VALID' || s.latestObservationDate !== s.requestedDate)
    : (s.rowsReceived !== 0 || n !== 0 || s.latestObservationDate !== null)) fail('INVALID_SNAPSHOT');
  if (!integer(s.requestCount ?? 0) || (s.fetchedAt != null &&
      (typeof s.fetchedAt !== 'string' || !Number.isFinite(Date.parse(s.fetchedAt))))) fail('INVALID_METADATA');
}

/** Inject env.DB explicitly. No binding import, route, implicit fetch or migration execution.
 * Seven existing store methods keep their signatures. saveMarketDate commits all four groups;
 * atomicMarketDateSave tells the runner not to repeat the memory-store write sequence.
 */
export class D1KoreaMarketHistoryStore {
  atomicMarketDateSave = true;
  #db; #now; #runId = null; #leaseMs; #usage = [];
  constructor(db, {now=Date.now, leaseMs=120000}={}) {
    if (!db?.prepare || !db?.batch || !integer(leaseMs) || leaseMs < 1) fail('INVALID_D1_CONFIGURATION');
    this.#db = db.withSession ? db.withSession('first-primary') : db;
    this.#now = now; this.#leaseMs = leaseMs;
  }
  #statement(sql, values=[]) {
    if (values.length > D1_PARAMETER_LIMIT || new TextEncoder().encode(sql).length > 100000) fail('SQL_LIMIT');
    return this.#db.prepare(sql).bind(...values);
  }
  #observe(results) { this.#usage.push(sumRowsWritten(results)); }
  getWriteUsage() { return {rowsWritten:this.#usage.length && this.#usage.every(integer)
    ? this.#usage.reduce((a,b)=>a+b,0) : null, operations:this.#usage.length}; }
  #guard() {
    if (!this.#runId) fail('LEASE_REQUIRED');
    // NULL violates the NOT NULL key if a writer expired or was superseded. In a batch this
    // aborts ALL writes, unlike an UPDATE that silently affects zero rows.
    return this.#statement(`INSERT INTO kfg_v2_backfill_progress(methodology_version)
      VALUES(CASE WHEN EXISTS(SELECT 1 FROM kfg_v2_backfill_progress
        WHERE methodology_version=? AND active_run_id=? AND lease_until>?) THEN ? ELSE NULL END)
      ON CONFLICT(methodology_version) DO NOTHING`, [RESEARCH_METHODOLOGY,this.#runId,this.#now(),RESEARCH_METHODOLOGY]);
  }
  async acquireLease(runId=crypto.randomUUID()) {
    if (this.#runId || typeof runId !== 'string' || !runId || runId.length > 128) fail('INVALID_RUN_ID');
    const now=this.#now();
    const result=await this.#statement(`INSERT INTO kfg_v2_backfill_progress(methodology_version,active_run_id,lease_until)
      VALUES(?,?,?) ON CONFLICT(methodology_version) DO UPDATE SET
      active_run_id=excluded.active_run_id, lease_until=excluded.lease_until
      WHERE active_run_id IS NULL OR lease_until IS NULL OR lease_until<=?`,
    [RESEARCH_METHODOLOGY,runId,now+this.#leaseMs,now]).run();
    this.#observe([result]);
    if (result.meta?.changes !== 1) return false;
    this.#runId=runId; return true;
  }
  async renewLease() {
    if (!this.#runId) fail('LEASE_REQUIRED');
    const now=this.#now();
    const r=await this.#statement(`UPDATE kfg_v2_backfill_progress SET lease_until=?
      WHERE methodology_version=? AND active_run_id=? AND lease_until>?`,
    [now+this.#leaseMs,RESEARCH_METHODOLOGY,this.#runId,now]).run();
    this.#observe([r]); if (r.meta?.changes !== 1) fail('LEASE_LOST');
  }
  async releaseLease() {
    if (!this.#runId) return false;
    const r=await this.#statement(`UPDATE kfg_v2_backfill_progress SET active_run_id=NULL,lease_until=NULL
      WHERE methodology_version=? AND active_run_id=?`,[RESEARCH_METHODOLOGY,this.#runId]).run();
    this.#observe([r]); this.#runId=null; return r.meta?.changes === 1;
  }
  async saveMarketDate(snapshot) {
    validateSnapshot(snapshot);
    const s=structuredClone(snapshot), date=s.requestedDate, statements=[this.#guard()];
    // Strict INSERT and date PK also fence duplicates/races in the transaction itself.
    if (await this.#statement('SELECT date FROM kfg_v2_market_dates WHERE date=?',[date]).first()) fail('DATE_ALREADY_STORED');
    for (let i=0;i<s.rows.length;i+=ROWS_PER_INSERT) {
      const rows=s.rows.slice(i,i+ROWS_PER_INSERT);
      statements.push(this.#statement(`INSERT INTO kfg_v2_market_rows(${ROW_COLUMNS.join(',')}) VALUES ${rows.map(()=>`(${ROW_COLUMNS.map(()=>'?').join(',')})`).join(',')}`,
        rows.flatMap(r=>ROW_KEYS.map(k=>r[k]))));
    }
    statements.push(this.#statement(`INSERT INTO kfg_v2_market_dates
      (date,status,universe_count,kospi_count,kosdaq_count,valid_return_count,valid_trading_value_count,
       valid_market_cap_count,return_coverage,trading_value_coverage,market_cap_coverage,rows_stored,
       provider,methodology_version,rows_received,total_count,konex_excluded,duplicate_count,fetched_at,request_count)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [date,s.status==='SUCCESS'?'COMPLETE':'NO_TRADING_OBSERVATION',s.universeCount,s.kospiCount,s.kosdaqCount,
      s.validReturnCount,s.validTradingValueCount,s.validMarketCapCount,s.returnCoverage,s.tradingValueCoverage,
      s.marketCapCoverage,s.rows.length,PHASE3_POLICY.service,RESEARCH_METHODOLOGY,s.rowsReceived,s.totalCount,
      s.konexExcluded,s.duplicateCount,s.fetchedAt??null,s.requestCount??0]));
    if (s.status==='SUCCESS') statements.push(this.#statement(`INSERT INTO kfg_v2_factor_snapshots
      (factor,date,score,status,advance_ratio,advance_value_share) VALUES ('Breadth',?,?,?,?,?)`,
    [date,s.breadth.score,s.breadth.status,s.breadth.advanceRatio,s.breadth.advanceValueShare]));
    statements.push(this.#statement(`UPDATE kfg_v2_backfill_progress SET
      latest_processed_date=(SELECT MAX(date) FROM kfg_v2_market_dates),
      oldest_processed_date=(SELECT MIN(date) FROM kfg_v2_market_dates),
      successful_trading_date_count=(SELECT COUNT(*) FROM kfg_v2_market_dates WHERE status='COMPLETE'),
      rows_processed=(SELECT COALESCE(SUM(rows_stored),0) FROM kfg_v2_market_dates),
      request_count=request_count+?,status='RUNNING',last_attempted_date=?,
      last_successful_date=CASE WHEN ?='SUCCESS' THEN ? ELSE last_successful_date END,last_failure_code=NULL
      WHERE methodology_version=?`,[s.requestCount??0,date,s.status,date,RESEARCH_METHODOLOGY]));
    this.#observe(await this.#db.batch(statements));
  }
  async getMarketDate(date) {
    if (!validMarketDate(date)) fail('INVALID_DATE');
    const m=await this.#statement('SELECT * FROM kfg_v2_market_dates WHERE date=?',[date]).first();
    if (!m) return null;
    const {results}=await this.#statement(`SELECT date,security_id AS securityId,short_code AS shortCode,market,
      close,return_pct AS returnPct,trading_value AS tradingValue,market_cap AS marketCap
      FROM kfg_v2_market_rows WHERE date=? ORDER BY security_id`,[date]).all();
    return {researchOnly:true,productionEligible:false,requestedDate:date,latestObservationDate:results.length?date:null,
      fetchedAt:m.fetched_at,rowsReceived:m.rows_received,totalCount:m.total_count,complete:true,rows:results,
      universeCount:m.universe_count,kospiCount:m.kospi_count,kosdaqCount:m.kosdaq_count,
      konexExcluded:m.konex_excluded,duplicateCount:m.duplicate_count,validReturnCount:m.valid_return_count,
      validTradingValueCount:m.valid_trading_value_count,validMarketCapCount:m.valid_market_cap_count,
      returnCoverage:m.return_coverage,tradingValueCoverage:m.trading_value_coverage,marketCapCoverage:m.market_cap_coverage,
      breadth:calculateBreadth(results),status:m.status==='COMPLETE'?'SUCCESS':'NO_TRADING_OBSERVATION',
      safeErrorCode:null,requestCount:m.request_count};
  }
  async getSecurityHistory(securityId) {
    return (await this.#statement(`SELECT date,security_id AS securityId,short_code AS shortCode,market,
      close,return_pct AS returnPct,trading_value AS tradingValue,market_cap AS marketCap
      FROM kfg_v2_market_rows WHERE security_id=? ORDER BY date ASC`,[securityId]).all()).results;
  }
  async getAllMarketRows() {
    return (await this.#statement(`SELECT date,security_id AS securityId,short_code AS shortCode,market,
      close,return_pct AS returnPct,trading_value AS tradingValue,market_cap AS marketCap
      FROM kfg_v2_market_rows ORDER BY date ASC,security_id ASC`).all()).results;
  }
  async saveResearchSnapshotForDate(date, componentIndicators = []) {
    let dates;
    try { dates=(await this.#statement(`SELECT date FROM kfg_v2_market_dates WHERE status='COMPLETE' AND date<=? ORDER BY date DESC LIMIT 312`,[date]).all()).results.map(r=>r.date).sort();
      await this.#statement('SELECT date FROM kfg_v2_research_snapshots LIMIT 1').first();
    } catch { return false; }
    if(!dates.includes(date)) fail('SNAPSHOT_DATE_NOT_COMPLETE');
    const placeholders=dates.map(()=>'?').join(',');
    const rows=(await this.#statement(`SELECT date,security_id AS securityId,short_code AS shortCode,market,close,return_pct AS returnPct,trading_value AS tradingValue,market_cap AS marketCap FROM kfg_v2_market_rows WHERE date IN (${placeholders}) ORDER BY date,security_id`,dates).all()).results;
    const breadth=(await this.#statement(`SELECT date,score FROM kfg_v2_factor_snapshots WHERE factor='Breadth' AND date IN (${placeholders}) ORDER BY date`,dates).all()).results;
    const adapted=researchHistoriesFromPublicIndicators(componentIndicators);
    const research=calculateResearchFactors({marketRows:rows,breadth,credit:adapted.credit,liquidation:adapted.liquidation});
    const snapshotDate=research.composite?.observationDate??date;
    if(await this.#statement('SELECT date FROM kfg_v2_research_snapshots WHERE date=?',[snapshotDate]).first()) return false;
    const now=new Date().toISOString();
    await this.#db.batch([this.#guard(),this.#statement(`INSERT INTO kfg_v2_research_snapshots
      (date,methodology_version,factors_json,composite_json,history_mode,point_in_time_verified,historical_vintage_verified,source_published_at,source_observed_at,fetched_at,calculated_at,correction_fingerprint)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,[snapshotDate,research.methodologyVersion,JSON.stringify(research.factors),JSON.stringify(research.composite),research.historyMode,research.pointInTimeVerified?1:0,research.historicalVintageVerified?1:0,research.sourcePublishedAt,research.composite?.observationDate??snapshotDate,now,now,null])]);
    return true;
  }
  async saveComponentHistory(indicators = []) {
    const now=new Date().toISOString(), statements=[];
    for (const indicator of indicators) {
      if (!['LEV_BLEND20_60','L3_PRESSURE_P252'].includes(indicator?.id)) continue;
      for (const point of indicator.history ?? []) {
        if (!/^\d{8}$/.test(point?.date)) continue;
        const score=Number.isFinite(point?.score)?point.score:(Number.isFinite(point?.value)?point.value:null);
        statements.push(this.#statement(`INSERT INTO kfg_v2_component_history(component_id,date,score,captured_at) VALUES (?,?,?,?) ON CONFLICT(component_id,date) DO NOTHING`,[indicator.id,point.date,score,now]));
      }
    }
    for(let i=0;i<statements.length;i+=90) await this.#db.batch(statements.slice(i,i+90));
    return statements.length;
  }
  async getPersistedComponentHistory() {
    const {results}=await this.#statement(`SELECT component_id AS id,date,score FROM kfg_v2_component_history ORDER BY component_id,date`).all();
    const by=new Map(); for(const row of results){if(!by.has(row.id))by.set(row.id,{id:row.id,history:[]});by.get(row.id).history.push({date:row.date,score:row.score});}
    return [...by.values()];
  }
  async backfillResearchSnapshots(years=1, componentIndicators=[], maxSnapshots=10) {
    if(years!==1) fail('INVALID_SNAPSHOT_RANGE');
    const latest=(await this.#statement(`SELECT MAX(date) AS date FROM kfg_v2_market_dates WHERE status='COMPLETE'`).first())?.date;
    if(!latest) return {requested:0,written:0,latestDate:null,oldestDate:null,range:'1Y'};
    const latestDate=new Date(`${latest.slice(0,4)}-${latest.slice(4,6)}-${latest.slice(6,8)}T00:00:00Z`);
    latestDate.setUTCFullYear(latestDate.getUTCFullYear()-1);
    const cutoff=latestDate.toISOString().slice(0,10).replaceAll('-','');
    const dates=(await this.#statement(`SELECT date FROM kfg_v2_market_dates WHERE status='COMPLETE' AND date>=? ORDER BY date DESC`,[cutoff]).all()).results.map(r=>r.date);
    let written=0;
    if (componentIndicators.length) await this.saveComponentHistory(componentIndicators);
    const persisted=await this.getPersistedComponentHistory();
    const calcIndicators=persisted.length?persisted:componentIndicators;
    const targetDates=dates.slice(0,Math.max(1,Math.min(10,maxSnapshots)));
    const warmDates=(await this.#statement(`SELECT date FROM kfg_v2_market_dates WHERE status='COMPLETE' AND date<=? ORDER BY date DESC LIMIT ?`,[targetDates[0],targetDates.length+311]).all()).results.map(r=>r.date).sort();
    const ph=warmDates.map(()=>'?').join(',');
    const rows=(await this.#statement(`SELECT date,security_id AS securityId,short_code AS shortCode,market,close,return_pct AS returnPct,trading_value AS tradingValue,market_cap AS marketCap FROM kfg_v2_market_rows WHERE date IN (${ph}) ORDER BY date,security_id`,warmDates).all()).results;
    const breadth=(await this.#statement(`SELECT date,score FROM kfg_v2_factor_snapshots WHERE factor='Breadth' AND date IN (${ph}) ORDER BY date`,warmDates).all()).results;
    const research=calculateResearchFactors({marketRows:rows,breadth,componentIndicators:calcIndicators});
    for(const date of targetDates){
      const composite=research.composite.history.find(p=>p.date===date);
      if(!composite || await this.#statement('SELECT date FROM kfg_v2_research_snapshots WHERE date=?',[date]).first()) continue;
      const factors=Object.fromEntries(Object.entries(research.factors).map(([k,v])=>[k,v.find(p=>p.date===date)??{date,value:null}]));
      await this.#db.batch([this.#guard(),this.#statement(`INSERT INTO kfg_v2_research_snapshots(date,methodology_version,factors_json,composite_json,history_mode,point_in_time_verified,historical_vintage_verified,source_published_at,source_observed_at,fetched_at,calculated_at,correction_fingerprint) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,[date,research.methodologyVersion,JSON.stringify(factors),JSON.stringify({...research.composite,history:[]}),research.historyMode,0,0,null,date,new Date().toISOString(),new Date().toISOString(),null])]);
      written++;
    }
    return {requested:dates.length,written,remaining:dates.length-written,complete:dates.length-written===0,latestDate:dates[0]??null,oldestDate:dates.at(-1)??null,range:'1Y',cutoffDate:cutoff};
  }
  async getLatestResearchSnapshot() {
    const row=await this.#statement('SELECT * FROM kfg_v2_research_snapshots ORDER BY date DESC LIMIT 1').first();
    if(!row) return null;
    return {date:row.date,methodologyVersion:row.methodology_version,factors:JSON.parse(row.factors_json),composite:JSON.parse(row.composite_json),historyMode:row.history_mode,pointInTimeVerified:Boolean(row.point_in_time_verified),historicalVintageVerified:Boolean(row.historical_vintage_verified),sourcePublishedAt:row.source_published_at,sourceObservedAt:row.source_observed_at,fetchedAt:row.fetched_at,calculatedAt:row.calculated_at,correctionFingerprint:row.correction_fingerprint};
  }
  async saveFactorSnapshot(date,factor) {
    // Breadth is committed with the date. Standalone overwrites/repairs are forbidden.
    const snapshot=await this.getMarketDate(date);
    if (!snapshot || snapshot.status!=='SUCCESS') fail('ATOMIC_DATE_REQUIRED');
    const expected=factorOf(snapshot);
    if (JSON.stringify(factor)!==JSON.stringify(expected)) fail('FACTOR_CONFLICT');
    const stored=(await this.getFactorHistory()).find(f=>f.date===date);
    if (!stored) fail('STORED_FACTOR_MISSING');
  }
  async getFactorHistory(factor='Breadth') {
    if (factor!=='Breadth') return [];
    const {results}=await this.#statement(`SELECT f.*,m.return_coverage,m.trading_value_coverage,m.market_cap_coverage
      FROM kfg_v2_factor_snapshots f JOIN kfg_v2_market_dates m ON m.date=f.date
      WHERE f.factor=? ORDER BY f.date ASC`,[factor]).all();
    return results.map(r=>({date:r.date,factor:r.factor,advanceRatio:r.advance_ratio,advanceValueShare:r.advance_value_share,
      score:r.score,status:r.status,coverage:{return:r.return_coverage,tradingValue:r.trading_value_coverage,marketCap:r.market_cap_coverage}}));
  }
  async saveBackfillProgress(p) {
    for (const k of ['latestProcessedDate','oldestProcessedDate','lastAttemptedDate','lastSuccessfulDate'])
      if (p[k]!=null && !validMarketDate(p[k])) fail('INVALID_CHECKPOINT');
    for (const k of ['successfulTradingDates','requestCount','rowsProcessed']) if (!integer(p[k])) fail('INVALID_CHECKPOINT');
    if (!STATUSES.includes(p.status) || (p.lastFailureCode!=null && !/^[A-Z_]{1,80}$/.test(p.lastFailureCode))) fail('INVALID_CHECKPOINT');
    // Data counters can ONLY advance with the date batch. Compare against DB inside SQL, not
    // a read/decide/write race. -1 trips CHECK and rolls back on stale/fabricated progress.
    const update=this.#statement(`UPDATE kfg_v2_backfill_progress SET
      request_count=CASE WHEN successful_trading_date_count=? AND rows_processed=?
        AND latest_processed_date IS ? AND oldest_processed_date IS ? AND ?>=request_count
        THEN ? ELSE -1 END, status=?,last_attempted_date=?,last_successful_date=?,last_failure_code=?
      WHERE methodology_version=?`,[p.successfulTradingDates,p.rowsProcessed,p.latestProcessedDate,p.oldestProcessedDate,
      p.requestCount,p.requestCount,p.status,p.lastAttemptedDate??null,p.lastSuccessfulDate??null,p.lastFailureCode??null,RESEARCH_METHODOLOGY]);
    this.#observe(await this.#db.batch([this.#guard(),update]));
  }
  async getBackfillProgress() {
    const p=await this.#statement('SELECT * FROM kfg_v2_backfill_progress WHERE methodology_version=?',[RESEARCH_METHODOLOGY]).first();
    if (!p) return null;
    return {latestProcessedDate:p.latest_processed_date,oldestProcessedDate:p.oldest_processed_date,
      successfulTradingDates:p.successful_trading_date_count,requestCount:p.request_count,rowsProcessed:p.rows_processed,
      status:p.status,lastAttemptedDate:p.last_attempted_date,lastSuccessfulDate:p.last_successful_date,lastFailureCode:p.last_failure_code};
  }
}
