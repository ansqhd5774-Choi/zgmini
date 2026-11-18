import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {
 GMH_SEVEN_SYMBOLS,GMH_SEVEN_REQUIRED_SESSIONS,
 calculateGmhSevenPrivate252,parseSavedGmhBarSource
} from '../scripts/pc-writer/theme-gmh-seven-private-bridge.mjs';
import {makeThemeEtfOnlyResearchCandidate}
 from '../scripts/pc-writer/theme-etf-only-r149-stage.mjs';

const sha=x=>createHash('sha256').update(x).digest('hex');
const nyHour=new Intl.DateTimeFormat('en-US',{
 timeZone:'America/New_York',hour:'2-digit',hourCycle:'h23'});
const dates=[];
for(let d=new Date('2022-01-03T00:00:00Z');dates.length<628;d=new Date(d.getTime()+86400000)){
 if(d.getUTCDay()===0||d.getUTCDay()===6)continue;
 dates.push(d.toISOString().slice(0,10));
}
function timestamp(day){
 const a=day+'T19:00:00Z',b=day+'T20:00:00Z';
 if(nyHour.format(new Date(a))==='15')return a;
 if(nyHour.format(new Date(b))==='15')return b;
 throw Error('FIXTURE_LOCAL_TIME');
}
function source(symbol,{dayCount=628,extra=[],provider='GETMARKETHISTORY_STOCKS_US_1H'}={}){
 const offset=GMH_SEVEN_SYMBOLS.indexOf(symbol);
 const rows=dates.slice(0,dayCount).map((day,i)=>({
  symbol,timestamp:timestamp(day),
  close:Number((100+offset*3+i*0.09+Math.sin(i/17+offset)*2).toFixed(5)),
  is_gap:false,gap_fill_method:0
 }));
 rows.push(...extra);
 rows.sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
 const bytes=Buffer.from(rows.map(x=>JSON.stringify(x)).join('\n')+'\n');
 return {symbol,format:'jsonl',provider,bytes,sha256:sha(bytes)};
}
const samples=()=>GMH_SEVEN_SYMBOLS.map(s=>source(s));
test('actual approved GMH seven-pair R188 private scores are 7x252 and never published',()=>{
 assert.equal(GMH_SEVEN_SYMBOLS.length,14);
 const result=calculateGmhSevenPrivate252(samples(),{asOf:'2024-06-01T00:00:00Z'});
 assert.equal(result.status,'PRIVATE_252_RESEARCH_READY_NO_PUBLICATION');
 assert.equal(result.themes252Ready,7);
 assert.equal(result.etf252Ready,13);
 assert.equal(result.commonSessions,GMH_SEVEN_REQUIRED_SESSIONS);
 assert.equal(result.scoreInputSessions,628);
 assert.equal(result.themes.length,7);
 assert.equal(result.providerCalls,0);
 assert.equal(result.dbWrites,0);
 assert.equal(result.d1Writes,0);
 assert.equal(result.publicationAuthorized,false);
 assert.equal(result.sourceOnlyGmh,true);
 for(const theme of result.themes){
  assert.equal(theme.days.length,252);
  assert.equal(theme.days.at(-1).date,result.observationDate);
  assert.equal(theme.latestScore,theme.days.at(-1).score);
  assert.ok(theme.days.every(x=>x.score>=0&&x.score<=100));
 }
 // Existing R149 candidate contract is satisfied without changing the legacy
 // formula, but the public approval flags MUST remain false.
 const candidate=makeThemeEtfOnlyResearchCandidate(result,{
  sourceStoredAt:'2024-06-01T00:00:00Z',
  sourceVersion:'W03_GMH_PRIVATE_FIXTURE'});
 assert.equal(candidate.status,'CANDIDATE_RESEARCH_NOT_APPROVED');
 assert.equal(candidate.themes.length,7);
 assert.equal(candidate.publicationAuthorized,false);
 assert.equal(candidate.upstreamCommercialRightsVerified,false);
 assert.equal(candidate.derivedLicenseVerified,false);
 assert.equal(candidate.publishedAt,null);
 const json=JSON.stringify(result);
 assert.ok(!json.includes('"close"'));
 assert.ok(!json.includes('"timestamp"'));
});
test('provider response is parsed without new collection-time row threshold',()=>{
 const one=source('SPY',{dayCount:1});
 const rows=parseSavedGmhBarSource(one);
 assert.equal(rows.inputRows,1);
 assert.equal(rows.eligibleHours,1);
 assert.equal(rows.provider,'GETMARKETHISTORY_STOCKS_US_1H');
 const asArray=JSON.stringify(JSON.parse(one.bytes.toString('utf8').trim()));
 const jsonBytes=Buffer.from('['+asArray+']');
 const json=parseSavedGmhBarSource({...one,format:'json',bytes:jsonBytes,sha256:sha(jsonBytes)});
 assert.equal(json.eligibleHours,1);
});
test('true missing history, missing SPY, non-GMH and wrong hash cannot masquerade as READY',()=>{
 const all=samples();
 assert.throws(()=>calculateGmhSevenPrivate252(all.slice(1),{asOf:'2024-06-01T00:00:00Z'}),
  {code:'GMH_SEVEN_EXACT_FOURTEEN_SOURCES_REQUIRED'});
 const partial=all.map(x=>x.symbol==='BUG'?source('BUG',{dayCount:627}):x);
 assert.throws(()=>calculateGmhSevenPrivate252(partial,{asOf:'2024-06-01T00:00:00Z'}),
  {code:'GMH_SEVEN_COMMON_628_GMH_SESSIONS_MISSING'});
 const unlicensed=all.map(x=>x.symbol==='SPY'?{...x,provider:'MARKETPARQUET_FREE_SAMPLE'}:x);
 assert.throws(()=>calculateGmhSevenPrivate252(unlicensed,{asOf:'2024-06-01T00:00:00Z'}),
  {code:'GMH_SEVEN_PROVENANCE_NOT_GMH_ONE_HOUR'});
 assert.throws(()=>parseSavedGmhBarSource({...all[0],sha256:'b'.repeat(64)}),
  {code:'GMH_SEVEN_RAW_SHA_OR_BYTES_INVALID'});
});
test('conflicting overlapping hourly bars remain a visible integrity failure',()=>{
 const bar=JSON.parse(source('SPY',{dayCount:1}).bytes.toString('utf8').trim());
 const bad=source('SPY',{dayCount:1,extra:[{...bar,close:bar.close+7}]});
 assert.throws(()=>parseSavedGmhBarSource(bad),
  {code:'GMH_SEVEN_RAW_CONFLICTING_DUPLICATE'});
});
test('supplier gap flag is retained as skipped for score, not fabricated',()=>{
 const bar=JSON.parse(source('SPY',{dayCount:1}).bytes.toString('utf8').trim());
 const next={...bar,timestamp:'2022-01-03T21:00:00Z',is_gap:true,close:null};
 const item=source('SPY',{dayCount:1,extra:[next]});
 const result=parseSavedGmhBarSource(item);
 assert.equal(result.inputRows,2);
 assert.equal(result.eligibleHours,1);
 assert.equal(result.skippedGaps,1);
});

test('non-gap unusable close is excluded, not promoted to a whole-series failure',()=>{
 const baseline=calculateGmhSevenPrivate252(samples(),{asOf:'2024-06-01T00:00:00Z'});
 const raw=JSON.parse(source('SPY',{dayCount:1}).bytes.toString().trim());
 const bad={...raw,timestamp:'2022-01-03T22:00:00Z',close:null,is_gap:false};
 const withBad=samples().map(s=>s.symbol==='SPY'?
  source('SPY',{extra:[bad]}):s);
 const candidate=calculateGmhSevenPrivate252(withBad,{asOf:'2024-06-01T00:00:00Z'});
 assert.equal(candidate.commonSessions,628);
 assert.equal(candidate.sourceEvidence.SPY.skippedUnusable,1);
 assert.equal(candidate.sourceEvidence.SPY.inputRows,629);
 assert.deepEqual(candidate.themes.map(t=>t.days),
  baseline.themes.map(t=>t.days));
 assert.equal(candidate.publicationAuthorized,false);
 assert.equal(candidate.providerCalls,0);
 assert.equal(candidate.d1Writes,0);
});
test('unusable regular-session price never generates a fabricated history point',()=>{
 const s=source('SPY');
 const bars=s.bytes.toString('utf8').trim().split('\n').map(JSON.parse);
 bars[120].close=null;
 const bytes=Buffer.from(bars.map(JSON.stringify).join('\n')+'\n');
 const inputs=samples().map(x=>x.symbol==='SPY'?
  {...s,bytes,sha256:sha(bytes)}:x);
 assert.throws(()=>calculateGmhSevenPrivate252(inputs,{
  asOf:'2024-06-01T00:00:00Z'}),
  {code:'GMH_SEVEN_COMMON_628_GMH_SESSIONS_MISSING'});
});
