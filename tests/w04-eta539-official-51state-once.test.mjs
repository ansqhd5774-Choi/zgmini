/**
 * W04 independent, isolated real ETA-539 first-fail prework (not a runtime collector).
 * The one public GET only runs for this exact GitHub pull_request head branch.
 * No Windows PC, Controller, D1, Cloudflare, sqlite, environment secrets,
 * raw CSV persistence, published statistics, automatic retries or schedules.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const EXCLUSIVE_BRANCH='support/w04-eta539-live-51state-prework-20261115';
const LIVE = process.env.CI==='true' &&
 process.env.GITHUB_EVENT_NAME==='pull_request' &&
 process.env.GITHUB_HEAD_REF===EXCLUSIVE_BRANCH;
const URL='https://oui.doleta.gov/unemploy/csv/ar539.csv';
const MAX_BYTES=80_000_000; // cap for public historical ETA CSV; never stored
const STALE_LAST='2025-07-19'; // old PC published STATE_CLAIMS_BREADTH cutoff

async function oneBoundedPublicGet(url) {
 const response=await fetch(url,{
  method:'GET',redirect:'manual',signal:AbortSignal.timeout(50_000),
  headers:{'accept':'text/csv,text/plain,*/*','user-agent':'ZGMINI-R6-SOURCE-ONLY/1.0'},
 });
 assert.equal(response.status,200,'ETA539_OFFICIAL_HTTP_'+response.status);
 assert.equal(response.redirected,false,'ETA539_UNAPPROVED_REDIRECT');
 assert.equal(response.url,url,'ETA539_UNAPPROVED_FINAL_URL');
 assert.ok(response.body?.getReader,'ETA539_STREAM_UNAVAILABLE');
 const announced=Number(response.headers.get('content-length'));
 assert.ok(!Number.isFinite(announced)||announced===0||announced<=MAX_BYTES,
  'ETA539_DECLARED_BYTES_CAP');
 const reader=response.body.getReader(),parts=[];let length=0;
 for (;;) {
  const {done,value}=await reader.read();
  if (done) break;
  length+=value.byteLength;
  if (length>MAX_BYTES) {
   await reader.cancel();
   throw Error('ETA539_STREAM_BYTES_CAP');
  }
  parts.push(Buffer.from(value));
 }
 assert.ok(length>=100,'ETA539_EMPTY_RESPONSE');
 return Buffer.concat(parts);
}
const dayNum=x=>Date.parse(x+'T00:00:00Z');

test('W04 once: actual public DOL ETA539 c3 complete 51-state weeks after stale July 2025',
 {skip:!LIVE&&'Only the isolated W04 PR head can issue the one bounded public GET',
  timeout:130_000},
 async t=>{
  const {DOL_ETA539_URL,parseEta539ShadowRows}=
   await import('../lib/market-score/employment-r4-shadow-provider.mjs');
  assert.equal(DOL_ETA539_URL,URL,'ETA539_PROVIDER_URL_CHANGED');
  const bytes=await oneBoundedPublicGet(URL);
  const sha=createHash('sha256').update(bytes).digest('hex');
  const csv=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  // The actual #1062 blank-c3 fix is invoked. No parser shim or mock.
  const parsed=await parseEta539ShadowRows(csv,{
   retrievedAt:new Date().toISOString(),historyWeeks:600,
  });
  const weeks=parsed.meta.selectedWeeks;
  assert.equal(parsed.meta.coreCount,51,'ETA539_NOT_50_STATES_PLUS_DC');
  assert.ok(Array.isArray(weeks)&&weeks.length>=300&&weeks.length<=600,
   'ETA539_HISTORICAL_COMPLETE_WEEKS_OUT_OF_RANGE');
  assert.equal(parsed.rows.length,weeks.length*51,'ETA539_REGION_WEEK_ROWCOUNT_INVALID');
  assert.ok(weeks.every((week,i)=>/^\d{4}-\d\d-\d\d$/.test(week)&&
    (i===0||dayNum(week)-dayNum(weeks[i-1])>=7*86400000)),
   'ETA539_WEEK_ORDER_INVALID');
  assert.equal(parsed.meta.latestCompleteWeek,weeks.at(-1));
  assert.ok(parsed.meta.latestCompleteWeek>='2026-09-01','ETA539_LAST_COMPLETE_WEEK_STALE');
  assert.ok(parsed.rows.every(row=>row.logicalSeriesId==='STATE_INITIAL_CLAIMS'&&
    row.frequency==='WEEKLY'&&row.geographyType==='STATE'&&
    Number.isFinite(row.value)&&row.value>=0),'ETA539_STATE_ROW_INVALID');
  const newer=weeks.filter(week=>week>STALE_LAST);
  assert.ok(newer.length>0,'ETA539_NO_COMPLETE_WEEK_AFTER_2025_07_19');
  const gaps=weeks.slice(1).map((week,i)=>
   Math.round((dayNum(week)-dayNum(weeks[i]))/86400000))
   .filter(days=>days>7);
  const latest69WeekWindow=weeks.filter(week=>
   dayNum(week)>dayNum(weeks.at(-1))-69*7*86400000);
  // Bounded public integrity metadata ONLY. Never output raw state records,
  // any geographic claim counts, CSV lines, source tokens or row bodies.
  t.diagnostic(
   `W04_ETA539_REAL_C3_VALIDATED bytes=${bytes.length} sha256=${sha} selectedCompleteWeeks=${weeks.length} stateRows=${parsed.rows.length} latestCompleteWeek=${parsed.meta.latestCompleteWeek} firstCompleteAfterPCStale=${newer[0]} completeAfterPCStale=${newer.length} last69CompleteWeeks=${latest69WeekWindow.length} historicalGaps=${gaps.length}`
  );
 });
