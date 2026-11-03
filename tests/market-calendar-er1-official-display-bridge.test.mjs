import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {scoreER1Issuers,ER1_STAR3_THRESHOLD} from '../lib/market-calendar-er1-earnings-score.mjs';
import {makeER1PublicDisplay,validateER1PublicDisplay} from
 '../lib/market-calendar-er1-public-display.mjs';

const client=fs.readFileSync(new URL('../app/market-calendar/market-calendar-client.tsx',import.meta.url),'utf8');
const route=fs.readFileSync(new URL('../app/api/earnings-er1-score-display/route.ts',import.meta.url),'utf8');

test('official-calendar ER1 bridge joins only ticker-shaped event IDs, never opaque IDs',()=>{
 assert.match(client,/const tickerId=earningsEvent\?/);
 assert.match(client,/\[a-z0-9\.\\-\]\{1,10\}/);
 assert.match(client,/Object\.hasOwn\(er1\.scores,tickerId\)/);
 assert.doesNotMatch(client,/fetch\('https?:\/\//i);
 const id=/^earnings-(?:release|call)-([a-z0-9.\-]{1,10})-20\d\d-q[1-4]$/;
 assert.equal(id.exec('earnings-release-aapl-2026-q4')?.[1]?.toUpperCase(),'AAPL');
 assert.equal(id.exec('earnings-call-brk.b-2026-q3')?.[1]?.toUpperCase(),'BRK.B');
 assert.equal(id.exec('earnings-release-opaque1234567890-2026-q4'),null);
 assert.equal(id.exec('earnings-release-unknownlongticker-2026-q4'),null);
});

test('only validated derived score map is served; no raw EPS or revenue fields',()=>{
 const rows=Array.from({length:100},(_,i)=>({issuerId:`T${i}`,
  tickers:[`T${i}`],earningsSymbol:`T${i}`,
  releases:[{date:'2026-10-30',symbol:`T${i}`,eps:1,revenue:100+i}]}));
 const scored=scoreER1Issuers(rows,{asOf:'2026-11-02'});
 const publicDerived=makeER1PublicDisplay(scored);
 const valid=validateER1PublicDisplay(publicDerived);
 assert.equal(valid.index.size,100);
 assert.equal(ER1_STAR3_THRESHOLD,97);
 assert.ok(valid.index.get('T99')>=ER1_STAR3_THRESHOLD);
 assert.ok(valid.index.get('T0')<ER1_STAR3_THRESHOLD);
 assert.deepEqual(Object.keys(Object.fromEntries(valid.index)).length,100);
 assert.match(route,/validateER1PublicDisplay\(body\)/);
 assert.match(route,/ER1_EARNINGS_DISPLAY_PUBLIC_KEY/);
 assert.match(route,/Object\.fromEntries\(verified\.index\)/);
 assert.doesNotMatch(route,/\.eps|\.revenue|\.releases|\.earningsSymbol/);
});

test('missing scores are hyphen; scored below 97 show points and scores 97+ show only three stars',()=>{
 assert.match(client,/er1Score!==null&&er1Score>=97\?3:null/);
 assert.match(client,/er1Score:earningsEvent\?er1Score:undefined/);
 assert.match(client,/row\.er1Score!==undefined&&row\.er1Score!==null/);
 assert.match(client,/row\.importance===3\?'★★★'/);
 assert.match(client,/aria-label="기업 실적 점수 없음"[^>]*>-<\/div>/);
 assert.match(client,/Math\.trunc\(score\*100\)/);
 assert.match(client,/useMemo\(\(\)=>mergeOfficial\(feed,er1Scores\),\[feed,er1Scores\]\)/);
 assert.match(client,/fetch\('\/api\/earnings-er1-score-display'/);
 assert.match(client,/if\(res\.status===204\)return null/);
 assert.match(client,/importance===null\|\|\(row\.importance!==null&&importance\.includes\(row\.importance\)\)/);
});
