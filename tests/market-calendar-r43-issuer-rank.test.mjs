import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {rankR43Issuers, r43ImportanceIndex, r43IssuerKey, R43_METHOD} from '../lib/market-calendar-r43-issuer-rank.mjs';
import {runR43Local} from '../scripts/pc-writer/market-calendar-r43-issuer-rank-cli.mjs';

const day='2026-10-30', now=Date.parse('2026-10-31T12:00:00Z');
const stock=(i, extra={})=>({ticker:`T${i}`, eligible:true, tradeDate:day,
  price:100+i, volume:1000+i*5, relativeVolume:1+i/500,
  dividendYield:i%4, eps:i/20, epsGrowthPct:i, dailyChangePct:i%6,
  ...extra});

test('R43 scores a complete issuer universe and guarantees exactly 5% triples',()=>{
 const rows=Array.from({length:2634},(_,i)=>stock(i));
 const result=rankR43Issuers(rows,{asOf:day});
 assert.equal(result.status,'READY_SHADOW');
 assert.equal(result.method,R43_METHOD);
 assert.equal(result.topCount,132);
 assert.equal(result.rankings.length,2634);
 assert.equal(result.rankings.filter(r=>r.importance===3).length,132);
 const index=r43ImportanceIndex(result,{now});
 assert.ok(index);
 assert.equal(index.size,2634);
 assert.equal([...index.values()].filter(x=>x===3).length,132);
 assert.deepEqual(rankR43Issuers([...rows].reverse(),{asOf:day}).rankings,result.rankings);
});

test('R43 normalizes share classes by issuer and excludes only explicitly reviewed rows',()=>{
 const rows=Array.from({length:20},(_,i)=>stock(i));
 rows[0]=stock(0,{ticker:'GOOG'});
 rows[1]=stock(1,{ticker:'GOOGL'});
 rows[2]=stock(2,{ticker:'BRK-A'});
 rows[3]=stock(3,{ticker:'BRK.B'});
 rows.push(stock(21,{ticker:'BABA',eligible:false}));
 const result=rankR43Issuers(rows,{asOf:day,expectedEligibleIssuers:18});
 assert.equal(result.status,'READY_SHADOW');
 assert.equal(result.rankings.length,18);
 assert.equal(result.topCount,1);
 assert.equal(result.rankings.flatMap(r=>r.tickers).length,20);
 assert.equal(r43IssuerKey('GOOG'),r43IssuerKey('GOOGL'));
 assert.equal(r43IssuerKey('BRK-A'),r43IssuerKey('BRK.B'));
 assert.ok(!result.rankings.some(r=>r.tickers.includes('BABA')));
});

test('R43 refuses the 500-only benchmark, date drift, and unverified exclusions',()=>{
 const rows=Array.from({length:495},(_,i)=>stock(i));
 const result=rankR43Issuers(rows,{asOf:day});
 assert.equal(result.status,'BLOCKED');
 assert.equal(result.reason,'R43_UNIVERSE_COVERAGE_NOT_VERIFIED');
 assert.equal(result.topCount,0);
 assert.equal(r43ImportanceIndex(result,{now}),null);
 assert.throws(()=>rankR43Issuers([stock(1,{eligible:null})],{asOf:day}),/R43_ELIGIBILITY_NOT_VERIFIED/);
 assert.throws(()=>rankR43Issuers([stock(1,{tradeDate:'2026-10-29'})],{asOf:day}),/R43_MIXED_OR_STALE_TRADE_DATE/);
});

test('R43 local PC runner does not write until rights, universe and command opt in are verified',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r43-'));
 try {
  assert.equal(runR43Local({base:dir,now}).reason,'R43_FULL_UNIVERSE_INPUT_MISSING');
  const file=path.join(dir,'local-market-calendar-r43-input.json');
  const source={version:1,asOf:day,provenance:'APPROVED_PC_STORED_DATA',
    marketCapApiUsed:false,permissionForDerivedScores:true,
    rows:Array.from({length:2634},(_,i)=>stock(i))};
  fs.writeFileSync(file,JSON.stringify({...source,permissionForDerivedScores:false}));
  assert.equal(runR43Local({base:dir,now}).reason,'R43_INPUT_SOURCE_OR_RIGHTS_UNVERIFIED');
  fs.writeFileSync(file,JSON.stringify(source));
  assert.equal(runR43Local({base:dir,now}).status,'READY_DRY_RUN');
  assert.equal(fs.existsSync(path.join(dir,'local-market-calendar-r43-ranked.json')),false);
  const done=runR43Local({base:dir,now,write:true});
  assert.equal(done.status,'READY_LOCAL_RANKED');
  assert.equal(done.topCount,132);
  assert.ok(fs.existsSync(path.join(dir,'local-market-calendar-r43-ranked.json')));
  const persisted=JSON.parse(fs.readFileSync(path.join(dir,'local-market-calendar-r43-ranked.json'),'utf8'));
  assert.equal(persisted.sourceRightsReviewed,true);
  assert.equal(persisted.marketCapApiUsed,false);
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
