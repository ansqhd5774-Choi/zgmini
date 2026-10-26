import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mixNineR32Date,calculateNineR32Private} from
 '../scripts/pc-writer/theme-nine-r32-private-aggregate.mjs';

const DATE='2026-10-23';
const one=(ticker,score,sessions=700,status='R188_COMPATIBLE',aumUsd=1_000_000,
 aumAsOf=DATE)=>({ticker,score,sessions,status,aumUsd,aumAsOf});
const mix=rows=>mixNineR32Date({date:DATE,rows,benchmarkDate:DATE});

test('three plus ETFs use normalized same-date official AUM with 0-100 score',()=>{
 const out=mix([one('AAA',20,700,'R188_COMPATIBLE',10),
  one('BBB',60,700,'R188_COMPATIBLE',30),one('CCC',100,700,'R188_COMPATIBLE',60)]);
 assert.equal(out.score,80);
 assert.deepEqual(out.weightsPercent,{AAA:10,BBB:30,CCC:60});
 assert.equal(out.mode,'NORMALIZED_DATED_OFFICIAL_AUM_THREE_PLUS');
});

test('outdated AUM in three-plus is blocked, not renamed or silently excluded',()=>{
 assert.throws(()=>mix([one('AAA',20),one('BBB',60,700,'R188_COMPATIBLE',5,'2026-09-30'),
  one('CCC',100)]),e=>e.code==='AUM_FRESHNESS_UNAPPROVED'&&
  e.details.older[0].ticker==='BBB');
});

test('two ETFS reuse approved R3 maturity ramp and official compatible parity',()=>{
 const p=mix([one('LONG',90,700),one('NEW',10,40,'ADAPTIVE_PROVISIONAL')]);
 assert.equal(p.score,66);
 assert.equal(p.weightsPercent.LONG,70);
 assert.equal(p.weightsPercent.NEW,30);
 const parity=mix([one('LONG',90,700),one('NEW',10,377)]);
 assert.equal(parity.score,50);
 assert.equal(parity.weightsPercent.LONG,50);
});

test('unapproved both-short pair becomes one real ETF with most real sessions',()=>{
 const x=mix([one('SHORT',25,120,'ADAPTIVE_PROVISIONAL'),
  one('YOUNG',75,41,'ADAPTIVE_PROVISIONAL')]);
 assert.equal(x.score,25);
 assert.deepEqual(x.contributingETFs,['SHORT']);
 assert.equal(x.mode,'R32_APPROVED_SINGLE_FALLBACK_FROM_TWO');
});

test('session tie uses current official AUM, ticker tie break and freshness guard',()=>{
 const x=mix([one('ZED',20,120,'ADAPTIVE_PROVISIONAL',9),
  one('ABC',90,120,'ADAPTIVE_PROVISIONAL',9)]);
 assert.equal(x.score,90);
 assert.deepEqual(x.contributingETFs,['ABC']);
 assert.throws(()=>mix([one('ZED',20,120,'ADAPTIVE_PROVISIONAL',9),
  one('ABC',90,120,'ADAPTIVE_PROVISIONAL',10,'2026-07-01')]),
  e=>e.code==='AUM_FRESHNESS_UNAPPROVED');
});

test('zero remains null, one scored ETF uses 100%; bad score is never a zero substitute',()=>{
 assert.deepEqual(mix([]).score,null);
 assert.equal(mix([one('AAA',31.25,40,'ADAPTIVE_PROVISIONAL')]).score,31.25);
 assert.throws(()=>mix([one('BAD',101)]),/R32_ELIGIBLE_ROW_INVALID/);
});

test('optional privately uploaded R25 result stops on non-benchmark AUM dates',t=>{
 const base=new URL('../',import.meta.url);
 const privatePath=new URL('upload/THEME_NINE_R25_INDIVIDUAL_SCORES_2665_21261.json',base);
 if(!fs.existsSync(privatePath))return t.skip('PC R25 JSON is intentionally not in GitHub');
 const r25=JSON.parse(fs.readFileSync(privatePath,'utf8'));
 const roster=JSON.parse(fs.readFileSync(new URL('config/theme-nine-r20-approved-candidates.json',base),'utf8'));
 const aum=JSON.parse(fs.readFileSync(new URL('config/theme-nine-r26-official-aum-evidence.json',base),'utf8'));
 assert.throws(()=>calculateNineR32Private({r25,roster,aum}),
  e=>e.code==='AUM_FRESHNESS_UNAPPROVED'&&e.details.older.length>0&&
   typeof e.details.theme==='string');
});
