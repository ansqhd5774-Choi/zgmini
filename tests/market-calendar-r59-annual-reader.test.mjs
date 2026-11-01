import test from 'node:test';
import assert from 'node:assert/strict';
import {earningsDisplaySnapshot,earningsDisplayResponse} from '../lib/earnings-api-display.mjs';
import {validateFhsAnnualSnapshot} from '../lib/market-calendar-fhs-r3-public.mjs';

const start='2026-10-31';
const coveredDays=Array.from({length:14},(_,i)=>new Date(Date.parse(start+'T00:00:00Z')+i*86400000).toISOString().slice(0,10));
const event=(ticker,priority=false)=>({ticker,company:ticker,date:start,marketSession:'after_market',time:null,priority,verification:'VENDOR_UNVERIFIED',source:'earnings-api'});
const snapshot=earningsDisplaySnapshot({status:'READY_PRIVATE',scope:'PC_PRIVATE',publicDisplay:false,redistribution:false,publicationStatus:'HELD_UNCONFIRMED',checkedAt:'2026-10-31T02:00:00Z',
 coveredDays,recordCount:3,priorityCount:1,events:[event('NVDA',true),event('ABBV'),event('ZM')]});
const annual=validateFhsAnnualSnapshot({status:'READY_R3_PROVISIONAL',version:'ZGMINI-FHS-R3',asOf:start,sourceStoredAt:1793332803791,recordCount:2,grades:{NVDA:[1,31],ABBV:[3,90]}});
const url='https://zgmini.kr/api/earnings-calendar-display?start='+start+'&end='+start;
test('annual grades filter earnings rows and cannot be overridden by legacy core company',async()=>{
 const res=earningsDisplayResponse(snapshot,url+'&importance=3',annual),html=await res.text();
 assert.equal(res.status,200);
 assert.equal(res.headers.get('x-display-count'),'1');
 assert.equal(res.headers.get('x-zgmini-fhs-r3-reader'),'ZGMINI-FHS-R3');
 assert.match(html,/ABBV/);
 assert.match(html,/재무건전성 별 3개/);
 assert.doesNotMatch(html,/NVDA/);
});
test('annual ungraded rows remain visible without importance filter and show dash',async()=>{
 const res=earningsDisplayResponse(snapshot,url,annual),html=await res.text();
 assert.equal(res.status,200);
 assert.equal(res.headers.get('x-display-count'),'3');
 assert.match(html,/재무건전성 미평가/);
 assert.match(html,/>—<\/div>/);
});
test('absence of annual snapshot preserves original public importance results and reader proof',async()=>{
 const res=earningsDisplayResponse(snapshot,url+'&importance=3'),html=await res.text();
 assert.equal(res.status,200);
 assert.equal(res.headers.get('x-display-count'),'1');
 assert.match(html,/NVDA/);
 assert.doesNotMatch(html,/ABBV/);
 assert.equal(res.headers.get('x-zgmini-fhs-r3-reader'),'ZGMINI-FHS-R3');
});
