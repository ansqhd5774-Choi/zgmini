import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {attachStoredDomainScoreComparisons} from '../scripts/pc-writer/market-snapshot-comparisons.mjs';

const domain=(id,score,method='R1')=>({id,source:'APPROVED_STORED_SCORE',methodologyVersion:method,status:'READY',score});
const snapshot=(date,domains)=>({date,body:{status:'SUCCESS',domains}});
const body=()=>({status:'SUCCESS',asOfDate:'2026-10-20',domains:[domain('employment',41.1),domain('credit',53.6)]});

test('12-market hero uses dashboard bands; legacy risk/CNN gauges are unchanged',()=>{
 const orb=readFileSync('app/market-score-orb.tsx','utf8');
 const panel=readFileSync('app/economic-indicators/economic-detail-panel.tsx','utf8');
 assert.ok(orb.includes('marketScoreBands = false'));
 assert.ok(orb.includes('marketScoreBands?: boolean'));
 assert.ok(orb.includes('marketScoreBands ? MARKET_SCORE_GAUGE_BANDS : CNN_GAUGE_BANDS'));
 assert.ok(orb.includes('[0, 25, 40, 50, 60, 75, 100]'));
 assert.ok(panel.includes('comparisonAriaLabel={config.name+" 시장 우호점수 기간별 변화"} marketScoreBands={id!=="inflation"}'));
 for(const color of ['#ef4444','#f59e0b','#94a3b8','#22c55e','#10b981'])assert.ok(orb.includes("color: '"+color+"'"));
});

test('existing saved published domain scores provide truthful period deltas only',()=>{
 const current=body();
 attachStoredDomainScoreComparisons(current,[
  snapshot('2025-10-20',[domain('employment',32.1),domain('credit',61.1)]),
  snapshot('2026-04-23',[domain('employment',40.1),domain('credit',56.1)]),
  snapshot('2026-07-22',[domain('employment',30.1),domain('credit',54.1)]),
  snapshot('2026-09-20',[domain('employment',38.1),domain('credit',52.1)]),
  snapshot('2026-10-13',[domain('employment',39.1),domain('credit',54.1)]),
 ]);
 assert.deepEqual(current.domains[0].scoreComparisons,{week:2,month:3,threeMonth:11,sixMonth:1,year:9});
 assert.deepEqual(current.domains[1].scoreComparisons,{week:-0.5,month:1.5,threeMonth:-0.5,sixMonth:-2.5,year:-7.5});
});

test('no guessed values when date is insufficient, score missing, or method changed',()=>{
 const current=body();
 current.domains.push({...domain('partial',null),status:'PARTIAL'});
 attachStoredDomainScoreComparisons(current,[
  snapshot('2026-09-20',[domain('employment',10,'R0'),domain('credit',49)]),
  snapshot('2026-10-13',[domain('employment',39,'R0'),{...domain('credit',0),status:'PARTIAL'}]),
  snapshot('2026-10-21',[domain('employment',100),domain('credit',100)]),
 ]);
 assert.deepEqual(current.domains[0].scoreComparisons,{week:null,month:null,threeMonth:null,sixMonth:null,year:null});
 assert.deepEqual(current.domains[1].scoreComparisons,{week:null,month:4.6,threeMonth:null,sixMonth:null,year:null});
 assert.equal(current.domains[2].scoreComparisons,undefined);
});

test('existing explicit producer deltas are not overwritten by stored-history fallback',()=>{
 const current=body();
 current.domains[0].scoreComparisons={week:0,month:1};
 attachStoredDomainScoreComparisons(current,[snapshot('2026-10-13',[domain('employment',30)])]);
 assert.equal(current.domains[0].scoreComparisons.week,0);
 assert.equal(current.domains[0].scoreComparisons.month,1);
 assert.equal(current.domains[0].scoreComparisons.threeMonth,null);
});

test('real PC contract: source is absent but explicit matching method can still compare',()=>{
 const current={status:'SUCCESS',asOfDate:'2026-10-20',domains:[
  {id:'rates',status:'READY',score:15.4,methodologyVersion:'RATE_R3'},
  {id:'credit',status:'READY',score:70.1,methodologyVersion:'CREDIT_R2_NFCI_4FACTOR_R1'},
  {id:'liquidity',status:'READY',score:51.2},
 ]};
 attachStoredDomainScoreComparisons(current,[
  snapshot('2026-10-13',[
   {id:'rates',status:'READY',score:14.2,methodologyVersion:'RATE_R3'},
   {id:'credit',status:'READY',score:66.1,methodologyVersion:'CREDIT_R2_NFCI_4FACTOR_R1'},
   {id:'liquidity',status:'READY',score:42.3},
  ]),
 ]);
 assert.equal(current.domains[0].scoreComparisons.week,1.2);
 assert.equal(current.domains[1].scoreComparisons.week,4);
 assert.equal(current.domains[2].scoreComparisons,undefined,'unversioned snapshots cannot prove model identity');
});

test('absent source is not equated with a present source, nor with different methodology',()=>{
 const current={status:'SUCCESS',asOfDate:'2026-10-20',domains:[
  {id:'employment',status:'READY',score:41,methodologyVersion:'EMPLOYMENT_R54'},
 ]};
 attachStoredDomainScoreComparisons(current,[
  snapshot('2026-09-20',[{id:'employment',status:'READY',score:20,methodologyVersion:'EMPLOYMENT_R54',source:'NEW_SOURCE'}]),
  snapshot('2026-10-13',[{id:'employment',status:'READY',score:30,methodologyVersion:'EMPLOYMENT_R53'}]),
 ]);
 assert.deepEqual(current.domains[0].scoreComparisons,{week:null,month:null,threeMonth:null,sixMonth:null,year:null});
});

test('20 days of real snapshots cannot manufacture month, quarter, half-year or year',()=>{
 const current={status:'SUCCESS',asOfDate:'2026-10-20',domains:[
  {id:'inflation',status:'READY',score:61,methodologyVersion:'INFLATION_R2_R29_56'},
 ]};
 attachStoredDomainScoreComparisons(current,[
  snapshot('2026-09-30',[{id:'inflation',status:'READY',score:54,methodologyVersion:'INFLATION_R2_R29_56'}]),
  snapshot('2026-10-13',[{id:'inflation',status:'READY',score:60,methodologyVersion:'INFLATION_R2_R29_56'}]),
 ]);
 assert.deepEqual(current.domains[0].scoreComparisons,{week:1,month:null,threeMonth:null,sixMonth:null,year:null});
});

test('PC read-only history is reused before local persistence; no new provider, D1 or schema path',()=>{
 const source=readFileSync('scripts/pc-writer/run-local.mjs','utf8');
 assert.match(source,/const storedHistory=await marketOperationalStore\(core\)\.readScoreHistory/);
 assert.match(source,/attachStoredDomainScoreComparisons\(body,storedHistory\)/);
 assert.ok(source.indexOf('attachStoredDomainScoreComparisons(body,storedHistory)')<source.indexOf('await marketOperationalStore(core).writeScore(body,now)'));
});
