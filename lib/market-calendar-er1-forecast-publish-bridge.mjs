// ER1 2026-11/12 saved-forecast derived output bridge (isolated candidate).
// Caller supplies the existing PC read-only saved-day loader, approved scorer,
// public serializer, local versioned store and B-only D1 helper. This module
// makes no provider requests and cannot publish without an explicit B handoff.
import {createHash} from 'node:crypto';

export const FORECAST_PUBLIC_KEYS=Object.freeze({
  '2026-11':'market-calendar:earnings-nov2026-er1-score-public',
  '2026-12':'market-calendar:earnings-dec2026-er1-score-public'
});
export const EXPECTED_FORECAST_METHOD=
  'ER1_ESTIMATED_EPS_SIGNED_RANK_60_40_97_DRAFT_20261106';
const stop=code=>{throw Error(code)};
const sha256=s=>createHash('sha256').update(s).digest('hex');
const safeDay=day=>typeof day==='string'&&/^20\d\d-\d\d-\d\d$/.test(day)&&
  new Date(day+'T00:00:00Z').toISOString().slice(0,10)===day;
const monthDays=month=>month==='2026-11'?30:month==='2026-12'?31:0;
const safeFields=(object,allowed)=>object&&typeof object==='object'&&
  !Array.isArray(object)&&Object.keys(object).every(key=>allowed.includes(key));

/**
 * Pure, read-only preparation using only the 30 or 31 already-saved daily
 * snapshots. No actual result or history fallback is supplied to the scorer.
 * The unscored cohort is represented only in coverage and by a Reader ★
 * fallback, never by a fabricated numeric 0 in public D1 score rows.
 */
export function prepareForecastMonth({month,asOf,savedDays,adapter,scorer,
  publicSerializer}={}){
  const expected=monthDays(month);
  if(!expected||!safeDay(asOf)||!Array.isArray(savedDays)||
    typeof adapter!=='function'||typeof scorer!=='function'||
    typeof publicSerializer!=='function')stop('ER1_FORECAST_BRIDGE_INPUT_STOP');
  const distinct=new Set(savedDays.map(x=>x?.day));
  if(savedDays.length!==expected||distinct.size!==expected||
    [...distinct].some(day=>!safeDay(day)||day.slice(0,7)!==month))
    stop('ER1_FORECAST_BRIDGE_SAVED_DAYS_INCOMPLETE');
  const adapted=adapter({savedDays,asOf});
  if(adapted?.coverage?.savedDays!==expected||
    !Number.isInteger(adapted.coverage.futureIssuers)||
    adapted.coverage.futureIssuers<1)
    stop('ER1_FORECAST_BRIDGE_ADAPTER_STOP');
  const result=scorer(adapted.issuerRows,{asOf});
  if(result?.status!=='READY_SHADOW'||result.previewOnly!==true||
    result.method!==EXPECTED_FORECAST_METHOD||
    result.threshold!==97||!Array.isArray(result.rankings)||
    result.coverage?.scoreableIssuers!==result.rankings.length||
    result.coverage?.estimateOnly!==result.rankings.length||
    result.coverage?.actualOnly!==0||result.coverage?.mixed!==0)
    stop('ER1_FORECAST_BRIDGE_SCORER_STOP');
  const snapshot=publicSerializer(result);
  if(!safeFields(snapshot,['status','method','asOf','threshold',
    'coverage','recordCount','star3Count','scores'])||
    snapshot.status!=='READY_ER1_PUBLIC'||snapshot.method!==result.method||
    snapshot.asOf!==asOf||snapshot.threshold!==97||
    !safeFields(snapshot.coverage,['inputSymbols','observedIssuers',
      'scoreableIssuers','unscoreableReasons'])||
    snapshot.recordCount!==result.rankings.length||
    snapshot.coverage.scoreableIssuers!==snapshot.recordCount||
    !Array.isArray(snapshot.scores)||
    snapshot.scores.length!==snapshot.recordCount)
    stop('ER1_FORECAST_BRIDGE_PUBLIC_CONTRACT_STOP');
  for(const row of snapshot.scores){
    if(!safeFields(row,['issuerId','tickers','score'])||
      typeof row.issuerId!=='string'||!Array.isArray(row.tickers)||
      typeof row.score!=='number'||!Number.isFinite(row.score)||
      row.score<0||row.score>100)
      stop('ER1_FORECAST_BRIDGE_RAW_PUBLIC_STOP');
  }
  const body=JSON.stringify(snapshot);
  if(Buffer.byteLength(body,'utf8')>1_000_000)
    stop('ER1_FORECAST_BRIDGE_PUBLIC_SIZE_STOP');
  const missing=adapted.coverage.futureIssuers-result.rankings.length;
  if(missing<0)stop('ER1_FORECAST_BRIDGE_COVERAGE_STOP');
  return {month,publicKey:FORECAST_PUBLIC_KEYS[month],body,
    bodySha256:sha256(body),sourceStoredAt:adapted.coverage.latestSourceStoredAt,
    asOf,observedIssuers:adapted.coverage.futureIssuers,
    scoreableIssuers:result.rankings.length,missingOneStar:missing,
    star3Count:result.star3Count,providerCalls:0,rawRowsPublic:0,
    scoreMethod:result.method,readyForStage:true};
}

/** Stage only; caller's approved local versioned store must verify read-back. */
export async function stageForecastMonth(prepared,{saveDerived}={}){
  if(!prepared?.readyForStage||typeof saveDerived!=='function')
    stop('ER1_FORECAST_BRIDGE_STAGE_INPUT_STOP');
  const received=await saveDerived(prepared.body);
  if(received!==prepared.bodySha256)
    stop('ER1_FORECAST_BRIDGE_STAGE_READBACK_STOP');
  return {bodySha256:received,readyForB:true};
}

/**
 * B-only side-effect entry. Existing per-month D1 helper performs read-back;
 * the separate authorized runner verifies exact source and B manifest.
 */
export async function publishForecastMonth(prepared,stageReceipt,{approvedB,
  approvedBodySha256,syncD1,remote,core,storedAt}={}){
  if(approvedB!==true||typeof approvedBodySha256!=='string'||
    approvedBodySha256!==prepared?.bodySha256||
    stageReceipt?.bodySha256!==prepared?.bodySha256||
    stageReceipt?.readyForB!==true||typeof syncD1!=='function'||
    !Number.isSafeInteger(storedAt)||storedAt<1)
    stop('ER1_FORECAST_BRIDGE_B_AUTH_STOP');
  const result=await syncD1({remote,core,body:prepared.body,storedAt});
  const expectedPrefix=prepared.month==='2026-11'?'NOV30':
    prepared.month==='2026-12'?'DEC31':null;
  if(!expectedPrefix||prepared.publicKey!==FORECAST_PUBLIC_KEYS[prepared.month]||
    !result||typeof result.code!=='string'||
    !new RegExp(`^${expectedPrefix}_ER1_D1_(VERIFIED|ALREADY_MATCHED)$`).test(result.code))
    stop('ER1_FORECAST_BRIDGE_D1_READBACK_STOP');
  return {status:'PASS',code:result.code,publicKey:prepared.publicKey,
    bodySha256:prepared.bodySha256,d1Writes:Number(result.wrote===true),
    providerCalls:0,rawRowsPublic:0};
}
