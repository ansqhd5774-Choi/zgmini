import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {comparePublicReadback,PUBLIC_READBACK_SLOTS} from '../scripts/api-site/compare-five-public-readbacks-r1.mjs';
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
const theme={sourceVersion:'theme-fixture',sourceStoredAt:'2026-11-13T22:00:00.000Z',publishedAt:'2026-11-13T23:00:00.000Z',observationDate:'2026-11-13',themes:[]};

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
test('theme seed alone cannot certify optional rolling and sidecar composition',()=>{
 const r=check('theme',d1('theme',theme),api({...theme,status:'READY',themes:[{theme:'overlay'}]}));
 assert.equal(r.status,'SEED_READBACK_ONLY_COMPOSED_UNVERIFIED');
 assert.equal(r.rollingAndSidecarsVerified,false);
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
