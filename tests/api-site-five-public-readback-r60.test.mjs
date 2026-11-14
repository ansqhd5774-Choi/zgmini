import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
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
const inflationPayload={schemaVersion:'synthetic-r1',status:'PARTIAL',score:null,sourceVersion:'fixture-source-v1',sourceStoredAt:storedAt-1000,indicators:[]};
const inflationEnvelope=payload=>({payload,projection:{status:'READY',builtAt:storedAt,
  sourceVersion:payload.sourceVersion,sourceStoredAt:payload.sourceStoredAt}});
const employment={kind:'EMPLOYMENT_R6_ONE_YEAR_STORED_DISPLAY_R1',asOfDate:'2026-11-13',sourceStoredAt:storedAt-1000,
  formulaHash:'sha256:fixture',methodologyVersion:'EMP-R6-FORMULA-R2',indicators:Array.from({length:29},(_,i)=>({id:i+1}))};
const themePairs=[
 {theme:'로봇·자동화',etfs:['BOTZ','ROBO']},
 {theme:'클라우드·SaaS',etfs:['SKYY','CLOU']},
 {theme:'자율주행',etfs:['DRIV','BOTZ']},
 {theme:'원전·SMR',etfs:['NLR','URA']},
 {theme:'방산',etfs:['ITA','SHLD']},
 {theme:'핀테크',etfs:['FINX','ARKF']},
 {theme:'사이버보안',etfs:['CIBR','BUG']},
];
const theme={version:'THEME_ETF_ONLY_R144_252_PUBLIC_V1',status:'READY',
 publicationAuthorized:true,upstreamCommercialRightsVerified:true,
 derivedLicenseVerified:true,individualStocksUsed:0,scoreMethod:'ETF_ONLY_PROXY',
 sourcePriceMode:'UNADJUSTED_HOURLY_CLOSE_PROXY_DISCLOSED',
 weights:{trend:0.4,relativeStrength:0.2,volatility:0.4},pairWeight:0.5,
 methodologyVersion:'ETF_ONLY_T40_R20_V40_PAIR50',
 sourceVersion:'theme-fixture',sourceStoredAt:'2026-11-13T22:00:00.000Z',
 publishedAt:'2026-11-13T23:00:00.000Z',observationDate:'2026-11-13',
 themes:themePairs.map(t=>({...t,latestScore:42,history:[]}))};
const composedTheme=()=>({...theme,status:'READY',sourceVersion:'rolling-fixture-new-version',
 themes:[...themePairs.map(t=>({...t,score:47,history:[]})),
  {theme:'AI 반도체',etfs:['SMH','SOXX'],score:47,history:[]}]});

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
test('inflation 19 and candidates 7 use the identical verified payload envelope rule',()=>{
 for(const slot of ['inflation19','inflation7']){
  const row=d1(slot,inflationEnvelope(inflationPayload));
  assert.equal(check(slot,row,api(inflationPayload)).status,'STRUCTURAL_MATCH_NOT_RUNTIME_PROOF');
  assert.equal(check(slot,row,api({...inflationPayload,sourceVersion:'other'})).status,'PUBLIC_PAYLOAD_MISMATCH');
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
test('theme seed identity can align while rolling and optional sidecars remain unverified',()=>{
 const r=check('theme',d1('theme',theme),api(composedTheme()));
 assert.equal(r.status,'SEED_READBACK_ONLY_COMPOSED_UNVERIFIED');
 assert.equal(r.seedIdentityShapeAligned,true);
 assert.equal(r.rollingAndSidecarsVerified,false);
 assert.equal(r.seedSourceVersion,theme.sourceVersion);
});
test('503 stale is a public API readiness failure, not a D1 mismatch verdict',()=>{
 const r=check('theme',d1('theme',theme),{observedAt:apiAt,statusCode:503,body:{reason:'STORED_DATA_STALE'}});
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

test('theme public output must preserve immutable seed version and methodology',()=>{
 for(const [field,value] of [['version','different'],['methodologyVersion','INVALID']]){
  const r=check('theme',d1('theme',theme),api({...composedTheme(),[field]:value}));
  assert.equal(r.status,'THEME_SEED_LINEAGE_MISMATCH');
  assert.equal(r.field,field);
  assert.equal(r.rollingAndSidecarsVerified,undefined);
 }
});
test('different rolling sourceVersion is valid, missing sourceVersion is not evidence',()=>{
 const r=check('theme',d1('theme',theme),api(composedTheme()));
 assert.equal(r.status,'SEED_READBACK_ONLY_COMPOSED_UNVERIFIED');
 const lost=check('theme',d1('theme',theme),api({...composedTheme(),sourceVersion:''}));
 assert.equal(lost.status,'THEME_SEED_LINEAGE_MISMATCH');
 assert.equal(lost.field,'sourceVersion');
});
test('seed base ETF identities must be preserved across rolling and sidecars',()=>{
 for(const mutate of [
  p=>{p.themes[0].etfs=['SPY','ROBO'];},
  p=>{p.themes[1].theme='changed theme';},
  p=>{p.themes=[...p.themes].slice(1);},
  p=>{p.themes=[...p.themes].reverse();},
 ]){const payload=composedTheme();mutate(payload);
  const r=check('theme',d1('theme',theme),api(payload));
  assert.equal(r.status,'THEME_SEED_LINEAGE_MISMATCH');
  assert.equal(r.field,'baseThemes');
 }
});
test('partial or malformed theme seed metadata never becomes a structural match',()=>{
 for(const mutate of [
  p=>{p.sourceVersion='';},
  p=>{p.version='';},
  p=>{p.methodologyVersion='';},
  p=>{p.themes=p.themes.slice(0,6);},
  p=>{p.themes[0].etfs=[];},
 ]){const saved=JSON.parse(JSON.stringify(theme));mutate(saved);
  assert.equal(check('theme',d1('theme',saved),api(composedTheme())).status,'INVALID_THEME_SEED_METADATA');
 }
});


test('W05 theme: seed without approved publication rights must not be classed as aligned',()=>{
 const fields=['publicationAuthorized','upstreamCommercialRightsVerified','derivedLicenseVerified'];
 for(const field of fields){
  const seed=JSON.parse(JSON.stringify(theme));delete seed[field];
  const result=check('theme',d1('theme',seed),api(composedTheme()));
  assert.equal(result.status,'THEME_SEED_POLICY_UNVERIFIED',field);
  assert.notEqual(result.status,'SEED_READBACK_ONLY_COMPOSED_UNVERIFIED');
 }
});
test('W05 theme: wrong seed scoring method, price mode or immutable ETF roster is not aligned',()=>{
 for(const mutate of [
  s=>{s.sourcePriceMode='SILENT_TOTAL_RETURN';},
  s=>{s.scoreMethod='STOCK_PICKING';},
  s=>{s.individualStocksUsed=1;},
  s=>{s.weights.volatility=0.3;},
  s=>{s.pairWeight=0.6;},
  s=>{s.version='FAKE_THEME_SEED_VERSION';},
  s=>{s.methodologyVersion='FAKE_METHODOLOGY';},
  s=>{s.themes[0].etfs=['SPY','ROBO'];}
 ]){const seed=JSON.parse(JSON.stringify(theme));mutate(seed);
  assert.equal(check('theme',d1('theme',seed),api({...composedTheme(),version:seed.version,
   methodologyVersion:seed.methodologyVersion,
   themes:[...seed.themes,...composedTheme().themes.slice(7)]})).status,
   'THEME_SEED_POLICY_UNVERIFIED');
 }
});
test('W05 theme: 200 HTTP with status UNAVAILABLE or PENDING is not a composed alignment',()=>{
 for(const status of ['UNAVAILABLE','PENDING','unavailable']){
  const response=api({...composedTheme(),status});
  assert.equal(check('theme',d1('theme',theme),response).status,'API_NOT_READY');
 }
});
