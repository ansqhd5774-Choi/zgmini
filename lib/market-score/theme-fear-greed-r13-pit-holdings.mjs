/**
 * Theme F&G R13: SEC registry and N-PORT PIT EVIDENCE audit (NO scoring).
 * No network, filesystem, DB, provider, or publication calls.
 * The SEC ticker registry gives a fund identity candidate, not verified holdings.
 * A public N-PORT report cannot be observed before its public filing time.
 */
export const THEME_R13_VERSION='THEME-FG-R13-SEC-PIT-READONLY-V1';
const goodDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const goodTime=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(x)&&goodDate(x.slice(0,10))&&Number.isFinite(Date.parse(x));
const validTicker=x=>typeof x==='string'&&/^[A-Z][A-Z0-9.\-]{0,14}$/.test(x);
const validCik=x=>/^[0-9]{1,10}$/.test(String(x))&&BigInt(x)>0n;
const cik10=x=>String(x).padStart(10,'0');
const validSeries=x=>typeof x==='string'&&/^S\d{9}$/.test(x);
const validClass=x=>typeof x==='string'&&/^C\d{9}$/.test(x);
const fail=(status,extras={})=>({version:THEME_R13_VERSION,status,scoreReady:false,published:false,...extras});

/** SEC current registry is not a historically time-resolved security master. */
export function resolveThemeFundRegistryR13(secMf,requestedTickers){
  if(!Array.isArray(requestedTickers)||requestedTickers.some(x=>!validTicker(x))||new Set(requestedTickers).size!==requestedTickers.length){
    return fail('TICKER_REQUEST_INVALID',{funds:[]});
  }
  if(!secMf||!Array.isArray(secMf.fields)||!Array.isArray(secMf.data)){
    return fail('SEC_MF_REGISTRY_MISSING',{funds:requestedTickers.map(ticker=>({ticker,status:'UNVERIFIED'}))});
  }
  const indices=['cik','seriesId','classId','symbol'].map(x=>secMf.fields.indexOf(x));
  if(indices.some(i=>i<0)||new Set(indices).size!==4)return fail('SEC_MF_SCHEMA_INVALID',{funds:[]});
  const needed=new Set(requestedTickers),byTicker=new Map(requestedTickers.map(x=>[x,[]]));
  for(const row of secMf.data){
    if(!Array.isArray(row))continue;
    const symbol=row[indices[3]];
    if(!needed.has(symbol))continue;
    const cik=row[indices[0]],seriesId=row[indices[1]],classId=row[indices[2]];
    if(!validCik(cik)||!validSeries(seriesId)||!validClass(classId)){
      byTicker.get(symbol).push({status:'MALFORMED'});continue;
    }
    const record={cik:cik10(cik),seriesId,classId};
    if(!byTicker.get(symbol).some(x=>x.cik===record.cik&&x.seriesId===record.seriesId&&x.classId===record.classId)){
      byTicker.get(symbol).push(record);
    }
  }
  const funds=requestedTickers.map(ticker=>{
    const found=byTicker.get(ticker);
    if(found.length===0)return {ticker,status:'NO_SEC_MF_MATCH',identity:null};
    if(found.length!==1||found[0].status==='MALFORMED')return {ticker,status:'AMBIGUOUS_OR_MALFORMED',identity:null};
    return {ticker,status:'REGISTRY_CANDIDATE_ONLY',identity:found[0]};
  });
  return fail('SEC_REGISTRY_AUDITED_NO_PIT',{
    funds,matched:funds.filter(x=>x.status==='REGISTRY_CANDIDATE_ONLY').length,
    unresolved:funds.filter(x=>x.status!=='REGISTRY_CANDIDATE_ONLY').length,
  });
}

/**
 * Audit normalized SEC public N-PORT filing metadata. This is NOT an XML
 * parser: callers verify SEC provenance/series/class upstream. Do not copy
 * holdings into this output or use sparse snapshots as continuous daily PIT.
 */
export function auditThemeFundPITR13({ticker,identity,reports=[],studyDates=[]}={}){
  if(!validTicker(ticker)||!identity||!validCik(identity.cik)||!validSeries(identity.seriesId)||!validClass(identity.classId)){
    return fail('IDENTITY_EVIDENCE_MISSING',{ticker:ticker??null,reportCount:0});
  }
  if(!Array.isArray(reports)||!Array.isArray(studyDates)||studyDates.some(x=>!goodDate(x))){
    return fail('REPORT_INPUT_INVALID',{ticker});
  }
  const accepted=[],rejected=[];
  for(const r of reports){
    let reason=null;
    if(!r||r.source!=='SEC_NPORT_PUBLIC'||typeof r.accession!=='string'||!/^\d{10}-\d{2}-\d{6}$/.test(r.accession))reason='SOURCE_OR_ACCESSION_INVALID';
    else if(String(r.cik).padStart(10,'0')!==cik10(identity.cik)||r.seriesId!==identity.seriesId||r.classId!==identity.classId)reason='FUND_IDENTITY_MISMATCH';
    else if(!goodDate(r.holdingsAsOf)||!goodTime(r.publiclyAvailableAt))reason='DATES_INVALID';
    else if(r.publiclyAvailableAt.slice(0,10)<=r.holdingsAsOf)reason='PUBLICATION_CHRONOLOGY_INVALID';
    else if(!Number.isInteger(r.holdingCount)||r.holdingCount<=0||r.hasStableSecurityIds!==true)reason='HOLDINGS_EVIDENCE_INCOMPLETE';
    if(reason){rejected.push({accession:r?.accession??null,reason});continue;}
    accepted.push({accession:r.accession,holdingsAsOf:r.holdingsAsOf,publiclyAvailableAt:r.publiclyAvailableAt,holdingCount:r.holdingCount});
  }
  accepted.sort((a,b)=>a.publiclyAvailableAt.localeCompare(b.publiclyAvailableAt)||a.accession.localeCompare(b.accession));
  const dateAudit=studyDates.map(date=>{
    const available=accepted.filter(r=>r.publiclyAvailableAt.slice(0,10)<date);
    const reportsOnDay=accepted.filter(r=>r.publiclyAvailableAt.slice(0,10)===date);
    return {date,previouslyPublishedReports:available.length,sameDayTimingRequiresIntradayGate:reportsOnDay.length>0,
      latestPreviouslyPublishedAsOf:available.length?available[available.length-1].holdingsAsOf:null,
      pointInTimeDailyHoldingsVerified:false};
  });
  return fail('PIT_REPORT_TIMELINE_AUDITED_NOT_DAILY_COMPLETE',{
    ticker,identity:{cik:cik10(identity.cik),seriesId:identity.seriesId,classId:identity.classId},
    acceptedReports:accepted.length,rejectedReports:rejected.length,accepted,rejected,dateAudit,
    caveat:'Public N-PORT reports provide sparse historical snapshots, not continuous daily holdings or constituent OHLCV. No carry-forward or historical backfill is authorized.',
  });
}