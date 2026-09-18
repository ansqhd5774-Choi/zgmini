import {REV7_VERSION} from './korea-rev7-engine.mjs';

export const REV7_D1_PARAMETER_LIMIT=100;
const ROW_COLUMNS=['date','security_id','short_code','close','high','low','change_amount','share_volume'];
const ROW_KEYS=['date','securityId','shortCode','close','high','low','changeAmount','shareVolume'];
export const REV7_ROWS_PER_INSERT=Math.floor(REV7_D1_PARAMETER_LIMIT/ROW_COLUMNS.length);
const validDate=value=>typeof value==='string'&&/^\d{8}$/.test(value);
const integer=value=>Number.isSafeInteger(value)&&value>=0;
const finiteOrNull=value=>value===null||(typeof value==='number'&&Number.isFinite(value));
const fail=code=>{throw Error(code);};

function validate(snapshot) {
  if(!snapshot||!validDate(snapshot.requestedDate)||snapshot.complete!==true||
     !['SUCCESS','NO_TRADING_OBSERVATION'].includes(snapshot.status)||!Array.isArray(snapshot.rows))
    fail('INVALID_REV7_SNAPSHOT');
  if(snapshot.status==='NO_TRADING_OBSERVATION') {
    if(snapshot.rows.length||snapshot.series!==null) fail('INVALID_REV7_EMPTY_SNAPSHOT');
    return;
  }
  if(!snapshot.series||snapshot.series.date!==snapshot.requestedDate) fail('INVALID_REV7_SERIES');
  const seen=new Set();
  for(const row of snapshot.rows) {
    if(row.date!==snapshot.requestedDate||typeof row.securityId!=='string'||!row.securityId||
       typeof row.shortCode!=='string'||!row.shortCode||seen.has(row.securityId)) fail('INVALID_REV7_ROW');
    seen.add(row.securityId);
    for(const key of ROW_KEYS.slice(3)) if(!finiteOrNull(row[key])||(key!=='changeAmount'&&row[key]!==null&&row[key]<0))
      fail('INVALID_REV7_NUMERIC');
  }
  for(const key of ['kospiClose','vkospi200Close','ktbTotalReturn','governmentPrimeTotalReturn',
    'standardPutVolume','standardCallVolume','putCallRatio','aaMinus3Y','bbbMinus3Y','junkSpread'])
    if(!finiteOrNull(snapshot.series[key])) fail('INVALID_REV7_SERIES_NUMERIC');
  if(!integer(snapshot.krxRequestCount??0)||!integer(snapshot.bokRequestCount??0)) fail('INVALID_REV7_METADATA');
}

export class Rev7D1Store {
  #db; #runId=null; #now; #leaseMs;
  constructor(db,{now=Date.now,leaseMs=120000}={}) {
    if(!db?.prepare||!db?.batch) fail('INVALID_D1_CONFIGURATION');
    this.#db=db.withSession?db.withSession('first-primary'):db;
    this.#now=now;this.#leaseMs=leaseMs;
  }
  #statement(sql,values=[]) {
    if(values.length>REV7_D1_PARAMETER_LIMIT) fail('SQL_LIMIT');
    return this.#db.prepare(sql).bind(...values);
  }
  #guard() {
    if(!this.#runId) fail('LEASE_REQUIRED');
    return this.#statement(`INSERT INTO kfg_rev7_backfill_progress(methodology_version)
      VALUES(CASE WHEN EXISTS(SELECT 1 FROM kfg_rev7_backfill_progress
        WHERE methodology_version=? AND active_run_id=? AND lease_until>?) THEN ? ELSE NULL END)
      ON CONFLICT(methodology_version) DO NOTHING`,
    [REV7_VERSION,this.#runId,this.#now(),REV7_VERSION]);
  }
  async acquireLease(runId=crypto.randomUUID()) {
    if(this.#runId||typeof runId!=='string'||!runId||runId.length>128) fail('INVALID_RUN_ID');
    const now=this.#now();
    const result=await this.#statement(`INSERT INTO kfg_rev7_backfill_progress(methodology_version,active_run_id,lease_until)
      VALUES(?,?,?) ON CONFLICT(methodology_version) DO UPDATE SET
      active_run_id=excluded.active_run_id,lease_until=excluded.lease_until
      WHERE active_run_id IS NULL OR lease_until IS NULL OR lease_until<=?`,
    [REV7_VERSION,runId,now+this.#leaseMs,now]).run();
    if(result.meta?.changes!==1)return false;
    this.#runId=runId;return true;
  }
  async releaseLease() {
    if(!this.#runId)return false;
    const result=await this.#statement(`UPDATE kfg_rev7_backfill_progress SET active_run_id=NULL,lease_until=NULL
      WHERE methodology_version=? AND active_run_id=?`,[REV7_VERSION,this.#runId]).run();
    this.#runId=null;return result.meta?.changes===1;
  }
  async renewLease() {
    if(!this.#runId)fail('LEASE_REQUIRED');
    const now=this.#now();
    const result=await this.#statement(`UPDATE kfg_rev7_backfill_progress SET lease_until=?
      WHERE methodology_version=? AND active_run_id=? AND lease_until>?`,
    [now+this.#leaseMs,REV7_VERSION,this.#runId,now]).run();
    if(result.meta?.changes!==1)fail('LEASE_LOST');
  }
  async saveDate(snapshot) {
    validate(snapshot);
    const date=snapshot.requestedDate;
    if(await this.#statement('SELECT date FROM kfg_rev7_market_dates WHERE date=?',[date]).first())
      fail('DATE_ALREADY_STORED');
    const statements=[this.#guard()];
    for(let i=0;i<snapshot.rows.length;i+=REV7_ROWS_PER_INSERT) {
      const rows=snapshot.rows.slice(i,i+REV7_ROWS_PER_INSERT);
      statements.push(this.#statement(
        `INSERT INTO kfg_rev7_kospi_rows(${ROW_COLUMNS.join(',')}) VALUES ${rows.map(()=>`(${ROW_COLUMNS.map(()=>'?').join(',')})`).join(',')}`,
        rows.flatMap(row=>ROW_KEYS.map(key=>row[key])),
      ));
    }
    const q=snapshot.quality??{kospiCount:0,validHighCount:0,validLowCount:0,validShareVolumeCount:0};
    statements.push(this.#statement(`INSERT INTO kfg_rev7_market_dates
      (date,status,kospi_count,valid_high_count,valid_low_count,valid_share_volume_count,rows_stored,
       krx_request_count,bok_request_count,fetched_at,methodology_version)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [date,snapshot.status==='SUCCESS'?'COMPLETE':'NO_TRADING_OBSERVATION',
      snapshot.rows.length,q.validHighCount??0,q.validLowCount??0,q.validShareVolumeCount??0,snapshot.rows.length,
      snapshot.krxRequestCount??0,snapshot.bokRequestCount??0,snapshot.fetchedAt??null,REV7_VERSION]));
    if(snapshot.status==='SUCCESS') {
      const s=snapshot.series;
      statements.push(this.#statement(`INSERT INTO kfg_rev7_daily_series
        (date,kospi_close,vkospi200_close,ktb_total_return,government_prime_total_return,
         standard_put_volume,standard_call_volume,put_call_ratio,aa_minus_3y,bbb_minus_3y,junk_spread,fetched_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [date,s.kospiClose,s.vkospi200Close,s.ktbTotalReturn,s.governmentPrimeTotalReturn,
        s.standardPutVolume,s.standardCallVolume,s.putCallRatio,s.aaMinus3Y,s.bbbMinus3Y,s.junkSpread,snapshot.fetchedAt??null]));
    }
    statements.push(this.#statement(`UPDATE kfg_rev7_backfill_progress SET
      latest_processed_date=(SELECT MAX(date) FROM kfg_rev7_market_dates),
      oldest_processed_date=(SELECT MIN(date) FROM kfg_rev7_market_dates),
      successful_trading_date_count=(SELECT COUNT(*) FROM kfg_rev7_market_dates WHERE status='COMPLETE'),
      krx_request_count=krx_request_count+?,
      bok_request_count=bok_request_count+?,
      rows_processed=(SELECT COALESCE(SUM(rows_stored),0) FROM kfg_rev7_market_dates),
      status='RUNNING',last_attempted_date=?,
      last_successful_date=CASE WHEN ?='SUCCESS' THEN ? ELSE last_successful_date END,last_failure_code=NULL
      WHERE methodology_version=?`,
    [snapshot.krxRequestCount??0,snapshot.bokRequestCount??0,date,snapshot.status,date,REV7_VERSION]));
    await this.#db.batch(statements);
  }
  async getDate(date) {
    if(!validDate(date))fail('INVALID_DATE');
    const meta=await this.#statement('SELECT * FROM kfg_rev7_market_dates WHERE date=?',[date]).first();
    if(!meta)return null;
    if(meta.status!=='COMPLETE')return {
      requestedDate:date,status:'NO_TRADING_OBSERVATION',complete:true,rows:[],series:null,
      krxRequestCount:meta.krx_request_count,bokRequestCount:meta.bok_request_count,fetchedAt:meta.fetched_at,
      researchOnly:true,productionEligible:false,
    };
    const rows=(await this.#statement(`SELECT date,security_id AS securityId,short_code AS shortCode,
      close,high,low,change_amount AS changeAmount,share_volume AS shareVolume
      FROM kfg_rev7_kospi_rows WHERE date=? ORDER BY security_id`,[date]).all()).results;
    const s=await this.#statement(`SELECT date,kospi_close AS kospiClose,vkospi200_close AS vkospi200Close,
      ktb_total_return AS ktbTotalReturn,government_prime_total_return AS governmentPrimeTotalReturn,
      standard_put_volume AS standardPutVolume,standard_call_volume AS standardCallVolume,
      put_call_ratio AS putCallRatio,aa_minus_3y AS aaMinus3Y,bbb_minus_3y AS bbbMinus3Y,
      junk_spread AS junkSpread FROM kfg_rev7_daily_series WHERE date=?`,[date]).first();
    return {
      requestedDate:date,status:'SUCCESS',complete:true,rows,series:s,
      quality:{kospiCount:meta.kospi_count,validHighCount:meta.valid_high_count,validLowCount:meta.valid_low_count,
        validShareVolumeCount:meta.valid_share_volume_count},
      krxRequestCount:meta.krx_request_count,bokRequestCount:meta.bok_request_count,fetchedAt:meta.fetched_at,
      researchOnly:true,productionEligible:false,
    };
  }
  async getLatestCompleteDate() {
    return (await this.#statement("SELECT MAX(date) AS date FROM kfg_rev7_market_dates WHERE status='COMPLETE'").first())?.date??null;
  }
  async getHistory(limitDates=1030) {
    if(!Number.isSafeInteger(limitDates)||limitDates<1||limitDates>2000)fail('INVALID_HISTORY_LIMIT');
    const cutoff=(await this.#statement(`SELECT date FROM kfg_rev7_market_dates WHERE status='COMPLETE'
      ORDER BY date DESC LIMIT 1 OFFSET ?`,[limitDates-1]).first())?.date;
    const latest=await this.getLatestCompleteDate();
    if(!latest)return {marketRows:[],dailySeries:[]};
    const lower=cutoff??(await this.#statement("SELECT MIN(date) AS date FROM kfg_rev7_market_dates WHERE status='COMPLETE'").first())?.date;
    const marketRows=(await this.#statement(`SELECT date,security_id AS securityId,short_code AS shortCode,
      close,high,low,change_amount AS changeAmount,share_volume AS shareVolume
      FROM kfg_rev7_kospi_rows WHERE date>=? AND date<=? ORDER BY date,security_id`,[lower,latest]).all()).results;
    const dailySeries=(await this.#statement(`SELECT date,kospi_close AS kospiClose,vkospi200_close AS vkospi200Close,
      ktb_total_return AS ktbTotalReturn,government_prime_total_return AS governmentPrimeTotalReturn,
      standard_put_volume AS standardPutVolume,standard_call_volume AS standardCallVolume,
      put_call_ratio AS putCallRatio,aa_minus_3y AS aaMinus3Y,bbb_minus_3y AS bbbMinus3Y,
      junk_spread AS junkSpread FROM kfg_rev7_daily_series WHERE date>=? AND date<=? ORDER BY date`,[lower,latest]).all()).results;
    return {marketRows,dailySeries};
  }
  async saveSnapshot(result) {
    const current=result?.history?.filter(point=>typeof point?.composite==='number'&&Number.isFinite(point.composite)).at(-1);
    if(!current)return false;
    if(await this.#statement('SELECT date FROM kfg_rev7_snapshots WHERE date=?',[current.date]).first())return false;
    const now=new Date().toISOString();
    await this.#db.batch([this.#guard(),this.#statement(`INSERT INTO kfg_rev7_snapshots
      (date,methodology_version,factors_json,composite_json,history_mode,point_in_time_verified,source_observed_at,calculated_at)
      VALUES (?,?,?,?,?,?,?,?)`,
    [current.date,REV7_VERSION,JSON.stringify(current.factors),
      JSON.stringify({id:result.id,score:current.composite,status:current.status,observationDate:current.date,weights:result.weights}),
      result.historyMode,result.pointInTimeVerified?1:0,current.date,now])]);
    return true;
  }
  async getLatestSnapshot() {
    const row=await this.#statement('SELECT * FROM kfg_rev7_snapshots ORDER BY date DESC LIMIT 1').first();
    if(!row)return null;
    return {
      date:row.date,methodologyVersion:row.methodology_version,
      factors:JSON.parse(row.factors_json),composite:JSON.parse(row.composite_json),
      historyMode:row.history_mode,pointInTimeVerified:Boolean(row.point_in_time_verified),
      sourceObservedAt:row.source_observed_at,calculatedAt:row.calculated_at,
    };
  }
  async markBackfillStatus(status, failureCode=null) {
    if (!['IDLE','RUNNING','PAUSED','COMPLETE','ERROR'].includes(status)) fail('INVALID_BACKFILL_STATUS');
    if (failureCode!==null && (typeof failureCode!=='string'||failureCode.length>128)) fail('INVALID_FAILURE_CODE');
    if(!this.#runId) fail('LEASE_REQUIRED');
    const result=await this.#statement(`UPDATE kfg_rev7_backfill_progress SET status=?,last_failure_code=?
      WHERE methodology_version=? AND active_run_id=? AND lease_until>?`,
    [status,failureCode,REV7_VERSION,this.#runId,this.#now()]).run();
    if(result.meta?.changes!==1) fail('LEASE_LOST');
    return true;
  }
  async getBackfillProgress() {
    const row=await this.#statement('SELECT * FROM kfg_rev7_backfill_progress WHERE methodology_version=?',[REV7_VERSION]).first();
    if(!row)return null;
    return {
      latestProcessedDate:row.latest_processed_date,oldestProcessedDate:row.oldest_processed_date,
      successfulTradingDates:row.successful_trading_date_count,krxRequestCount:row.krx_request_count,
      bokRequestCount:row.bok_request_count,rowsProcessed:row.rows_processed,status:row.status,
      lastAttemptedDate:row.last_attempted_date,lastSuccessfulDate:row.last_successful_date,lastFailureCode:row.last_failure_code,
    };
  }
}
