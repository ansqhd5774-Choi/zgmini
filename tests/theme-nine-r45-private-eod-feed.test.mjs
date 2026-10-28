import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileNineR45PrivateEodFeed} from '../scripts/pc-writer/theme-nine-r45-private-eod-feed.mjs';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const roster=JSON.parse(fs.readFileSync(path.join(root,
 'config/theme-nine-r20-approved-candidates.json'),'utf8'));
const approved=[...new Set(roster.groups.flatMap(x=>x.tickers.map(t=>t.ticker)))];
const original='a'.repeat(64),next='b'.repeat(64);
const entries=(date)=>[{symbol:'SPY',date,close:100,asset_type:'etf'},
 ...approved.map((symbol,i)=>({symbol,date,close:10+i,asset_type:'etf'}))];
function sample(){return {
 roster,verifiedRowsByDate:new Map([
  ['2026-10-23',entries('2026-10-23')],
  ['2026-10-26',entries('2026-10-26')]]),
 shaByDate:new Map([['2026-10-23',original],['2026-10-26',next]]),
};}

test('R45 extracts all approved 63 ETF and SPY into separate private EOD feed',()=>{
 const input=sample();
 // Pinned archived dates are not substitutable by a same-shaped fake digest.
 input.shaByDate.set('2026-10-23',
  '4f0bbb08f4a67818209d6d32d465006111c6d6b0c958caf7f9202a49ca8c8f45');
 input.shaByDate.set('2026-10-26',
  '002465943c1cdb51191d528032652ad87ee0ab06f6bacb163b1ff4ce04a9174a');
 const out=compileNineR45PrivateEodFeed(input);
 assert.equal(out.verifiedSavedDates,2);
 assert.equal(out.latestETFCount,63);
 assert.equal(out.latestSPYPresent,true);
 assert.equal(Object.keys(out.coverage).length,63);
 assert.equal(out.series.SPY.length,2);
 assert.equal(out.coverage.BOTZ.spyPairedDates,2);
 assert.equal(out.coverage.BOTZ.atLeast40,false);
 assert.equal(out.r32CalculationAuthorized,false);
 assert.equal(out.publicPublishAuthorized,false);
 assert.equal(out.priceMode,'DAILY_SPLIT_ADJUSTED_NOT_R32_RAW_1H');
});

test('R45 preserves missing ETF as missing, does not invent a zero price',()=>{
 const input=sample();
 input.shaByDate.set('2026-10-23',
  '4f0bbb08f4a67818209d6d32d465006111c6d6b0c958caf7f9202a49ca8c8f45');
 input.shaByDate.set('2026-10-26',
  '002465943c1cdb51191d528032652ad87ee0ab06f6bacb163b1ff4ce04a9174a');
 input.verifiedRowsByDate.set('2026-10-26',entries('2026-10-26').filter(r=>r.symbol!=='CABZ'));
 const out=compileNineR45PrivateEodFeed(input);
 assert.equal(out.latestETFCount,62);
 assert.deepEqual(out.latestMissingETFs,['CABZ']);
 assert.equal(out.coverage.CABZ.spyPairedDates,1);
});

test('R45 fails closed on altered archive digest, duplicated symbol and invalid price',()=>{
 const input=sample();
 assert.throws(()=>compileNineR45PrivateEodFeed(input),/R45_PINNED_SHA_DRIFT/);
 input.shaByDate.set('2026-10-23',
  '4f0bbb08f4a67818209d6d32d465006111c6d6b0c958caf7f9202a49ca8c8f45');
 input.shaByDate.set('2026-10-26',
  '002465943c1cdb51191d528032652ad87ee0ab06f6bacb163b1ff4ce04a9174a');
 input.verifiedRowsByDate.get('2026-10-26').push({symbol:'SPY',date:'2026-10-26',close:99});
 assert.throws(()=>compileNineR45PrivateEodFeed(input),/R45_ETF_ROW_INVALID/);
 input.verifiedRowsByDate.get('2026-10-26').pop();
 input.verifiedRowsByDate.get('2026-10-26')[0].close=0;
 assert.throws(()=>compileNineR45PrivateEodFeed(input),/R45_ETF_ROW_INVALID/);
});

test('R45 rejects changes to approved roster',()=>{
 const input=sample();input.roster={...roster,counts:{...roster.counts,uniqueTickers:62}};
 assert.throws(()=>compileNineR45PrivateEodFeed(input),/R45_ROSTER_CONTRACT/);
});
