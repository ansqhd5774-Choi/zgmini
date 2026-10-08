import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {openStore,hash} from './store.mjs';
import {buildIranProgress} from '../../lib/iran-progress/r13.mjs';

const targets=['relations.IRN_ISR','relations.IRN_USA','nuclear','coverage.IRN_ISR','coverage.IRN_USA','coverage.LINKED','hormuzCoverage','aisRestriction'];
const allowed={relation:['verified','materialPending','diplomacyScore','lastVerifiedAt','violationVerified','activeCombatVerified','endedVerified','implementationVerified','mutualAgreementVerified','effectiveAt','continuousFrom','coverageThrough','endedAt'],
 nuclear:['verified','materialPending','score','lastVerifiedAt','evidenceThrough'],
 coverage:['status','parserOk','classificationOk','materialPending','requiredSources','knownGaps','coverageFrom','coverageThrough','lastVerifiedAt'],
 restriction:['verified','conflicting','materialPending','state','lastVerifiedAt','effectiveAt','coverageThrough','evidence','restrictionsLiftedVerified','normalOperationVerified']};
const category=target=>target.startsWith('relations.')?'relation':target==='nuclear'?'nuclear':target==='aisRestriction'?'restriction':'coverage';
function validateAssertion(a,now){
 if(a?.version!=='IRAN_VERIFIED_INPUT_ASSERTION_R14'||!targets.includes(a.target)||a.status!=='VERIFIED'
  ||a.verificationOrigin!=='FIXED_RULE'||typeof a.parserVersion!=='string'||!a.parserVersion
  ||!Number.isSafeInteger(a.verifiedAt)||a.verifiedAt<=0||a.verifiedAt>now||!a.value
  ||a.valueHash!==hash(a.value)||!Array.isArray(a.evidence)||!a.evidence.length)throw Error('INPUT_ASSERTION_INVALID');
 const kind=category(a.target),v=a.value;
 if(Object.keys(v).some(k=>!allowed[kind].includes(k)))throw Error('INPUT_ASSERTION_FIELD_INVALID');
 if(!Number.isSafeInteger(v.lastVerifiedAt)||v.lastVerifiedAt<=0||v.lastVerifiedAt>a.verifiedAt)throw Error('INPUT_ASSERTION_TIME_MISMATCH');
 for(const [k,n] of Object.entries(v))if(/At$|Through$|From$/.test(k)&&(!Number.isSafeInteger(n)||n<=0||n>now))throw Error('INPUT_ASSERTION_DATE_INVALID');
 if(kind==='relation'&&(v.verified!==true||typeof v.materialPending!=='boolean'||![0,20,40,60,80,100].includes(v.diplomacyScore)))throw Error('INPUT_RELATION_INVALID');
 if(kind==='nuclear'&&(v.verified!==true||typeof v.materialPending!=='boolean'||![0,20,40,60,80,100].includes(v.score)||!Number.isSafeInteger(v.evidenceThrough)))throw Error('INPUT_NUCLEAR_INVALID');
 if(kind==='coverage'&&(v.status!=='VERIFIED'||v.parserOk!==true||v.classificationOk!==true||v.materialPending!==0
  ||!Array.isArray(v.knownGaps)||v.knownGaps.length||!Array.isArray(v.requiredSources)||!v.requiredSources.length
  ||!v.requiredSources.every(s=>typeof s.id==='string'&&s.status==='VERIFIED'&&s.termsApproved===true)
  ||!Number.isSafeInteger(v.coverageFrom)||!Number.isSafeInteger(v.coverageThrough)||v.coverageFrom>v.coverageThrough))throw Error('INPUT_COVERAGE_INVALID');
 if(kind==='restriction'&&(v.verified!==true||typeof v.conflicting!=='boolean'||typeof v.materialPending!=='boolean'
  ||!['STOPPED','EMERGENCY_ESCORT_ONLY','RESTRICTED_COMMERCIAL','MAJOR_RESTRICTIONS_LIFTED','NORMAL_CONFIRMED'].includes(v.state)
  ||!Number.isSafeInteger(v.effectiveAt)||!Number.isSafeInteger(v.coverageThrough)
  ||!Array.isArray(v.evidence)||!['UKMTO','MARAD'].every(id=>v.evidence.some(e=>e.source===id&&e.verified===true&&typeof e.reference==='string'&&e.reference))))throw Error('INPUT_RESTRICTION_INVALID');
}

// The caller supplies immutable assertion IDs, never values or verification flags.
// Source-specific fixed-rule review must create assertions before this linker runs.
export function linkVerifiedInputs(store,ids,now){
 if(!Array.isArray(ids)||!ids.length||ids.length>32||ids.some(id=>typeof id!=='string'||!/^input-assertion:[a-f0-9]{64}$/.test(id))||new Set(ids).size!==ids.length)throw Error('INPUT_ASSERTION_IDS_INVALID');
 store.db.exec('BEGIN IMMEDIATE');
 try{
  const old=store.getCheckpoint('verified-input')??{},input=structuredClone(old),seen=new Set();
  const oldProvenance=store.getCheckpoint('verified-input-provenance-r14')??{};
  const provenance={...oldProvenance};
  for(const id of ids){
   const row=store.db.prepare('SELECT body FROM sources WHERE id=?').get(id);if(!row)throw Error('INPUT_ASSERTION_NOT_STORED');
   const a=JSON.parse(row.body);if(id!=='input-assertion:'+hash(a))throw Error('INPUT_ASSERTION_ID_MISMATCH');validateAssertion(a,now);
   if(seen.has(a.target))throw Error('INPUT_ASSERTION_TARGET_DUPLICATE');seen.add(a.target);
   for(const e of a.evidence){
    if(typeof e.sourceId!=='string'||typeof e.bodyHash!=='string')throw Error('INPUT_ASSERTION_EVIDENCE_INVALID');
    const s=store.db.prepare('SELECT body FROM sources WHERE id=?').get(e.sourceId);
    if(!s||hash(JSON.parse(s.body))!==e.bodyHash)throw Error('INPUT_ASSERTION_EVIDENCE_MISMATCH');
   }
   const parts=a.target.split('.'),previous=parts.length===2?input[parts[0]]?.[parts[1]]:input[a.target];
   if(previous&&Number.isSafeInteger(previous.lastVerifiedAt)&&previous.lastVerifiedAt>a.value.lastVerifiedAt)throw Error('INPUT_ASSERTION_STALE_OVERWRITE');
   if(previous&&previous.lastVerifiedAt===a.value.lastVerifiedAt&&hash(previous)!==a.valueHash)throw Error('INPUT_ASSERTION_SAME_TIME_CONFLICT');
   if(parts.length===2){input[parts[0]]={...(input[parts[0]]??{}),[parts[1]]:a.value};}else input[a.target]=a.value;
   provenance[a.target]={assertionId:id,valueHash:a.valueHash,verifiedAt:a.verifiedAt};
  }
  const changed=hash(old)!==hash(input)||hash(oldProvenance)!==hash(provenance),revision=hash({input,provenance});
  if(changed){
   store.putDecision('verified-input-revision:'+revision,{version:'IRAN_VERIFIED_INPUT_REVISION_R14',input,provenance,linkedAt:now},now);
   store.checkpoint('verified-input',input);store.checkpoint('verified-input-provenance-r14',provenance);
  }
  if(hash(store.getCheckpoint('verified-input'))!==hash(input))throw Error('INPUT_LINK_READBACK_FAILED');
  const result=buildIranProgress({...input,events:store.events()},now);
  store.db.exec('COMMIT');return {status:changed?'LINKED':'UNCHANGED',revision,targets:[...seen],storageVerified:true,
   calculationStatus:result.status,score:result.score,missing:result.missing,publication:'NOT_REQUESTED'};
 }catch(e){store.db.exec('ROLLBACK');throw e;}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!args[0].startsWith('--assertions='))throw Error('INPUT_LINK_ARGS_INVALID');
 const file=path.resolve(args[0].slice(13));if(fs.statSync(file).size>16384)throw Error('INPUT_LINK_FILE_TOO_LARGE');
 const ids=JSON.parse(fs.readFileSync(file,'utf8')),base=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13');
 const store=openStore(path.join(base,'iran.sqlite')),owner=randomUUID(),now=Date.now();
 try{if(!store.claim(owner,now))console.log(JSON.stringify({status:'RUNNING',reason:'LEASE_HELD'}));else console.log(JSON.stringify(linkVerifiedInputs(store,ids,now)));}
 catch(e){console.error(/^[A-Z_]+$/.test(e.message??'')?e.message:'INPUT_LINK_FAILED');process.exitCode=2;}
 finally{store.release(owner);store.close();}
}
