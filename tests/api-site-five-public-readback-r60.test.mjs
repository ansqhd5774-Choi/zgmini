import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildEmploymentR6OneYearReadModel} from '../lib/market-score/employment-r6-one-year-read-model.mjs';
import {INFLATION_CAUSAL_19} from '../lib/inflation-causal-public-catalog.mjs';
import {INFLATION_CANDIDATES_7} from '../lib/inflation-causal-candidates-public-7-catalog.mjs';
import {collectFiveKeyInPlace,W05_FIXED_READS} from '../scripts/api-site/five-key-inplace-readback-prework-r12.mjs';
import {comparePublicReadback,PUBLIC_READBACK_SLOTS,MAX_PUBLIC_READBACK_SPAN_MS} from '../scripts/api-site/compare-five-public-readbacks-r1.mjs';
const now=Date.parse('2026-11-14T00:00:00.000Z');
const readAt='2026-11-14T00:00:00.000Z';
const storedAt=now-60_000;
const apiAt='2026-11-13T23:59:59.000Z';
const sha=s=>createHash('sha256').update(s,'utf8').digest('hex');
const d1=(slot,body,extras={})=>({ ...PUBLIC_READBACK_SLOTS[slot],readAt,exists:true,
  stored_at:storedAt,body:JSON.stringify(body),...extras});
const api=body=>({observedAt:apiAt,statusCode:200,body});
const check=(slot,db,pub)=>comparePublicReadback(slot,{d1:db,api:pub,now});
const pending=meta=>({id:meta.id,series:meta.series,unit:meta.unit,
 status:'PENDING',value:null,previousValue:null,observationDate:null,
 previousObservationDate:null,availableAt:null,sourceStoredAt:null,history:[]});
const inflation19Payload={schemaVersion:'inflation-causal-public-19-r1-v1',
 status:'PARTIAL',score:null,sourceVersion:'fixture-inflation-19-source-v1',
 sourceStoredAt:storedAt-1000,indicators:INFLATION_CAUSAL_19.map(pending)};
const infl7ObservationAt='2026-11-13T22:00:00.000Z';
const inflation7Payload={schemaVersion:'inflation-causal-candidates-7-r1-v1',
 status:'PARTIAL',score:null,sourceVersion:'fixture-inflation-7-source-v1',
 sourceStoredAt:Date.parse(infl7ObservationAt),
 indicators:INFLATION_CANDIDATES_7.map((meta,i)=>i===0?{
 ...pending(meta),status:'READY',value:2.5,observationDate:'2026-11-13',
 sourceStoredAt:infl7ObservationAt,history:[{date:'2026-11-13',value:2.5}]
 }:pending(meta))};
const inflationPayload=inflation19Payload;
const inflationEnvelope=payload=>({payload,projection:{status:'READY',builtAt:storedAt,
  sourceVersion:payload.sourceVersion,sourceStoredAt:payload.sourceStoredAt}});
const employment=buildEmploymentR6OneYearReadModel([],{asOfDate:'2026-11-13',
 sourceStoredAt:storedAt-1000});
const paidTheme={
 version:'ZGMINI_THEME_PAID_HOURLY_V1',status:'READY',phase:'CONFIRMED',
 sourcePriceMode:'MARKETPARQUET_PAID_SPLIT_ADJUSTED_1H_NY_PROXY_V1',
 sourceVersion:'a'.repeat(64),registrySha256:'b'.repeat(64),
 methodologyVersion:'THEME_PAID_V1',observationDate:'2026-11-13',
 confirmedObservationDate:'2026-11-13',sourceLatestDate:'2026-11-13',
 sourceStoredAt:'2026-11-13T23:57:00.000Z',updatedAt:'2026-11-13T23:57:30.000Z',
 phasePolicy:{clockBasis:'PROVIDER_PUBLISHED_PROXY_BAR_END',confirmedLagHours:0,provisionalLagHours:0},
 historicalSourcePolicy:{basis:'fixture'},
 themes:[{id:'robotics',theme:'로봇·자동화',etfs:['BOTZ','ROBO'],
  score:42,history:[{date:'2026-11-13',score:42}],
  methodologyVersion:'ETF_ONLY_T40_R20_V40_PAIR50',
  confirmedObservationDate:'2026-11-13',provisionalObservationDate:null,
  sourcePriceMode:'MARKETPARQUET_PAID_SPLIT_ADJUSTED_1H_NY_PROXY_V1',
  configured:false,privateProviderValue:'DO_NOT_EXPOSE'}],
 provisional:{points:[]},
 dataQuality:{expectedPublicIds:['robotics'],readyPublicIds:['robotics'],pendingPublicIds:[]},
 credential:'PRIVATE_FIXTURE_ONLY'
};
const paidView={
 version:paidTheme.version,status:'READY',phase:'CONFIRMED',
 observationDate:paidTheme.observationDate,
 confirmedObservationDate:paidTheme.confirmedObservationDate,
 sourceLatestDate:paidTheme.sourceLatestDate,
 methodologyVersion:paidTheme.methodologyVersion,
 sourcePriceMode:paidTheme.sourcePriceMode,
 historicalSourcePolicy:paidTheme.historicalSourcePolicy,
 sourceStoredAt:paidTheme.sourceStoredAt,
 sourceVersion:paidTheme.sourceVersion,registrySha256:paidTheme.registrySha256,
 updatedAt:paidTheme.updatedAt,phasePolicy:paidTheme.phasePolicy,
 themes:[{id:'robotics',theme:'로봇·자동화',etfs:['BOTZ','ROBO'],
  score:42,history:[{date:'2026-11-13',score:42}],
  methodologyVersion:'ETF_ONLY_T40_R20_V40_PAIR50',
  confirmedObservationDate:'2026-11-13',provisionalObservationDate:null,
  sourcePriceMode:'MARKETPARQUET_PAID_SPLIT_ADJUSTED_1H_NY_PROXY_V1',
  transitionAfter:null,previousPriceMode:null,missingETFs:[]}],
 provisional:{points:[]},
 dataQuality:{expectedPublicIds:['robotics'],readyPublicIds:['robotics'],pendingPublicIds:[]}
};
const apiPaid=body=>({...api(body),
 headers:{'x-zgmini-theme-source':'MARKETPARQUET_PAID_HOURLY'}});
test('five keys are fixed and enforce table, feed kind and compound key exactly',()=>{
 assert.equal(Object.keys(PUBLIC_READBACK_SLOTS).length,5);
 assert.equal(check('calendar',d1('calendar',{events:[]},{kind:'input'}),api({events:[]})).status,'WRONG_EXACT_KEY');
 assert.equal(check('inflation19',d1('inflation19',inflationEnvelope(inflationPayload),{snapshot_key:'wrong'}),api(inflationPayload)).status,'WRONG_EXACT_KEY');
 assert.throws(()=>comparePublicReadback('unknown',{}),/UNKNOWN_PUBLIC_READBACK_SLOT/);
});
test('missing independent receipt never becomes a PASS or a guessed zero',()=>{
 assert.equal(comparePublicReadback('inflation19',{api:api(inflationPayload)}).status,'UNVERIFIED_EVIDENCE_MISSING');
 assert.equal(check('calendar',d1('calendar',{}, {exists:false}),api({})).status,'CONFIRMED_D1_ROW_MISSING');
 assert.equal(check('calendar',d1('calendar',{}, {readAt:null}),api({})).status,'UNVERIFIED_OBSERVATION_TIME');
});
test('raw D1 SHA is over serialized envelope, not API payload',()=>{
 const body=inflationEnvelope(inflationPayload),receipt=d1('inflation19',body);
 const r=check('inflation19',receipt,api(inflationPayload));
 assert.equal(r.status,'STRUCTURAL_MATCH_NOT_RUNTIME_PROOF');
 assert.equal(r.d1BodySha256,sha(receipt.body));
 assert.notEqual(r.d1BodySha256,sha(JSON.stringify(inflationPayload)));
});
test('inflation 19 and candidates 7 use respective public validator envelopes',()=>{
 for(const slot of ['inflation19','inflation7']){
  const payload=slot==='inflation19'?inflation19Payload:inflation7Payload;
  const row=d1(slot,inflationEnvelope(payload));
  assert.equal(check(slot,row,api(payload)).status,'STRUCTURAL_MATCH_NOT_RUNTIME_PROOF');
  assert.equal(check(slot,row,api({...payload,sourceVersion:'other'})).status,'PUBLIC_PAYLOAD_MISMATCH');
 }
});
test('matching invalid inflation metadata must never be mistaken for public Reader output',()=>{
 for(const slot of ['inflation19','inflation7']){
  const original=slot==='inflation19'?inflation19Payload:inflation7Payload;
  const invalid=JSON.parse(JSON.stringify(original));
  invalid.indicators[0].id='NOT_AN_APPROVED_SERIES';
  assert.equal(check(slot,d1(slot,inflationEnvelope(invalid)),api(invalid)).status,
   'INVALID_INFLATION_PUBLIC_METADATA');
 }
});
test('sourceVersion, sourceStoredAt and builtAt conflicts reject envelope before equality',()=>{
 const base=inflationEnvelope(inflationPayload);
 for(const mutation of [
   {...base,projection:{...base.projection,builtAt:storedAt-1}},
   {...base,projection:{...base.projection,sourceVersion:'wrong'}},
   {...base,projection:{...base.projection,sourceStoredAt:base.projection.sourceStoredAt+1}},
   {...base,payload:{...inflationPayload,sourceStoredAt:storedAt+10}},
 ])assert.equal(check('inflation19',d1('inflation19',mutation),api(inflationPayload)).status,'CHECKPOINT_MISMATCH');
});
test('direct calendar body match does not invent mandatory sourceVersion',()=>{
 const body={status:'READY',events:[{id:'fomc'}],sources:{fed_fomc:{status:'SOURCE_FAILED'}}};
 assert.equal(check('calendar',d1('calendar',body),api(body)).status,'STRUCTURAL_MATCH_NOT_RUNTIME_PROOF');
 assert.equal(check('calendar',d1('calendar',body),api({...body,events:[]})).status,'PUBLIC_BODY_MISMATCH');
});
test('employment direct body requires 29 indicators and formula identity',()=>{
 const receipt=d1('employment',employment);
 const matched=check('employment',receipt,api(employment));
 assert.equal(matched.status,'STRUCTURAL_MATCH_NOT_RUNTIME_PROOF');
 assert.equal(matched.formulaHash,employment.formulaHash);
 assert.equal(check('employment',d1('employment',{...employment,indicators:[]}),api(employment)).status,'INVALID_EMPLOYMENT_METADATA');
 assert.equal(check('employment',receipt,api({...employment,methodologyVersion:'different'})).status,'PUBLIC_BODY_MISMATCH');
});
test('theme slot uses the currently selected paid feed exact key',()=>{
 assert.equal(PUBLIC_READBACK_SLOTS.theme.table,'public_feed_snapshots_v1');
 assert.equal(PUBLIC_READBACK_SLOTS.theme.kind,'output');
 assert.equal(PUBLIC_READBACK_SLOTS.theme.feed_key,'theme-fear-greed-paid-hourly-v1');
 assert.equal(PUBLIC_READBACK_SLOTS.theme.snapshot_key,'current');
 assert.equal(check('theme',d1('theme',paidTheme,{feed_key:'legacy'}),apiPaid(paidView)).status,'WRONG_EXACT_KEY');
});
test('paid theme full projection matches while private fields stay hidden',()=>{
 const row=d1('theme',paidTheme);
 const found=check('theme',row,apiPaid(paidView));
 assert.equal(found.status,'STRUCTURAL_MATCH_NOT_RUNTIME_PROOF');
 assert.equal(found.readerBranch,'PAID');
 assert.equal(found.d1BodySha256,sha(row.body));
 assert.doesNotMatch(JSON.stringify(found),/DO_NOT_EXPOSE|PRIVATE_FIXTURE_ONLY/);
 assert.notEqual(row.body,JSON.stringify(paidView));
});
test('paid comparison detects value and historical date differences',()=>{
 for(const mutate of [
  x=>{x.themes[0].score=77;},
  x=>{x.themes[0].history[0].date='2026-11-12';},
  x=>{x.sourceVersion='c'.repeat(64);},
 ]){const body=structuredClone(paidView);mutate(body);
  assert.equal(check('theme',d1('theme',paidTheme),apiPaid(body)).status,'THEME_PAID_PAYLOAD_MISMATCH');
 }
});
test('legacy fallback does not prove a current paid row mismatch',()=>{
 const legacy={version:'THEME_ETF_ONLY_R144_252_PUBLIC_V1',status:'READY',themes:[]};
 assert.equal(check('theme',d1('theme',paidTheme),api(legacy)).status,'THEME_LEGACY_FALLBACK_UNVERIFIED');
});
test('paid body without verified source header is not a branch proof',()=>{
 assert.equal(check('theme',d1('theme',paidTheme),api(paidView)).status,'THEME_READER_BRANCH_UNVERIFIED');
});
test('malformed paid metadata and expired paid rows fail closed',()=>{
 assert.equal(check('theme',d1('theme',{...paidTheme,registrySha256:'bad'}),apiPaid(paidView)).status,
  'INVALID_THEME_PAID_METADATA');
 assert.equal(check('theme',d1('theme',{...paidTheme,updatedAt:'2026-11-01T00:00:00.000Z'}),apiPaid(paidView)).status,
  'THEME_PAID_ROW_NOT_ELIGIBLE');
});
test('503 stale is a public API readiness failure, not a D1 mismatch verdict',()=>{
 const r=check('theme',d1('theme',paidTheme),{observedAt:apiAt,statusCode:503,body:{reason:'STORED_DATA_STALE'}});
 assert.equal(r.status,'API_NOT_READY');assert.equal(r.httpStatus,503);
});
test('invalid JSON and future D1 stored_at fail closed',()=>{
 assert.equal(check('calendar',d1('calendar',{}, {body:'{'}),api({})).status,'INVALID_D1_JSON');
 assert.equal(check('calendar',d1('calendar',{}, {stored_at:now+1}),api({})).status,'INVALID_D1_RECEIPT');
});
test('no raw body or credentials are returned in public summary',()=>{
 const row=d1('calendar',{status:'READY',secret:'private-fixture-value'});
 const result=check('calendar',row,api(JSON.parse(row.body)));
 assert.equal(result.status,'STRUCTURAL_MATCH_NOT_RUNTIME_PROOF');
 assert.doesNotMatch(JSON.stringify(result),/private-fixture-value|secret|body":/);
});

test('same JSON observed before D1 write is not a valid simultaneous comparison',()=>{
 const body={status:'READY',events:[{id:'fomc'}]};
 const row=d1('calendar',body);
 const earlyApi={...api(body),observedAt:new Date(row.stored_at-1).toISOString()};
 assert.equal(check('calendar',row,earlyApi).status,'UNVERIFIED_OBSERVATION_WINDOW');
});

test('D1 receipt cannot claim to read a row before its own stored_at',()=>{
 const body={status:'READY',events:[{id:'fomc'}]};
 const row=d1('calendar',body,{readAt:new Date(storedAt-1).toISOString()});
 assert.equal(check('calendar',row,api(body)).status,'UNVERIFIED_OBSERVATION_WINDOW');
});

test('two valid timestamps outside the bounded read window cannot claim structural match',()=>{
 const body={status:'READY',events:[]},oldStored=now-10*60_000;
 const row=d1('calendar',body,{stored_at:oldStored});
 const farAway={...api(body),observedAt:new Date(now-MAX_PUBLIC_READBACK_SPAN_MS-1).toISOString()};
 assert.equal(check('calendar',row,farAway).status,'UNVERIFIED_OBSERVATION_WINDOW');
 const atBoundary={...api(body),observedAt:new Date(now-MAX_PUBLIC_READBACK_SPAN_MS).toISOString()};
 assert.equal(check('calendar',row,atBoundary).status,'STRUCTURAL_MATCH_NOT_RUNTIME_PROOF');
 const safelyLate={...api(body),observedAt:new Date(now-1).toISOString()};
 assert.equal(check('calendar',row,safelyLate).status,'STRUCTURAL_MATCH_NOT_RUNTIME_PROOF');
});

test('known HTTP 503 remains API_NOT_READY even when captures are not coincident',()=>{
 const body={status:'READY',events:[]};
 const row=d1('calendar',body,{stored_at:now-10*60_000});
 const staleObservation={observedAt:new Date(now-10*60_000).toISOString(),
   statusCode:503,body:{status:'unavailable',reason:'STORED_DATA_STALE'}};
 const result=check('calendar',row,staleObservation);
 assert.equal(result.status,'API_NOT_READY');
 assert.equal(result.httpStatus,503);
});


test('matching 29 fake employment IDs do not imply Reader-valid public data',()=>{
 const invalid=JSON.parse(JSON.stringify(employment));
 invalid.indicators[0].id='NOT_AN_APPROVED_SERIES';
 assert.equal(check('employment',d1('employment',invalid),api(invalid)).status,
  'INVALID_EMPLOYMENT_METADATA');
});
test('matching paid metadata with false source clock policy cannot be certified',()=>{
 const invalid=JSON.parse(JSON.stringify(paidTheme));
 invalid.phasePolicy.confirmedLagHours=24;
 assert.equal(check('theme',d1('theme',invalid),apiPaid(paidView)).status,
  'INVALID_THEME_PAID_METADATA');
});
test('200 with theme status UNAVAILABLE is API readiness, never parity',()=>{
 assert.equal(check('theme',d1('theme',paidTheme),apiPaid({...paidView,status:'UNAVAILABLE'})).status,
  'API_NOT_READY');
});

test('protected reader uses exact paid theme compound key instead of legacy seed SELECT',()=>{
 assert.deepEqual(Object.keys(W05_FIXED_READS),Object.keys(PUBLIC_READBACK_SLOTS));
 assert.deepEqual(W05_FIXED_READS.theme.bind,['output','theme-fear-greed-paid-hourly-v1','current']);
 assert.match(W05_FIXED_READS.theme.sql,/^SELECT body,stored_at FROM public_feed_snapshots_v1/);
 assert.equal(new Set(Object.values(W05_FIXED_READS).map(x=>JSON.stringify(x.bind))).size,5);
});
const fiveBodies={inflation19:inflationEnvelope(inflation19Payload),
 inflation7:inflationEnvelope(inflation7Payload),
 calendar:{status:'READY',sources:{},events:[]},theme:paidTheme,employment};
function protectedFixture({changePaidAfter=false}={}){
 const reads=Object.fromEntries(Object.keys(fiveBodies).map(k=>[k,0]));
 const db={prepare(sql){assert.match(sql,/^SELECT body,stored_at FROM /);
  return{bind(...args){
   const slot=Object.keys(W05_FIXED_READS).find(k=>W05_FIXED_READS[k].sql===sql&&
    JSON.stringify(W05_FIXED_READS[k].bind)===JSON.stringify(args));
   assert.ok(slot,'only five allowlisted exact SELECTs');
   return{async first(){reads[slot]++;
    return {body:JSON.stringify(changePaidAfter&&slot==='theme'&&reads[slot]===2?
     {...paidTheme,sourceVersion:'c'.repeat(64)}:fiveBodies[slot]),stored_at:storedAt};
   }};}};}};
 const readApi=async slot=>({statusCode:200,body:slot==='theme'?paidView:
  slot==='inflation19'?inflation19Payload:slot==='inflation7'?inflation7Payload:
   fiveBodies[slot],
  ...(slot==='theme'?{headers:{'x-zgmini-theme-source':'MARKETPARQUET_PAID_HOURLY'}}:{})});
 return {db,reads,readApi};
}
test('protected two-pass same-window reader verifies five fixture structures but never claims runtime',async()=>{
 const f=protectedFixture();
 const r=await collectFiveKeyInPlace({db:f.db,readApi:f.readApi,clock:()=>now});
 assert.equal(r.keysChecked,5);
 assert.equal(r.ownerAuthorizationVerified,false);
 assert.equal(r.deploymentIdentityVerified,false);
 assert.equal(r.runtimeVerified,false);
 assert.deepEqual(Object.values(f.reads),Array(5).fill(2));
 assert.deepEqual(r.results.map(x=>x.status),Array(5).fill('STRUCTURAL_MATCH_NOT_RUNTIME_PROOF'));
 assert.doesNotMatch(JSON.stringify(r),/PRIVATE_FIXTURE_ONLY|DO_NOT_EXPOSE|"body":/);
});
test('protected reader retains paid vs legacy branch uncertainty without source header',async()=>{
 const f=protectedFixture();
 const readApi=async slot=>{const result=await f.readApi(slot);
  if(slot==='theme')delete result.headers;return result;};
 const r=await collectFiveKeyInPlace({db:f.db,readApi,clock:()=>now});
 assert.equal(r.results.find(x=>x.slot==='theme').status,'THEME_READER_BRANCH_UNVERIFIED');
 assert.equal(r.runtimeVerified,false);
});
test('protected adapter stops a changed paid D1 row rather than comparing old bytes',async()=>{
 const f=protectedFixture({changePaidAfter:true});
 const r=await collectFiveKeyInPlace({db:f.db,readApi:f.readApi,clock:()=>now});
 assert.equal(r.results.find(x=>x.slot==='theme').status,'SOURCE_DRIFT_UNVERIFIED');
 assert.equal(f.reads.theme,2);
 assert.equal(r.runtimeVerified,false);
});
