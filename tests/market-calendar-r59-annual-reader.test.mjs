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
test('old annual FHS object cannot give earnings stars or qualify for the three-star filter',async()=>{
 const res=earningsDisplayResponse(snapshot,url+'&importance=3',annual),html=await res.text();
 assert.equal(res.status,200);
 assert.equal(res.headers.get('x-display-count'),'0');
 assert.equal(res.headers.get('x-zgmini-earnings-grade-reader'),'ZGMINI-ER1-97');
 assert.equal(html,'');
 assert.doesNotMatch(html,/NVDA/);
});
test('annual-graded and ungraded issuers all show hyphen before ER1 score publication',async()=>{
 const res=earningsDisplayResponse(snapshot,url,annual),html=await res.text();
 assert.equal(res.status,200);
 assert.equal(res.headers.get('x-display-count'),'3');
 assert.equal((html.match(/aria-label="기업 실적 점수 없음">-<\/div>/g)??[]).length,3);
 assert.doesNotMatch(html,/★/);
});
test('absence of ER1 score does not restore old core company three stars',async()=>{
 const res=earningsDisplayResponse(snapshot,url+'&importance=3'),html=await res.text();
 assert.equal(res.status,200);
 assert.equal(res.headers.get('x-display-count'),'0');
 assert.doesNotMatch(html,/NVDA/);
 assert.doesNotMatch(html,/ABBV/);
 assert.equal(res.headers.get('x-zgmini-earnings-grade-reader'),'ZGMINI-ER1-97');
});
