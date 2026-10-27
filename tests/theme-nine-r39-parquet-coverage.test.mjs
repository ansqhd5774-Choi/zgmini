import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectNineR39WithRows} from '../scripts/pc-writer/theme-nine-r39-parquet-coverage.mjs';

const roster=JSON.parse(readFileSync(new URL('../config/theme-nine-r20-approved-candidates.json',
 import.meta.url)));
const symbols=[...new Set(roster.groups.flatMap(g=>g.tickers.map(t=>t.ticker)))];
const rows=date=>[...symbols,'SPY'].map((symbol,i)=>({date,symbol,
 asset_type:'ETF',close:50+i}));

test('complete saved parquet coverage has 63 ETF symbols plus SPY',()=>{
 const r=inspectNineR39WithRows({roster,
  baseRows:rows('2026-10-23'),nextRows:rows('2026-10-26')});
 assert.equal(r.status,'COMPLETE_DAILY_ETF_COVERAGE_ONLY');
 assert.equal(r.candidatePositions,64);
 assert.equal(r.uniqueETFs,63);
 assert.equal(r.presentBothDates,63);
 assert.equal(r.spyPresentBase,true);
 assert.equal(r.spyPresentNext,true);
 assert.equal(r.publicationAuthorized,false);
 assert.equal(r.d1Writes,0);
});

test('missing tickers and SPY remain explicit, without making prices up',()=>{
 const baseRows=rows('2026-10-23').filter(row=>row.symbol!=='ROBO');
 const nextRows=rows('2026-10-26').filter(row=>!['ROBO','SPY','XBI'].includes(row.symbol));
 const r=inspectNineR39WithRows({roster,baseRows,nextRows});
 assert.equal(r.status,'PARTIAL_DAILY_ETF_COVERAGE_ONLY');
 assert.deepEqual(r.missingBase,['ROBO']);
 assert.deepEqual(r.missingNext,['ROBO','XBI']);
 assert.equal(r.spyPresentNext,false);
 assert.equal(r.presentBothDates,61);
});

test('duplicate, wrong-date and impossible observed prices stop the audit',()=>{
 const baseRows=rows('2026-10-23'),nextRows=rows('2026-10-26');
 assert.throws(()=>inspectNineR39WithRows({roster,baseRows:[...baseRows,baseRows[0]],
  nextRows}),/PARQUET_ROW_INVALID/);
 assert.throws(()=>inspectNineR39WithRows({roster,baseRows,
  nextRows:nextRows.map((r,i)=>i===0?{...r,date:'2026-10-23'}:r)}),/PARQUET_ROW_INVALID/);
 assert.throws(()=>inspectNineR39WithRows({roster,baseRows,
  nextRows:nextRows.map((r,i)=>i===0?{...r,close:0}:r)}),/PARQUET_ROW_INVALID/);
});
