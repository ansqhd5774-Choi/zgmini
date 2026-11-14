import test from 'node:test';
import assert from 'node:assert/strict';
import {collectFiveKeyInPlace,W05_FIXED_READS,W05_INPLACE_SCHEMA} from '../scripts/api-site/five-key-inplace-readback-prework-r12.mjs';
const keyOrder=['inflation19','inflation7','calendar','theme','employment'];
const stamp=Date.parse('2026-11-15T00:00:00.000Z');
const clock=()=>stamp;
const samples=Object.fromEntries(keyOrder.map(k=>[k,{body:JSON.stringify({source:'private fixture',token:'PRIVATE_SHOULD_NEVER_LEAK'}),stored_at:stamp-2000}]));
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
 const readApi=async slot=>{if(slot===failApi)throw Error('API_KEY_SECRET_EXCEPTION');return{statusCode:200,body:{status:'READY',secret:'PUBLIC_TOKEN_SHOULD_NEVER_LEAK'}}};
 const compare=(slot,{d1,api})=>({status:d1.exists?'STRUCTURAL_MATCH_NOT_RUNTIME_PROOF':'CONFIRMED_D1_ROW_MISSING',
    d1BodySha256:'a'.repeat(64),d1StoredAt:d1.stored_at,d1ReadAt:d1.readAt,apiObservedAt:api.observedAt,foo:d1.body,apiBody:api.body,secret:'never return'});
 return{db,seen,counts,readApi,compare};
}
test('exact fixed queries are narrow and enumerated once',()=>{
 assert.deepEqual(Object.keys(W05_FIXED_READS),keyOrder);
 assert.deepEqual(W05_FIXED_READS.calendar.bind,['output','release-calendar','current']);
 assert.equal(new Set(keyOrder.map(k=>W05_FIXED_READS[k].bind.join('|'))).size,5);
});
test('all five approved keys are read twice but no values escape results',async()=>{
 const f=fixture();const res=await collectFiveKeyInPlace({...f,clock});
 assert.equal(res.schema,W05_INPLACE_SCHEMA);
 assert.equal(res.status,'LOCAL_STRUCTURAL_MATCH_OWNER_ATTESTATION_PENDING');
 assert.equal(res.runtimeVerified,false);assert.equal(res.ownerAuthorizationVerified,false);
 assert.equal(res.deploymentIdentityVerified,false);assert.equal(res.keysChecked,5);
 assert.deepEqual(res.results.map(x=>x.slot),keyOrder);
 assert.deepEqual(Object.values(f.counts),Array(5).fill(2));
 assert.deepEqual(res.results.map(x=>x.status),Array(5).fill('STRUCTURAL_MATCH_NOT_RUNTIME_PROOF'));
 assert.equal(res.results[3].rollingAndSidecarsVerified,false);
 assert.equal(res.results[0].d1ReadAt,new Date(stamp).toISOString());
 assert.equal(res.results[0].apiObservedAt,new Date(stamp).toISOString());
 assert.doesNotMatch(JSON.stringify(res),/PRIVATE_SHOULD_NEVER_LEAK|PUBLIC_TOKEN_SHOULD_NEVER_LEAK|SECRET|"body"/);
});
test('D1 row changed after public GET produces source drift without comparing',async()=>{
 let compared=0;const f=fixture({mutate:(slot,row,n)=>{if(slot==='inflation19'&&n===2)row.body='CHANGED_SENSITIVE';}});
 const res=await collectFiveKeyInPlace({...f,compare:()=>{compared++;return {status:'PASS'}} ,clock});
 assert.equal(res.results[0].status,'SOURCE_DRIFT_UNVERIFIED');
 assert.equal(compared,4);assert.equal(res.status,'PARTIAL_OR_UNVERIFIED');
});
test('D1 row disappeared or stored_at changed is not a match',async()=>{
 const f=fixture({mutate:(slot,row,n)=>{if(slot==='inflation7'&&n===2)row.stored_at+=1;}});
 const res=await collectFiveKeyInPlace({...f,clock});
 assert.equal(res.results[1].status,'SOURCE_DRIFT_UNVERIFIED');
});
test('row removed after API GET is source drift, not missing-row proof',async()=>{
 const f=fixture({mutate:(slot,row,n)=>slot==='calendar'&&n===2?null:undefined});
 const res=await collectFiveKeyInPlace({...f,clock});
 assert.equal(res.results[2].status,'SOURCE_DRIFT_UNVERIFIED');
});
test('clock moving backwards invalidates claimed observation ordering',async()=>{
 const f=fixture();let tick=0;const jump=()=>{tick++;return tick===2?stamp-3000:stamp;};
 const res=await collectFiveKeyInPlace({...f,clock:jump});
 assert.equal(res.results[0].status,'OBSERVATION_ORDER_UNVERIFIED');
});
test('missing row in both reads is reported as missing but never verified',async()=>{
 const f=fixture({missing:'calendar'});const res=await collectFiveKeyInPlace({...f,clock});
 assert.equal(res.results[2].status,'CONFIRMED_D1_ROW_MISSING');assert.equal(res.runtimeVerified,false);
});
test('read failures are separated by exact slot and secrets are discarded',async()=>{
 const d=fixture({failDb:'inflation7'}),r=await collectFiveKeyInPlace({...d,clock});
 assert.equal(r.results[1].status,'D1_READ_UNVERIFIED');
 const h=fixture({failApi:'theme'}),res=await collectFiveKeyInPlace({...h,clock});
 assert.equal(res.results[3].status,'PUBLIC_API_READ_UNVERIFIED');
 assert.doesNotMatch(JSON.stringify(res),/SECRET_SQL_EXCEPTION|API_KEY_SECRET_EXCEPTION/);
});
test('malformed body and oversized raw row reject without return of bytes',async()=>{
 for(const body of [null,'x'.repeat(1800001)]){
  const f=fixture({mutate:(slot,row)=>{if(slot==='employment')row.body=body;}});
  const res=await collectFiveKeyInPlace({...f,clock});
  assert.equal(res.results[4].status,'D1_READ_UNVERIFIED');
  assert.equal(res.runtimeVerified,false);
 }
});
test('untrusted comparator cannot return arbitrary secret fields',async()=>{
 const f=fixture();const res=await collectFiveKeyInPlace({...f,clock,compare:()=>({status:'SECRET ACCESS',d1BodySha256:'BAD',secret:'PRIVATE'})});
 assert.ok(res.results.every(x=>x.status==='COMPARISON_UNCLASSIFIED'));
 assert.doesNotMatch(JSON.stringify(res),/PRIVATE|SECRET/);
});
test('missing owner-supplied readers do not create implicit access',async()=>{
 await assert.rejects(collectFiveKeyInPlace(),/W05_OWNER_SUPPLIED_READERS_REQUIRED/);
});
