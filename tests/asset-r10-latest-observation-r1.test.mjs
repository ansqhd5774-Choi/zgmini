import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAssetR10RawReadOnlyEvidence,completedR10PriceQuarters}
 from '../lib/diagnostic-layer/asset-bubble-r10-raw-evidence-r1.mjs';
import {evaluateAssetBubbleR10Candidate}
 from '../lib/diagnostic-layer/asset-bubble-r10-evaluation.mjs';
import {scoreAssetBubbleR10Candidate,ASSET_BUBBLE_R10_WEIGHTS}
 from '../lib/diagnostic-layer/asset-bubble-r10-candidate.mjs';
import {isMarketSession} from '../lib/market-score/breadth-b1-r3-calendar.mjs';
import {ASSET_R10_RAW_SCHEMA,validateAssetR10Raw,toAssetR10RawPayload,
 assetR10RawWriter} from '../worker/asset-bubble-r10-raw-r1.mjs';
import {toAssetR10HistoryPayload} from '../worker/asset-bubble-r10-history-r1.mjs';
import {mergeAssetR10RawForUi,mergeAssetR10LatestForUi}
 from '../app/asset-bubble/asset-r10-raw-ui-r1.mjs';
import {mergeAssetR10HistoryForUi}
 from '../app/asset-bubble/asset-r10-history-ui-r1.mjs';

// Synthetic, deterministic previously-stored observations only. No provider,
// filesystem database, deployment, API credential, or production D1 access.
const NOW=Date.parse('2026-11-03T12:00:00Z');
const STORED=Date.parse('2026-11-02T06:00:00Z');
const IDS=Object.keys(ASSET_BUBBLE_R10_WEIGHTS);
const UNITS=['TIMES_GDP','LOG_PERCENT_POINTS','PERCENTAGE_POINTS',
 'PERCENT_OF_PRIOR_HOLDINGS','PERCENTILE_POINTS','PERCENTAGE_POINTS'];
const SOURCES=['FRB_Z1_EQUITY_MARKET_VALUE_AND_BEA_GDP',
 'STORED_SP500_PRICE_3M_VS_12M','FRB_Z1_HOUSEHOLD_EQUITY_SHARE_4Q_CHANGE',
 'FRB_Z1_POSITIVE_EQUITY_NET_FLOW_4Q',
 'STORED_ALPACA_RESEARCH_12M_RETURN_VS_200MA_BREADTH',
 'FRB_M2_YOY_MINUS_BEA_NOMINAL_GDP_YOY'];
const Q2='2026-Q2',Q3='2026-Q3';
const quarter=(year,q)=>`${year}-Q${q}`;
const quarterStart=(year,q)=>`${year}-${String((q-1)*3+1).padStart(2,'0')}-01`;
const monthEndSession=(year,month)=>{
 const date=new Date(Date.UTC(year,month,0));
 while(!isMarketSession(date.toISOString().slice(0,10)))date.setUTCDate(date.getUTCDate()-1);
 return date.toISOString().slice(0,10);
};

function storedSources(){
 const macroSeries=Object.fromEntries(['BOGZ1LM793164115Q','BOGZ1LM103164115Q',
  'GDP','BOGZ1FL153064486Q','BOGZ1FA153064475Q',
  'BOGZ1FL153064475Q','M2SL'].map(id=>[id,[]]));
 let qi=0;
 for(let year=2015;year<=2026;year++)for(let q=1;q<=4;q++){
  if(quarter(year,q)>Q3)break;
  const observationDate=quarterStart(year,q),row=value=>({observationDate,value});
  macroSeries.BOGZ1LM793164115Q.push(row(8_000_000+qi*54_000+Math.sin(qi)*2000));
  macroSeries.BOGZ1LM103164115Q.push(row(11_000_000+qi*81_000));
  macroSeries.GDP.push(row(19_000+qi*92));
  macroSeries.BOGZ1FL153064486Q.push(row(28+qi*.12+Math.sin(qi/5)*.04));
  macroSeries.BOGZ1FA153064475Q.push(row(200_000+qi*600+Math.sin(qi)*900));
  macroSeries.BOGZ1FL153064475Q.push(row(6_000_000+qi*30_000));
  qi++;
 }
 const sp500Rows=[];
 let mi=0;
 for(let year=2015;year<=2026;year++)for(let month=1;month<=12;month++){
  if(`${year}-${String(month).padStart(2,'0')}`>'2026-09')break;
  macroSeries.M2SL.push({observationDate:`${year}-${String(month).padStart(2,'0')}-01`,
   value:12_000+mi*47+Math.sin(mi/7)*11});
  sp500Rows.push({observationDate:monthEndSession(year,month),
   value:1800+mi*18+Math.sin(mi/8)*45});
  mi++;
 }
 const quality={rows:[]},breadth={formulaApproved:true,rows:[]};
 for(let month=4;month<=9;month++){
  const observationDate=monthEndSession(2026,month);
  const breadthGap=month<=6?35:38;
  quality.rows.push({observationDate,coverage:1,participation:.8});
  breadth.rows.push({observationDate,rankObservations:300,
   breadthGap,researchSafetyScore:100-breadthGap});
 }
 return {macroSeries,sp500Rows,breadth,quality,audit:{invalid:0,conflicts:0}};
}

function approvedRelease(sources){
 const evaluation=evaluateAssetBubbleR10Candidate({macroSeries:sources.macroSeries,
  sp500ShadowRows:sources.sp500Rows,asOfDate:'2026-11-03'});
 const q2=evaluation.rows.find(r=>r.quarter===Q2);
 assert.ok(q2,'synthetic Q2 source score exists');
 const parts={...q2,breadthDivergence:65};
 const scored=scoreAssetBubbleR10Candidate(parts);
 assert.equal(scored.status,'READY','six source scores must be complete before fixture release');
 return {methodologyVersion:'ASSET_BUBBLE_R10_CANDIDATE',status:'READY',
  historyMode:'CURRENT_VINTAGE_ONLY',
  publicationPolicy:'USER_APPROVED_CURRENT_VINTAGE_UNVERIFIED_SOURCES',
  rightsStatus:'USER_ACCEPTED_UNVERIFIED',lookAheadSafe:false,
  productionEligible:true,scoreObservationQuarter:Q2,diagnosticQuarter:'2026-Q4',
  asOfDate:'2026-11-03',sourceVersion:'fixture-r10-observation-nov03-checkpoint',
  sourceStoredAt:STORED,score:scored.score,
  indicators:IDS.map(id=>({id,status:'READY',score:parts[id]}))};
}

function evidence(sources=storedSources()){
 const release=approvedRelease(sources);
 return buildAssetR10RawReadOnlyEvidence({...sources,release});
}

function uiFixture(){
 const quarters=['2025-Q2','2025-Q3','2025-Q4','2026-Q1',Q2];
 const dates=['2025-04-01','2025-07-01','2025-10-01','2026-01-01','2026-04-01'];
 const factors=IDS.map((id,i)=>({id,unit:UNITS[i],source:SOURCES[i],
  score:i+10,value:i+5,previousValue:i+4,
  observationDate:dates[4],previousObservationDate:dates[3],
  latestObservation:{quarter:Q3,value:i+6,observationDate:'2026-07-01',
   previousValue:i+5,previousObservationDate:dates[4]}}));
 const sourceVersion='fixture-r10-ui-nov03-checkpoint';
 const common={sourceVersion,sourceStoredAt:STORED,asOfDate:'2026-11-03',
  scoreObservationQuarter:Q2,rightsStatus:'USER_ACCEPTED_UNVERIFIED'};
 const raw={...common,schemaVersion:ASSET_R10_RAW_SCHEMA,status:'READY',
  historyMode:'CURRENT_VINTAGE_NOT_PIT',diagnosticQuarter:'2026-Q4',
  diagnosticScore:32.5,factors};
 const scored={...common,status:'READY',methodologyVersion:'ASSET_BUBBLE_R10_CANDIDATE',
  historyMode:'CURRENT_VINTAGE_ONLY',score:32.5,indicators:factors.map(f=>({id:f.id,
   status:'READY',score:f.score,weight:ASSET_BUBBLE_R10_WEIGHTS[f.id],value:null}))};
 const history=toAssetR10HistoryPayload({...common,
  schemaVersion:'asset-bubble-r10-one-year-readonly-r1',
  status:'PARTIAL_1Y_READONLY',historicalMode:'CURRENT_VINTAGE_NOT_PIT',
  approvedRawParity:'PASS',approvedScore:32.5,firstQuarter:quarters[0],lastQuarter:Q2,
  factors:factors.map((f,i)=>({id:f.id,unit:f.unit,source:f.source,
   status:i===4?'PARTIAL_1Y':'READY_1Y',
   missingQuarters:i===4?quarters.slice(0,2):[],
   points:quarters.map((q,j)=>({quarter:q,
    observationDate:i===4&&j<2?null:dates[j],
    value:i===4&&j<2?null:i+1+j}))})),
  providerRequests:0,pcSqliteWrites:0,d1Writes:0,scoreWrites:0,deployments:0});
 return {scored,raw,history};
}

test('producer emits only eligible complete Q3 observations without changing approved Q2 score',()=>{
 const sources=storedSources(),release=approvedRelease(sources);
 const result=buildAssetR10RawReadOnlyEvidence({...sources,release});
 assert.equal(result.providerRequests,0);
 assert.equal(result.pcSqliteWrites,0);
 assert.equal(result.d1Writes,0);
 assert.equal(result.scoreWrites,0);
 assert.equal(result.diagnosticScore,release.score);
 assert.equal(result.scoreObservationQuarter,Q2);
 assert.equal(result.factors.length,6);
 for(let i=0;i<6;i++){
  const f=result.factors[i],latest=f.latestObservation;
  assert.equal(f.score,release.indicators[i].score);
  assert.ok(f.observationDate<='2026-06-30','scored raw remains the Q2 observation');
  assert.equal(latest?.quarter,Q3,`${f.id} must have a complete Q3 observation`);
  assert.ok(latest.observationDate>='2026-07-01');
  assert.ok(latest.observationDate<='2026-09-30');
  assert.equal(latest.previousValue,f.value);
  assert.equal(latest.previousObservationDate,f.observationDate);
 }
 const raw=toAssetR10RawPayload(result);
 assert.equal(validateAssetR10Raw(raw,{now:NOW}),raw);
 assert.deepEqual(raw.factors.map(f=>f.latestObservation),
  result.factors.map(f=>f.latestObservation));
});

test('missing September M2 or unfinished September prices cannot be relabeled as completed Q3',()=>{
 const incomplete=storedSources();
 incomplete.macroSeries.M2SL=incomplete.macroSeries.M2SL
  .filter(r=>r.observationDate!=='2026-09-01');
 incomplete.sp500Rows=incomplete.sp500Rows
  .filter(r=>r.observationDate<'2026-09-01');
 const result=evidence(incomplete);
 assert.equal(result.factors.find(f=>f.id==='excessLiquidity').latestObservation,undefined);
 assert.equal(result.factors.find(f=>f.id==='priceAcceleration').latestObservation,undefined);
 assert.equal(result.factors.find(f=>f.id==='speculativeFlows').latestObservation,undefined);
 assert.equal(completedR10PriceQuarters(incomplete.sp500Rows,'2026-11-03').has(Q3),false);
 assert.equal(result.factors[0].latestObservation?.quarter,Q3,
  'independent completed valuation observation remains available');
});

test('future release metadata and incomplete breadth maturity are never treated as available Q3',()=>{
 const future=storedSources();
 future.macroSeries.M2SL.find(r=>r.observationDate==='2026-09-01').availableAt='2026-11-12';
 future.sp500Rows.find(r=>r.observationDate==='2026-09-30').releaseDate='2026-11-12';
 future.quality.rows.find(r=>r.observationDate==='2026-09-30').coverage=.97;
 const result=evidence(future);
 assert.equal(result.factors.find(f=>f.id==='excessLiquidity').latestObservation,undefined);
 assert.equal(result.factors.find(f=>f.id==='priceAcceleration').latestObservation,undefined);
 assert.equal(result.factors.find(f=>f.id==='breadthDivergence').latestObservation,undefined);
 assert.equal(result.factors.find(f=>f.id==='valuationPressure').latestObservation?.quarter,Q3);
});

test('optional latest stays backward-compatible but malformed dates, quarters and missing pairs fail closed',()=>{
 const {raw}=uiFixture();
 assert.equal(validateAssetR10Raw(raw,{now:NOW}),raw);
 const legacy=structuredClone(raw);
 for(const factor of legacy.factors)delete factor.latestObservation;
 assert.equal(validateAssetR10Raw(legacy,{now:NOW}),legacy);
 for(const change of [
  r=>{r.factors[0].latestObservation.quarter=Q2;},
  r=>{r.factors[0].latestObservation.quarter='2026-Q4';},
  r=>{r.factors[0].latestObservation.observationDate='2026-11-04';},
  r=>{r.factors[0].latestObservation.observationDate='2026-06-30';},
  r=>{r.factors[0].latestObservation.previousObservationDate='2025-10-01';},
  r=>{r.factors[0].latestObservation.previousValue=null;},
  r=>{r.factors[0].latestObservation.value=Number.NaN;},
 ]){
  const changed=structuredClone(raw);change(changed);
  assert.throws(()=>validateAssetR10Raw(changed,{now:NOW}),
   /ASSET_R10_RAW_INVALID/,`malformed latest value must be refused: ${change}`);
 }
});

test('latest UI overlay runs after history join, keeps scores and scored Q2 pair, advances chart endpoint',()=>{
 const {raw,scored,history}=uiFixture();
 const scoredOriginal=structuredClone(scored);
 const withRaw=mergeAssetR10RawForUi(scored,raw);
 const withHistory=mergeAssetR10HistoryForUi(withRaw,history);
 assert.notEqual(withHistory,withRaw);
 assert.deepEqual(withHistory.indicators.map(r=>r.trend.length),[5,5,5,5,3,5]);
 const displayed=mergeAssetR10LatestForUi(withHistory,raw);
 assert.equal(displayed.score,scored.score);
 assert.deepEqual(displayed.indicators.map(r=>r.score),scored.indicators.map(r=>r.score));
 assert.deepEqual(displayed.indicators.map(r=>r.weight),scored.indicators.map(r=>r.weight));
 assert.deepEqual(scored,scoredOriginal,'overlay must not mutate scored source');
 for(let i=0;i<6;i++){
  const row=displayed.indicators[i],orig=withHistory.indicators[i],latest=raw.factors[i].latestObservation;
  assert.equal(row.value,orig.value,'underlying scored quarter raw value stays Q2');
  assert.equal(row.previousValue,orig.previousValue);
  assert.deepEqual(row.latestObservation,latest);
  assert.deepEqual(row.trend.at(-1),{date:latest.observationDate,value:latest.value});
  assert.equal(row.trend.at(-2).value,latest.previousValue);
  assert.equal(row.trend.at(-2).date,latest.previousObservationDate);
  assert.equal(row.trend.length,i===4?4:5,'latest 1-year window retains at most five quarters');
 }
 assert.equal(displayed.indicators[0].trend[0].date,'2025-07-01',
  'full five-quarter trend drops oldest 2025-Q2 when Q3 joins');
 assert.equal(displayed.indicators[4].trend[0].date,'2025-10-01',
  'partial breadth trend keeps its genuine 2025-Q4 first observation');
 const wrong=structuredClone(raw);wrong.sourceVersion='different-lineage';
 assert.equal(mergeAssetR10LatestForUi(withHistory,wrong),withHistory);
});

test('same checkpoint cannot add latest observation to an already stored legacy payload',async()=>{
 const {raw}=uiFixture();
 const previous=structuredClone(raw);
 for(const factor of previous.factors)delete factor.latestObservation;
 const body=JSON.stringify({payload:previous,projection:{status:'READY',
  sourceVersion:previous.sourceVersion,sourceStoredAt:previous.sourceStoredAt,
  builtAt:NOW-1000}});
 let writes=0;
 const db={prepare(sql){return {bind(...params){return {
  async first(){return {body,stored_at:NOW-1000};},
  async run(){writes++;throw Error('UNEXPECTED_D1_WRITE');},
 };}};}};
 await assert.rejects(assetR10RawWriter(db).write(raw,{storedAt:NOW-1000}),
  /ASSET_R10_RAW_CONFLICTING_CONTENT/);
 assert.equal(writes,0,'writer must stop before UPDATE at same checkpoint');
});
