import test from 'node:test';
import assert from 'node:assert/strict';
import {DecemberEventsFromSaved,buildDecemberDisplay,syncDecemberD1} from '../scripts/pc-writer/market-calendar-dec31-publish.mjs';
import {withDec2026Display,validDec2026Display} from '../lib/market-calendar-dec2026-display.mjs';
import {earningsDisplayHtml,earningsDisplayResponse} from '../lib/earnings-api-display.mjs';

const groups={
 '01':'BOX CRWD ASAN OKTA GTLB NTAP',
 '02':'DLTR PATH','03':'ULTA KR DG DOCU COO HPE',
 '07':'MDB','08':'GME','09':'ADBE AVGO CHWY',
 '10':'COST LULU RH CIEN','14':'ORCL','15':'LEN',
 '17':'FDS CTAS DRI FCEL ACN KMX NKE',
 '18':'PAYX LW CAG CCL','23':'GIS MU'
};
const lookup=new Map(Object.entries(groups).flatMap(([d,tickers])=>
 tickers.split(' ').map(symbol=>[symbol,'2026-12-'+d])));

test('38 PC-only vendor rows become 31-day sanitized HTML without estimates',()=>{
 const saved=(_,symbol)=>({storedAt:'2026-11-03T18:00:00Z',body:[
  {date:'2026-07-01',symbol,name:symbol+' Corporation',eps:1.5,revenue:123},
  ...(lookup.has(symbol)?[{date:lookup.get(symbol),symbol,name:null,
   time:'time-after-hours',eps:null,revenue:null,epsEstimate:77,revenueEstimate:999999}]:[])]});
 const {events}=DecemberEventsFromSaved(saved);
 assert.equal(events.length,38);
 assert.equal(events.find(x=>x.ticker==='ORCL').company,'ORCL Corporation');
 const snapshot=buildDecemberDisplay(events,'2026-11-04T03:00:00Z');
 assert.equal(validDec2026Display(snapshot),true);
 assert.equal(snapshot.coveredDays.length,31);
 const body=JSON.stringify(snapshot);
 assert.equal(body.includes('999999'),false);
 assert.equal(body.includes('epsEstimate'),false);
 const html=earningsDisplayHtml(snapshot,{start:'2026-12-01',end:'2026-12-31'});
 assert.equal(html.count,38);
 assert.equal(html.html.includes('예정 · 미확정'),true);
 assert.equal(html.html.includes('★★★'),false);
 const merged=withDec2026Display({status:'READY_DISPLAY',mode:'OWN_SITE_HTML_ONLY',
  rawVendorJsonExposed:false,publicJsonFeed:false,redistribution:false,
  coveredDays:['2026-11-30','2026-12-01'],byDay:{'2026-11-30':[],'2026-12-01':[]}},snapshot);
 assert.equal(earningsDisplayHtml(merged,{start:'2026-11-30',end:'2026-12-06'}).count,14);
 const response=earningsDisplayResponse(merged,'https://zgmini.kr/api/earnings-calendar-display?start=2026-12-01&end=2026-12-31');
 assert.equal(response.status,200);
 assert.equal(response.headers.get('x-display-count'),'38');
});

test('D1 publisher writes one isolated key and verifies remote readback',async()=>{
 const state=new Map(),writes=[];
 const remote={
  async query(_core,_sql,[key]){return {results:state.has(key)?[state.get(key)]:[]}},
  async request(_core,[operation]){
   const [key,body,storedAt]=operation.params;
   writes.push(key);state.set(key,{body,stored_at:storedAt});
  }
 };
 const body='{ "status":"READY_DISPLAY" }';
 const a=await syncDecemberD1({remote,core:'test',body,storedAt:12345});
 const b=await syncDecemberD1({remote,core:'test',body,storedAt:12346});
 assert.equal(a.decision,'DEC31_PUBLISH_D1_VERIFIED');
 assert.equal(b.decision,'DEC31_PUBLISH_D1_ALREADY_MATCHED');
 assert.deepEqual(writes,['market-calendar:earnings-dec2026-display-html']);
});
