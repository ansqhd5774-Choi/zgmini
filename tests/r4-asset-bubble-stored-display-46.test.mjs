import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assetBubbleVerifiedDisplayScore,assetBubbleVerifiedDisplayTrend} from '../lib/asset-bubble-stored-display-r4.mjs';
const panel=readFileSync(new URL('../app/asset-bubble/asset-bubble-panel.tsx',import.meta.url),'utf8');
const ids=['valuationPressure','priceAcceleration','riskAssetShare',
 'speculativeFlows','breadthDivergence','excessLiquidity'];
const weights=[.30,.20,.15,.10,.15,.10];
const base=()=>({status:'READY',score:40,asOfDate:'2026-11-17',
 methodologyVersion:'ASSET_BUBBLE_R10_CANDIDATE',historyMode:'CURRENT_VINTAGE_ONLY',
 rightsStatus:'USER_ACCEPTED_UNVERIFIED',
 publicationPolicy:'USER_APPROVED_CURRENT_VINTAGE_UNVERIFIED_SOURCES',
 priceQuality:'PROVIDER_DECLARED_WITH_QUARANTINE',lookAheadSafe:false,productionEligible:true,
 sourceVersion:'macro:approved-valid-source-v1',sourceStoredAt:Date.parse('2026-11-16T23:00:00Z'),
 scoreObservationQuarter:'2026-Q2',diagnosticQuarter:'2026-Q4',
 notes:['Current vintage only','Price adjustment independently unverified'],
 indicators:ids.map((id,i)=>({id,status:'READY',score:40,weight:weights[i]})),
 trend:[{label:'2026-03-31',quarter:'2026-Q1',value:45},
        {label:'2026-06-30',quarter:'2026-Q2',value:40}]});
const r9=()=>({status:'READY',score:54,asOfDate:'2026-10-21',
 methodologyVersion:'ASSET_BUBBLE_R9',historyMode:'CURRENT_VINTAGE_DERIVED_1Y',lookAheadSafe:false,
 trend:[{label:'2026-09-30',value:52},{label:'2026-10-21',value:54}]});

test('approved R10 with all six matched factors displays the completed quarter and actual trend',()=>{
 const p=base();
 assert.equal(assetBubbleVerifiedDisplayScore(p),40);
 assert.deepEqual(assetBubbleVerifiedDisplayTrend(p,40),p.trend);
});
test('zero is a valid scored result, never converted into missing or synthetic average',()=>{
 const p=base();p.score=0;p.indicators.forEach(x=>x.score=0);p.trend.at(-1).value=0;
 assert.equal(assetBubbleVerifiedDisplayScore(p),0);
 assert.equal(assetBubbleVerifiedDisplayTrend(p,0).at(-1).value,0);
});
test('unapproved rights, eligibility or publication policy cannot be shown as R10 READY',()=>{
 for(const mutation of [
  {rightsStatus:'RIGHTS_PENDING'},{rightsStatus:null},
  {publicationPolicy:'CANDIDATE_ONLY'},{publicationPolicy:null},
  {productionEligible:false},{priceQuality:'UNVERIFIED_SOURCE'},
  {historyMode:'POINT_IN_TIME_VERIFIED'},{lookAheadSafe:true},
  {sourceVersion:null},{sourceStoredAt:0},{notes:[]},
 ]){
  const p={...base(),...mutation};
  assert.equal(assetBubbleVerifiedDisplayScore(p),null,JSON.stringify(mutation));
  assert.deepEqual(assetBubbleVerifiedDisplayTrend(p,40),[]);
 }
});
test('PARTIAL and unknown model cannot impersonate approved R9/R10',()=>{
 for(const mutation of [{status:'PARTIAL'},{status:'STALE'},
  {methodologyVersion:'ASSET_BUBBLE_R11'},{methodologyVersion:'ASSET_BUBBLE_R9'}])
  assert.equal(assetBubbleVerifiedDisplayScore({...base(),...mutation}),null);
});
test('R9 remains independent with its older approved method, without R10 candidate metadata',()=>{
 const p=r9();assert.equal(assetBubbleVerifiedDisplayScore(p),54);
 assert.deepEqual(assetBubbleVerifiedDisplayTrend(p,54),p.trend);
 assert.equal(assetBubbleVerifiedDisplayScore({...p,historyMode:'CURRENT_VINTAGE_ONLY'}),null);
});
test('different factor count, weights, status or total never passes the approved R10 proof',()=>{
 for(const modify of [
  p=>p.indicators.pop(),
  p=>p.indicators[0].status='PARTIAL',
  p=>p.indicators[0].score=99,
  p=>p.indicators[0].weight=.35,
  p=>p.indicators[0].id='priceAcceleration',
  p=>p.score=101,
  p=>p.score=39,
 ]){
  const p=base();modify(p);
  assert.equal(assetBubbleVerifiedDisplayScore(p),null);
 }
});
test('future, fabricated or mismatched quarter cannot replace the saved last complete R10 quarter',()=>{
 for(const mutation of [
  {scoreObservationQuarter:'2026-Q4'},
  {diagnosticQuarter:'2026-Q1'},{asOfDate:'2026-02-30'},
  {asOfDate:'2026-04-21'},
 ]){
  assert.equal(assetBubbleVerifiedDisplayScore({...base(),...mutation}),null,JSON.stringify(mutation));
 }
 const p=base();p.trend.push({label:'2026-09-30',quarter:'2026-Q3',value:70});
 assert.deepEqual(assetBubbleVerifiedDisplayTrend(p,40),[]);
 const lagged=base();lagged.scoreObservationQuarter='2026-Q3';
 assert.equal(assetBubbleVerifiedDisplayScore(lagged),40,'verified scored projection may advance before its chart history');
 assert.deepEqual(assetBubbleVerifiedDisplayTrend(lagged,40),[],'an older R10 quarter must not be relabelled as the newer scored quarter');
});
test('same-date conflicting score or missing latest quarter clears the graph, not the approved headline',()=>{
 const conflict=base();conflict.trend.push({label:'2026-06-30',quarter:'2026-Q2',value:50});
 assert.equal(assetBubbleVerifiedDisplayScore(conflict),40);
 assert.deepEqual(assetBubbleVerifiedDisplayTrend(conflict,40),[]);
 const missing=base();missing.trend=missing.trend.slice(0,1);
 assert.deepEqual(assetBubbleVerifiedDisplayTrend(missing,40),[]);
});
test('invalid/future/misdated prior points omitted, identical duplicates collapse, true history is sorted',()=>{
 const p=base();p.trend=[
  {label:'2026-12-31',quarter:'2026-Q4',value:10},
  {label:'2026-02-30',quarter:'2026-Q1',value:21},
  {label:'2026-05-01',quarter:'2026-Q2',value:90},
  ...p.trend.slice().reverse(),
  p.trend[1],
 ];
 assert.deepEqual(assetBubbleVerifiedDisplayTrend(p,40),base().trend);
});
test('null/NaN/future or out-of-range values never become scored 0',()=>{
 for(const value of [null,undefined,'40',NaN,Infinity,-1,101]){
  const p={...base(),score:value};
  assert.equal(assetBubbleVerifiedDisplayScore(p),null);
 }
 const p=base();p.trend[0].value=NaN;
 assert.deepEqual(assetBubbleVerifiedDisplayTrend(p,40),[base().trend[1]]);
});
test('actual panel uses approved display gate; saved source raw/history join remains unchanged',()=>{
 assert.match(panel,/assetBubbleVerifiedDisplayScore\(payload\)/);
 assert.match(panel,/assetBubbleVerifiedDisplayTrend\(payload,score\)/);
 assert.match(panel,/score===null\?\{\.\.\.item,value:null\}:item/);
 assert.match(panel,/mergeAssetR10HistoryForUi\(mergeAssetR10RawForUi\(payload,raw\),history\)/);
 assert.match(panel,/MarketFearGreedChart showExtrema data=\{trend\}/);
});
