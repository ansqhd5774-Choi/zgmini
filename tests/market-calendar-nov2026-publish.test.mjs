import test from 'node:test';
import assert from 'node:assert/strict';
import {novemberEventsFromSaved,buildNovemberDisplay,buildImmutableNovemberBody,syncNovemberD1} from '../scripts/pc-writer/market-calendar-nov30-publish.mjs';
import {NOV2026_EARNINGS_HTML_KEY,validNov2026Display,withNov2026Display} from '../lib/market-calendar-nov2026-display.mjs';
import {earningsDisplayHtml,earningsDisplayResponse,earningsDisplaySnapshot} from '../lib/earnings-api-display.mjs';
import {withDec2026Display} from '../lib/market-calendar-dec2026-display.mjs';
import {buildDecemberDisplay} from '../scripts/pc-writer/market-calendar-dec31-publish.mjs';

const DAYS=Array.from({length:30},(_,i)=>`2026-11-${String(i+1).padStart(2,'0')}`);
const storedAt=new Date().toISOString();
const rows=Array.from({length:3051},(_,i)=>({symbol:'N'+i.toString(36).toUpperCase(),
 name:`November Company ${i}`,eps:1000+i,revenue:1000000+i,
 epsEstimate:99999,revenueEstimate:999999999}));
const perDay=Object.fromEntries(DAYS.map((day,i)=>[day,{
 date:day,pre:rows.filter((_,index)=>index%30===i),after:[],notSupplied:[]}]));

function load(){
 const core=new Set(DAYS.slice(0,16)),called=[];
 const result=novemberEventsFromSaved({
  core:day=>{called.push(day);return core.has(day)?{storedAt,body:perDay[day]}:null},
  saved:day=>core.has(day)?null:{storedAt,body:perDay[day]}});
 return {result,called};
}

test('reconstructs all 30 days from 16 Core and 14 immutable private days; 3051 rows',()=>{
 const {result}=load();
 assert.equal(result.coreDays,16);
 assert.equal(result.privateDays,14);
 assert.equal(result.events.length,3051);
 assert.equal(result.events[0].marketSession,'before_market');
 assert.equal(result.events[0].verification,'VENDOR_UNVERIFIED');
 assert.throws(()=>novemberEventsFromSaved({core:()=>null,saved:day=>
  day==='2026-11-30'?null:{storedAt,body:perDay[day]}}),/NOV30_PUBLISH_SAVED_DAY_MISSING_STOP/);
});

test('3051 vendor rows produce exactly November 30 HTML-only days without estimates or raw EPS',()=>{
 const {result}=load();
 const snapshot=buildNovemberDisplay(result.events,storedAt);
 assert.equal(validNov2026Display(snapshot),true);
 assert.equal(snapshot.coveredDays.length,30);
 assert.equal(snapshot.recordCount,3051);
 assert.equal(snapshot.coveredDays.at(-1),'2026-11-30');
 assert.equal(JSON.stringify(snapshot).includes('epsEstimate'),false);
 assert.equal(JSON.stringify(snapshot).includes('999999999'),false);
 assert.equal(JSON.stringify(snapshot).includes('1000000'),false);
 const html=earningsDisplayHtml(snapshot,{start:'2026-11-01',end:'2026-11-30'});
 assert.equal(html.count,3051);
 assert.equal(html.html.includes('★★★'),false);
 const response=earningsDisplayResponse(snapshot,
  'https://zgmini.kr/api/earnings-calendar-display?start=2026-11-01&end=2026-11-30');
 assert.equal(response.status,200);
 assert.equal(response.headers.get('x-display-count'),'3051');
});

test('current rolling day wins same ticker, November saved days survive, December remains additive',()=>{
 const snapshot=buildNovemberDisplay(load().result.events,storedAt);
 const novel={date:'2026-11-04',ticker:'N3',company:'Live Current Winner',
  marketSession:'after_market',time:null,verification:'VENDOR_UNVERIFIED',source:'earnings-api'};
 const rolling=earningsDisplaySnapshot({status:'READY_PRIVATE',scope:'PC_PRIVATE',
  publicDisplay:false,redistribution:false,publicationStatus:'HELD_UNCONFIRMED',
  checkedAt:storedAt,coveredDays:DAYS.slice(3,17),recordCount:1,
  priorityCount:0,events:[novel]});
 const merged=withNov2026Display(rolling,snapshot);
 assert.equal(merged.coveredDays.length,30);
 assert.equal(earningsDisplayHtml(merged,{start:'2026-11-01',end:'2026-11-30'}).count,3051);
 const row=merged.byDay['2026-11-04'].find(x=>x.includes('n3 '));
 assert.match(row,/Live Current Winner/);
 assert.equal(merged.byDay['2026-11-01'].length>0,true);
 assert.equal(withNov2026Display(rolling,null),rolling);
 const december=buildDecemberDisplay([{date:'2026-12-03',ticker:'DEC',company:'December Inc',
  marketSession:'unknown',time:null,verification:'VENDOR_UNVERIFIED',source:'earnings-api'}],storedAt);
 const both=withDec2026Display(merged,december);
 assert.equal(both.coveredDays.length,61);
 assert.equal(earningsDisplayHtml(both,{start:'2026-11-01',end:'2026-12-31'}).count,3052);
});

test('D1 isolated November one-key upsert and remote exact readback; idempotent',async()=>{
 const stored=new Map(),written=[];
 const remote={
  async query(_core,_sql,[key]){return {results:stored.has(key)?[stored.get(key)]:[]}},
  async request(_core,[op]){
   const [key,body,stamp]=op.params;written.push(key);
   stored.set(key,{body,stored_at:stamp});
  }
 };
 const body=JSON.stringify(buildNovemberDisplay(load().result.events,storedAt));
 const first=await syncNovemberD1({remote,core:'test',body,storedAt:123});
 const second=await syncNovemberD1({remote,core:'test',body,storedAt:124});
 assert.equal(first.decision,'NOV30_PUBLISH_D1_VERIFIED');
 assert.equal(second.decision,'NOV30_PUBLISH_D1_ALREADY_MATCHED');
 assert.deepEqual(written,[NOV2026_EARNINGS_HTML_KEY]);
 assert.equal(typeof stored.get(NOV2026_EARNINGS_HTML_KEY).stored_at,'number');
 assert.equal(stored.get(NOV2026_EARNINGS_HTML_KEY).stored_at,123);
 await assert.rejects(()=>syncNovemberD1({remote,core:'test',body:'changed',storedAt:122}),
  /NOV30_PUBLISH_D1_NEWER_PRESERVED_STOP/);
 await assert.rejects(()=>syncNovemberD1({remote,core:'test',body:'changed',storedAt:'2026-11-04'}),
  /NOV30_PUBLISH_D1_TIMESTAMP_INVALID_STOP/);
});

test('local replay must match saved vendor-derived HTML byte for byte',()=>{
 const events=load().result.events;
 const original=buildImmutableNovemberBody(events,{checkedAt:storedAt});
 assert.equal(buildImmutableNovemberBody(events,{existingBody:original,checkedAt:'2030-01-01T00:00:00Z'}),original);
 const changed=events.map(e=>({...e}));
 changed[0].company='Unexpected source alteration';
 assert.throws(()=>buildImmutableNovemberBody(changed,{existingBody:original,checkedAt:storedAt}),
  /NOV30_PUBLISH_LOCAL_INPUT_DRIFT_STOP/);
 assert.throws(()=>buildImmutableNovemberBody(events,{existingBody:'{}',checkedAt:storedAt}),
  /NOV30_PUBLISH_EXISTING_LOCAL_INVALID_STOP/);
});
