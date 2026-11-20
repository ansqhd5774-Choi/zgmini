// Verify externally signed W01 V3 handoff inside the already Core-owned
// process; dormant until an approved pinned receiver and key are installed.
// No provider/Writer I/O. A local JSON alone is NOT authority.
// Public key must come from approved *installed* source, never from envelope.
import {createPublicKey,verify} from 'node:crypto';
export const W01_HANDOFF_ENVELOPE_SCHEMA='ZGMINI_W01_CORE_HANDOFF_SIGNED_V1';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{64}$/i;
const SHA40=/^[a-f0-9]{40}$/i;
const STOP='INFL_CORE_STATIC_SIGNED_HANDOFF_DENIED_STOP';
const fail=()=>{throw Object.assign(new Error(STOP),{code:STOP});};
const exact=(o,fields)=>o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).length===fields.length&&fields.every(k=>Object.hasOwn(o,k));
const FIELDS=['schema','requestId','nonce','manifestSha256','controlSha',
 'sourceSha','issueNumber','issuedAt','expiresAt','signature'];
export function verifiedCoreHandoffBytes(e){
 if(!exact(e,FIELDS)||e.schema!==W01_HANDOFF_ENVELOPE_SCHEMA||
  !UUID.test(e.requestId??'')||!UUID.test(e.nonce??'')||
  !SHA.test(e.manifestSha256??'')||!SHA40.test(e.controlSha??'')||
  !SHA40.test(e.sourceSha??'')||
  !Number.isSafeInteger(e.issueNumber)||e.issueNumber<1||
  !Number.isSafeInteger(e.issuedAt)||!Number.isSafeInteger(e.expiresAt)||
  e.issuedAt<1||e.expiresAt<=e.issuedAt||
  e.expiresAt-e.issuedAt>20*60*1000||
  typeof e.signature!=='string'||
  !/^[A-Za-z0-9+/]{86}==$/.test(e.signature))fail();
 return Buffer.from(JSON.stringify([
  'ZGMINI/W01/CORE_HANDOFF/SIGNED_V1',
  e.schema,e.requestId,e.nonce,e.manifestSha256,e.controlSha,
  e.sourceSha,e.issueNumber,e.issuedAt,e.expiresAt
 ]),'utf8');
}
export function verifySignedCoreHandoff({
 envelope,pinnedPublicKey,expectedSourceSha,now=Date.now(),
}={}){
 if(!SHA40.test(expectedSourceSha??'')||
  !Number.isSafeInteger(now)||now<1)fail();
 const bytes=verifiedCoreHandoffBytes(envelope);
 if(envelope.sourceSha!==expectedSourceSha||
  envelope.issuedAt>now+60_000||envelope.expiresAt<=now)fail();
 let key,signature;
 try{
  key=createPublicKey(pinnedPublicKey);
  signature=Buffer.from(envelope.signature,'base64');
 }catch{fail();}
 if(key.asymmetricKeyType!=='ed25519'||signature.length!==64||
  signature.toString('base64')!==envelope.signature||
  !verify(null,bytes,key,signature))fail();
 // Reusability is intentionally NOT asserted here. The installed trusted
 // receiver must reconcile an exact request journal and Writer lease.
 return Object.freeze({status:'SIGNATURE_VERIFIED_CANDIDATE_ONLY',
  requestId:envelope.requestId,manifestSha256:envelope.manifestSha256,
  sourceSha:envelope.sourceSha,issueNumber:envelope.issueNumber,
  nonce:envelope.nonce,authorizesExecution:false});
}
