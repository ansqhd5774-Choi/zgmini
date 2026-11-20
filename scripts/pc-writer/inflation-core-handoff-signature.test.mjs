import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {verifySignedCoreHandoff,verifiedCoreHandoffBytes}
 from './inflation-core-handoff-signature.mjs';
const now=Date.UTC(2026,10,21);
const expectedSourceSha='a'.repeat(40);
const data=()=>({schema:'ZGMINI_W01_CORE_HANDOFF_SIGNED_V1',
 requestId:'c131d4c4-b788-4a1c-9f60-146dd6f7abb1',
 nonce:'7c4e0b76-153d-41af-99d4-ec13a8394c89',
 manifestSha256:'b'.repeat(64),controlSha:'c'.repeat(40),
 sourceSha:expectedSourceSha,issueNumber:100,
 issuedAt:now,expiresAt:now+1_200_000,signature:''});
function fixture(){
 const {privateKey,publicKey}=generateKeyPairSync('ed25519');
 const d=data();
 // construct only a well-formed dummy signature for canonical bytes
 d.signature=Buffer.alloc(64).toString('base64');
 d.signature=sign(null,verifiedCoreHandoffBytes(d),privateKey).toString('base64');
 return {envelope:d,publicKey,privateKey};
}
test('signed exact V3 handoff remains a non-authorizing candidate',()=>{
 const f=fixture();
 const result=verifySignedCoreHandoff({envelope:f.envelope,pinnedPublicKey:f.publicKey,
  expectedSourceSha,now});
 assert.equal(result.status,'SIGNATURE_VERIFIED_CANDIDATE_ONLY');
 assert.equal(result.authorizesExecution,false);
 assert.equal(result.requestId,f.envelope.requestId);
});
test('wrong key, drifted manifest, new source and unsigned JSON are denied',()=>{
 const f=fixture(),other=generateKeyPairSync('ed25519');
 assert.throws(()=>verifySignedCoreHandoff({envelope:f.envelope,
  pinnedPublicKey:other.publicKey,expectedSourceSha,now}),
  {code:'INFL_CORE_STATIC_SIGNED_HANDOFF_DENIED_STOP'});
 for(const change of [{manifestSha256:'d'.repeat(64)},
  {sourceSha:'e'.repeat(40)},{nonce:'a'.repeat(8)+'-'.repeat(4)},
  {issueNumber:101},{signature:Buffer.alloc(64).toString('base64')} ]){
  assert.throws(()=>verifySignedCoreHandoff({envelope:{...f.envelope,...change},
   pinnedPublicKey:f.publicKey,expectedSourceSha,now}),
   {code:'INFL_CORE_STATIC_SIGNED_HANDOFF_DENIED_STOP'});
 }
});
test('expired, future, mismatched Core source and extra fields are denied',()=>{
 const f=fixture();
 for(const options of [
  {now:now+1_200_000},{now:now-60_001},
  {expectedSourceSha:'d'.repeat(40)}
 ]){
  assert.throws(()=>verifySignedCoreHandoff({envelope:f.envelope,
   pinnedPublicKey:f.publicKey,expectedSourceSha,now,...options}),
   {code:'INFL_CORE_STATIC_SIGNED_HANDOFF_DENIED_STOP'});
 }
 assert.throws(()=>verifySignedCoreHandoff({envelope:{...f.envelope,
  allowTaskChanges:true},pinnedPublicKey:f.publicKey,expectedSourceSha,now}),
  {code:'INFL_CORE_STATIC_SIGNED_HANDOFF_DENIED_STOP'});
});
