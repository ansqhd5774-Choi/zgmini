import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreDecemberSaved,syncDecemberER1D1} from '../scripts/pc-writer/market-calendar-dec31-er1-score-publish.mjs';
import {DecemberEventsFromSaved,buildDecemberDisplay} from '../scripts/pc-writer/market-calendar-dec31-publish.mjs';
import {earningsDisplayHtml} from '../lib/earnings-api-display.mjs';
import {DEC2026_ER1_PUBLIC_KEY} from '../lib/market-calendar-dec2026-display.mjs';

const dates={
 '01':'BOX CRWD ASAN OKTA GTLB NTAP','02':'DLTR PATH',
 '03':'ULTA KR DG DOCU COO HPE','07':'MDB','08':'GME',
 '09':'ADBE AVGO CHWY','10':'COST LULU RH CIEN',
 '14':'ORCL','15':'LEN','17':'FDS CTAS DRI FCEL ACN KMX NKE',
 '18':'PAYX LW CAG CCL','23':'GIS MU'
};
const dec=new Map(Object.entries(dates).flatMap(([day,v])=>
 v.split(' ').map(ticker=>[ticker,'2026-12-'+day])));
const ordered=[...dec.keys()].sort();
function saved(_,symbol){
 const idx=ordered.indexOf(symbol);
 const past=['2026-09-01','2026-06-01','2026-03-01','2025-12-01',
  '2025-09-01','2025-06-01','2025-03-01','2024-12-01'];
 return {storedAt:'2026-11-03T18:50:00Z',body:[
  ...(dec.has(symbol)?[{symbol,date:dec.get(symbol),name:symbol+' Inc.',
   eps:null,revenue:null,epsEstimate:5000,revenueEstimate:999000000000}]:[]),
  ...past.map(date=>({symbol,date,name:symbol+' Inc.',eps:1,
   revenue:1000000*(idx+2),epsEstimate:1234,revenueEstimate:999000000000}))]};
}

test('unchanged ER1 formula scores 38 saved observed issuers from historical actuals only',()=>{
 const result=scoreDecemberSaved(saved,{asOf:'2026-11-03'});
 assert.equal(result.observed,38);
 assert.equal(result.scoreable,38);
 assert.equal(result.star3Count,2);
 assert.equal(result.publicDisplay.coverage.observedIssuers,38);
 assert.equal(result.publicDisplay.coverage.scoreableIssuers,38);
 assert.equal(result.publicDisplay.scores.length,38);
 assert.equal(JSON.stringify(result.publicDisplay).includes('999000000000'),false);
 assert.equal(Object.keys(result.publicDisplay.scores[0]).join(','),'issuerId,tickers,score');
 const html=buildDecemberDisplay(DecemberEventsFromSaved(saved).events,'2026-11-03T20:00:00Z');
 const plain=earningsDisplayHtml(html,{start:'2026-12-01',end:'2026-12-31'});
 assert.equal(plain.count,38);
 assert.equal((plain.html.match(/기업 실적 점수 없음/g)||[]).length,38);
 const displayed=earningsDisplayHtml(html,{start:'2026-12-01',end:'2026-12-31'},null,
  result.publicDisplay);
 assert.equal(displayed.count,38);
 assert.equal((displayed.html.match(/기업 실적 점수 없음/g)||[]).length,0);
 assert.equal((displayed.html.match(/>★★★<\/div>/g)||[]).length,2);
 assert.equal(earningsDisplayHtml(html,{start:'2026-12-01',end:'2026-12-31',importance:3},
  null,result.publicDisplay).count,2);
});

test('unreported actuals remain unscored, no estimate fallback or retroactive grade',()=>{
 const omitted=(_,symbol)=>{
  const sample=saved(_,symbol);
  if(symbol==='ORCL')sample.body=sample.body.map(row=>({...row,eps:null,revenue:null}));
  return sample;
 };
 const result=scoreDecemberSaved(omitted,{asOf:'2026-11-03'});
 assert.equal(result.scoreable,37);
 assert.equal(result.unscoreable.ER1_METRIC_OBSERVATIONS_INSUFFICIENT,1);
 assert.equal(result.publicDisplay.scores.some(row=>row.tickers.includes('ORCL')),false);
 assert.throws(()=>scoreDecemberSaved((folder,symbol)=>{
  const sample=saved(folder,symbol);
  if(symbol==='BOX')delete sample.body[1].eps;
  return sample;
 },{asOf:'2026-11-03'}),/DEC31_ER1_ACTUAL_SOURCE_FIELD_INVALID/);
});

test('derived-only D1 writes dedicated key once and verifies readback',async()=>{
 let value=null;const writes=[];
 const remote={
  async query(_core,_sql,[key]){
   assert.equal(key,DEC2026_ER1_PUBLIC_KEY);
   return {results:value?[value]:[]};
  },
  async request(_core,[operation]){
   const [key,body,storedAt]=operation.params;
   writes.push(key);value={body,stored_at:storedAt};
  }
 };
 const body=JSON.stringify(scoreDecemberSaved(saved,{asOf:'2026-11-03'}).publicDisplay);
 const result=await syncDecemberER1D1({remote,core:'test',body,storedAt:12345});
 const repeat=await syncDecemberER1D1({remote,core:'test',body,storedAt:12346});
 assert.equal(result.code,'DEC31_ER1_D1_VERIFIED');
 assert.equal(repeat.code,'DEC31_ER1_D1_ALREADY_MATCHED');
 assert.deepEqual(writes,[DEC2026_ER1_PUBLIC_KEY]);
});
