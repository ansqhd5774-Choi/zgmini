import test from 'node:test';
import assert from 'node:assert/strict';
import {collectFiveKeyInPlace,W05_FIXED_READS,W05_INPLACE_SCHEMA} from '../scripts/api-site/five-key-inplace-readback-prework-r12.mjs';
import {buildEmploymentR6OneYearReadModel} from '../lib/market-score/employment-r6-one-year-read-model.mjs';
import {INFLATION_CAUSAL_19} from '../lib/inflation-causal-public-catalog.mjs';
import {INFLATION_CANDIDATES_7} from '../lib/inflation-causal-candidates-public-7-catalog.mjs';
const keyOrder=['inflation19','inflation7','calendar','theme','employment'];
const stamp=Date.parse('2026-11-15T00:00:00.000Z');
const clock=()=>stamp;
const storedAt=stamp-2000;
const inflationPending=meta=>({id:meta.id,series:meta.series,unit:meta.unit,
 status:'PENDING',value:null,previousValue:null,observationDate:null,
 previousObservationDate:null,availableAt:null,sourceStoredAt:null,history:[]});
const inflation19Payload={schemaVersion:'inflation-causal-public-19-r1-v1',
 status:'PARTIAL',score:null,sourceVersion:'fixture-v1',
 sourceStoredAt:storedAt-1000,indicators:INFLATION_CAUSAL_19.map(inflationPending)};
const inflation7Payload={schemaVersion:'inflation-causal-candidates-7-r1-v1',
 status:'PARTIAL',score:null,sourceVersion:'fixture-v1',
 sourceStoredAt:storedAt-1000,indicators:INFLATION_CANDIDATES_7.map((meta,i)=>
  i===0?{...inflationPending(meta),status:'READY',value:2.5,
   observationDate:'2026-11-14',sourceStoredAt:'2026-11-14T20:00:00.000Z',
   history:[{date:'2026-11-14',value:2.5}]}:inflationPending(meta))};
const inflationEnvelope=payload=>({payload,projection:{status:'READY',
 builtAt:storedAt,sourceVersion:payload.sourceVersion,
 sourceStoredAt:payload.sourceStoredAt}});
const themeEtfs=[
 {theme:'로봇·자동화',etfs:['BOTZ','ROBO']},
 {theme:'클라우드·SaaS',etfs:['SKYY','CLOU']},
 {theme:'자율주행',etfs:['DRIV','BOTZ']},
 {theme:'원전·SMR',etfs:['NLR','URA']},
 {theme:'방산',etfs:['ITA','SHLD']},
 {theme:'핀테크',etfs:['FINX','ARKF']},
 {theme:'사이버보안',etfs:['CIBR','BUG']}];
const themeSeed={version:'THEME_ETF_ONLY_R144_252_PUBLIC_V1',status:'READY',
 publicationAuthorized:true,upstreamCommercialRightsVerified:true,
 derivedLicenseVerified:true,individualStocksUsed:0,scoreMethod:'ETF_ONLY_PROXY',
 sourcePriceMode:'UNADJUSTED_HOURLY_CLOSE_PROXY_DISCLOSED',
 weights:{trend:0.4,relativeStrength:0.2,volatility:0.4},pairWeight:0.5,
 methodologyVersion:'ETF_ONLY_T40_R20_V40_PAIR50',
 sourceVersion:'seed-fixture',sourceStoredAt:new Date(storedAt-1000).toISOString(),
 publishedAt:new Date(storedAt-500).toISOString(),observationDate:'2026-11-14',
 themes:themeEtfs};
const employment=buildEmploymentR6OneYearReadModel([],
 {asOfDate:'2026-11-14',sourceStoredAt:storedAt-1000});
const calendar={status:'READY',events:[],token:'PRIVATE_SHOULD_NEVER_LEAK'};
const storedBodies={inflation19:inflationEnvelope(inflation19Payload),
 inflation7:inflationEnvelope(inflation7Payload),
 calendar,theme:themeSeed,employment};
const apiBodies={inflation19:inflation19Payload,inflation7:inflation7Payload,
 calendar,theme:{...themeSeed,sourceVersion:'rolling-v2',
 themes:[...themeEtfs,{theme:'AI 반도체',etfs:['SMH','SOXX']}]},
 employment};
const samples=Object.fromEntries(keyOrder.map(k=>[k,{
 body:JSON.stringify(storedBodies[k]),stored_at:storedAt}]));
function fixture({mutate,failDb,failApi,missing}={}){
 const seen=[];const counts=Object.create(null);
 const db={prepare(sql){assert.match(sql,/^SELECT body,stored_at FROM (?:market_public_snapshots_v1|public_feed_snapshots_v1) WHERE /);return{bind(...values){
  const slot=keyOrder.find(k=>W05_FIXED_READS[k].sql===sql&&JSON.stringify(W05_FIXED_READS[k].bind)===JSON.stringify(values));
  assert.ok(slot,'nonallowlisted exact SELECT');seen.push(slot);
  return{async first(){counts[slot]=(counts[slot]??0)+1;
   if(slot===failDb)throw Error('SECRET_SQL_EXCEPTION');
   if(slot===missing)return null;
   const row={...samples[slot]};if(mutate&&mutate(slot,row,counts[slot])===null)return null;return row;}};
 }}}};
 const readApi=async slot=>{if(slot===failApi)throw Error('API_KEY_SECRET_EXCEPTION');
  return{statusCode:200,body:apiBodies[slot]};};
 return{db,seen,counts,readApi};
}
// Pass only permitted owner inputs. The fixture's counters/seen arrays must
// never become executable option surface in the production adapter.
const run=(fixture,options={})=>collectFiveKeyInPlace({db:fixture.db,readApi:fixture.readApi,...options});
test('exact fixed queries are narrow and enumerated once',()=>{
 assert.deepEqual(Object.keys(W05_FIXED_READS),keyOrder);
 assert.deepEqual(W05_FIXED_READS.calendar.bind,['output','release-calendar','current']);
 assert.equal(new Set(keyOrder.map(k=>W05_FIXED_READS[k].bind.join('|'))).size,5);
});
test('all five approved keys are read twice but no values escape results',async()=>{
 const f=fixture();const res=await run(f,{clock});
 assert.equal(res.schema,W05_INPLACE_SCHEMA);
 assert.equal(res.status,'PARTIAL_OR_UNVERIFIED'); // Theme overlays require separate provenance.
 assert.equal(res.runtimeVerified,false);assert.equal(res.ownerAuthorizationVerified,false);
 assert.equal(res.deploymentIdentityVerified,false);assert.equal(res.keysChecked,5);
 assert.deepEqual(res.results.map(x=>x.slot),keyOrder);
 assert.deepEqual(Object.values(f.counts),Array(5).fill(2));
 assert.deepEqual(res.results.map(x=>x.status),[
  'STRUCTURAL_MATCH_NOT_RUNTIME_PROOF',
  'STRUCTURAL_MATCH_NOT_RUNTIME_PROOF',
  'STRUCTURAL_MATCH_NOT_RUNTIME_PROOF',
  'SEED_READBACK_ONLY_COMPOSED_UNVERIFIED',
  'STRUCTURAL_MATCH_NOT_RUNTIME_PROOF']);
 assert.equal(res.results[3].rollingAndSidecarsVerified,false);
 assert.equal(res.results[0].d1ReadAt,new Date(stamp).toISOString());
 assert.equal(res.results[0].apiObservedAt,new Date(stamp).toISOString());
 assert.doesNotMatch(JSON.stringify(res),/PRIVATE_SHOULD_NEVER_LEAK|PUBLIC_TOKEN_SHOULD_NEVER_LEAK|SECRET|"body"/);
});
test('D1 row changed after public GET produces source drift without comparing',async()=>{
 const f=fixture({mutate:(slot,row,n)=>{if(slot==='inflation19'&&n===2)row.body='CHANGED_SENSITIVE';}});
 const res=await run(f,{clock});
 assert.equal(res.results[0].status,'SOURCE_DRIFT_UNVERIFIED');
 assert.equal(res.results[1].status,'STRUCTURAL_MATCH_NOT_RUNTIME_PROOF');
 assert.equal(res.status,'PARTIAL_OR_UNVERIFIED');
});
test('D1 row disappeared or stored_at changed is not a match',async()=>{
 const f=fixture({mutate:(slot,row,n)=>{if(slot==='inflation7'&&n===2)row.stored_at+=1;}});
 const res=await run(f,{clock});
 assert.equal(res.results[1].status,'SOURCE_DRIFT_UNVERIFIED');
});
test('row removed after API GET is source drift, not missing-row proof',async()=>{
 const f=fixture({mutate:(slot,row,n)=>slot==='calendar'&&n===2?null:undefined});
 const res=await run(f,{clock});
 assert.equal(res.results[2].status,'SOURCE_DRIFT_UNVERIFIED');
});
test('clock moving backwards invalidates claimed observation ordering',async()=>{
 const f=fixture();let tick=0;const jump=()=>{tick++;return tick===2?stamp-3000:stamp;};
 const res=await run(f,{clock:jump});
 assert.equal(res.results[0].status,'OBSERVATION_ORDER_UNVERIFIED');
});
test('missing row in both reads is reported as missing but never verified',async()=>{
 const f=fixture({missing:'calendar'});const res=await run(f,{clock});
 assert.equal(res.results[2].status,'CONFIRMED_D1_ROW_MISSING');assert.equal(res.runtimeVerified,false);
});
test('read failures are separated by exact slot and secrets are discarded',async()=>{
 const d=fixture({failDb:'inflation7'}),r=await run(d,{clock});
 assert.equal(r.results[1].status,'D1_READ_UNVERIFIED');
 const h=fixture({failApi:'theme'}),res=await run(h,{clock});
 assert.equal(res.results[3].status,'PUBLIC_API_READ_UNVERIFIED');
 assert.doesNotMatch(JSON.stringify(res),/SECRET_SQL_EXCEPTION|API_KEY_SECRET_EXCEPTION/);
});
test('malformed body and oversized raw row reject without return of bytes',async()=>{
 for(const body of [null,'x'.repeat(1800001),'가'.repeat(600001)]){
  const f=fixture({mutate:(slot,row)=>{if(slot==='employment')row.body=body;}});
  const res=await run(f,{clock});
  assert.equal(res.results[4].status,'D1_READ_UNVERIFIED');
  assert.equal(res.runtimeVerified,false);
 }
});
test('caller cannot replace the fixed comparer or provide unknown execution options',async()=>{
 const f=fixture();
 await assert.rejects(run(f,{clock,compare:()=>({status:'PASS'})}),
  /W05_UNSUPPORTED_OPTION/);
 await assert.rejects(run(f,{clock,sql:'SELECT * FROM elsewhere'}),
  /W05_UNSUPPORTED_OPTION/);
});
test('missing owner-supplied readers do not create implicit access',async()=>{
 await assert.rejects(collectFiveKeyInPlace(),/W05_OWNER_SUPPLIED_READERS_REQUIRED/);
});

test('complete two-read window expires if the D1 recheck finishes late',async()=>{
 const f=fixture();let tick=0;
 const slowClock=()=>++tick===3?stamp+120001:stamp;
 const res=await run(f,{clock:slowClock});
 assert.equal(res.results[0].status,'OBSERVATION_WINDOW_UNVERIFIED');
 assert.equal(res.runtimeVerified,false);
});
test('HTTP 503 is reported as API_NOT_READY even with syntactically valid D1',async()=>{
 const f=fixture();
 const readApi=async slot=>slot==='calendar'
  ?{statusCode:503,body:{reason:'STORED_DATA_STALE'}}
  :{statusCode:200,body:apiBodies[slot]};
 const res=await run(f,{readApi,clock});
 assert.equal(res.results[2].status,'API_NOT_READY');
 assert.equal(res.results[2].httpStatus,503);
});


test('W05 protected adapter cannot return seed-aligned when rights flags are absent',async()=>{
 const f=fixture({mutate:(slot,row)=>{
  if(slot==='theme'){const value=JSON.parse(row.body);delete value.derivedLicenseVerified;
   row.body=JSON.stringify(value);}
 }});
 const result=await run(f,{clock});
 assert.equal(result.results[3].status,'THEME_SEED_POLICY_UNVERIFIED');
 assert.equal(result.results[3].rollingAndSidecarsVerified,false);
 assert.equal(result.runtimeVerified,false);
});
test('W05 protected adapter treats 200-with-UNAVAILABLE as public readiness failure',async()=>{
 const f=fixture();
 const readApi=async slot=>({
  statusCode:200,body:slot==='theme'?{...apiBodies.theme,status:'UNAVAILABLE'}:apiBodies[slot],
 });
 const result=await run(f,{clock,readApi});
 assert.equal(result.results[3].status,'API_NOT_READY');
 assert.equal(result.runtimeVerified,false);
});

test('in-place two-pass W05 rejects a matching bogus 29-ID employment response',async()=>{
 const broken=structuredClone(employment);
 broken.indicators[0].id='NOT_AN_APPROVED_SERIES';
 const f=fixture({mutate:(slot,row)=>{
  if(slot==='employment')row.body=JSON.stringify(broken);
 }});
 const res=await run(f,{clock,readApi:async slot=>({
  statusCode:200,body:slot==='employment'?broken:apiBodies[slot],
 })});
 assert.equal(f.counts.employment,2,'both protected D1 reads must still occur');
 assert.equal(res.results[4].status,'INVALID_EMPLOYMENT_METADATA');
 assert.equal(res.runtimeVerified,false);
 assert.equal(res.status,'PARTIAL_OR_UNVERIFIED');
 assert.doesNotMatch(JSON.stringify(res),/NOT_AN_APPROVED_SERIES|indicators|formulaHash/);
});

test('W05 protected 5-key adapter must not certify matching invalid inflation Reader rows',async()=>{
 for(const slot of ['inflation19','inflation7']){
  const bad=structuredClone(storedBodies[slot]);
  bad.payload.indicators[0].id='INVALID_SERIES_IN_SAVED_ROW';
  const f=fixture({mutate:(name,row)=>{
   if(name===slot)row.body=JSON.stringify(bad);
  }});
  const res=await run(f,{clock,readApi:async name=>({
   statusCode:200,body:name===slot?bad.payload:apiBodies[name],
  })});
  const verdict=res.results.find(row=>row.slot===slot);
  assert.equal(f.counts[slot],2,'two exact D1 reads without any write');
  assert.equal(verdict.status,'INVALID_INFLATION_PUBLIC_METADATA');
  assert.equal(res.runtimeVerified,false);
  assert.doesNotMatch(JSON.stringify(res),/INVALID_SERIES_IN_SAVED_ROW|indicators|payload/);
 }
});
