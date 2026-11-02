import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {rankR43Issuers,r43ImportanceIndex} from '../lib/market-calendar-r43-issuer-rank.mjs';
import {earningsDisplaySnapshot,earningsDisplayHtml,earningsDisplayResponse} from '../lib/earnings-api-display.mjs';
import {validateFhsAnnualSnapshot} from '../lib/market-calendar-fhs-r3-public.mjs';

const asOf='2026-10-30', day='2026-10-31', now=Date.parse('2026-10-31T12:00:00Z');
const dates=Array.from({length:14},(_,i)=>
 new Date(Date.parse(day+'T00:00:00Z')+i*86400000).toISOString().slice(0,10));
const rows=Array.from({length:2634},(_,i)=>({ticker:`T${i}`,eligible:true,
 tradeDate:asOf,price:100+i,volume:1000+i*10,relativeVolume:1+i/1000,
 dividendYield:i%5,eps:i/10,dailyChangePct:i%7,epsGrowthPct:i%40}));
const event=(ticker,priority=false)=>({ticker,company:ticker,date:day,
 marketSession:'after_market',priority,time:null,verification:'VENDOR_UNVERIFIED',source:'earnings-api'});
const projection=events=>({status:'READY_PRIVATE',scope:'PC_PRIVATE',publicDisplay:false,
 redistribution:false,publicationStatus:'HELD_UNCONFIRMED',coveredDays:dates,
 checkedAt:'2026-10-31T10:00:00Z',recordCount:events.length,
 priorityCount:events.filter(x=>x.priority).length,events});

test('ER1 replaces old annual FHS and R42 fallback, including the importance filter',async()=>{
 const ranked=rankR43Issuers(rows,{asOf});
 assert.equal(ranked.topCount,132);
 const index=r43ImportanceIndex(ranked,{now});
 assert.ok(index);
 const display=earningsDisplaySnapshot(projection([event('NVDA',true),event('ABBV'),event('ARM'),event('ZM')]),
  {importanceIndex:index}); // Historical integration argument must have no effect.
 assert.equal(Object.hasOwn(display,'impactModel'),false);
 assert.equal(earningsDisplayHtml(display,{start:day,end:day,importance:3}).count,0);

 const annual=validateFhsAnnualSnapshot({status:'READY_R3_PROVISIONAL',version:'ZGMINI-FHS-R3',
  asOf:day,sourceStoredAt:1793332803791,recordCount:2,grades:{NVDA:[1,31],ABBV:[3,90]}});
 const result=earningsDisplayResponse(display,
  `https://zgmini.kr/api/earnings-calendar-display?start=${day}&end=${day}&importance=3`,annual);
 assert.equal(result.status,200);
 const html=await result.text();
 assert.equal(html,'');
 assert.doesNotMatch(html,/NVDA/);
 assert.doesNotMatch(html,/ARM/);
});

test('PC cached display publisher has no path to an old R43-ranked disk file',()=>{
 const source=fs.readFileSync(new URL('../scripts/pc-writer/earnings-api-local.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/local-market-calendar-r43-ranked\.json|readR43LocalImportance|r43ImportanceIndex|importanceIndex/);
 assert.match(source,/earningsDisplaySnapshot\(projection\)/);
});
