// Configured themes: opt-in D1 publisher, separate from all legacy feed keys.
// This module does not obtain credentials, schedule work or collect prices.
// Use publishConfiguredThemeD1 to re-run local approval/source preflight.
const TABLE='public_feed_snapshots_v1';
const READ=`SELECT body,stored_at FROM ${TABLE} WHERE kind='output' AND feed_key=? AND snapshot_key='current'`;
const INSERT=`INSERT INTO ${TABLE}(kind,feed_key,snapshot_key,body,stored_at) VALUES('output',?,'current',?,?) ON CONFLICT(kind,feed_key,snapshot_key) DO NOTHING`;
const UPDATE=`UPDATE ${TABLE} SET body=?,stored_at=? WHERE kind='output' AND feed_key=? AND snapshot_key='current' AND stored_at=? AND body=?`;
const MAX_BYTES=1_800_000;
const MAX_AGE_MS=8*86_400_000;
const fail=reason=>{throw Object.assign(new Error('THEME_CONFIG_PUBLIC_'+reason),{code:'THEME_CONFIG_PUBLIC_'+reason});};
const sha=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const score=s=>typeof s==='number'&&Number.isFinite(s)&&s>=0&&s<=100;
const keys=(x,expected)=>x&&Object.getPrototypeOf(x)===Object.prototype&&
 Object.keys(x).length===expected.length&&expected.every(k=>Object.hasOwn(x,k));
const candidateKeys=['version','status','themeId','theme','etfs','benchmark','methodologyVersion',
 'definitionSha256','candidateSha256','approvalSha256','sourceVersion','sourceStoredAt',
 'observationDate','score','history','derivedOnlyNoRaw','publicationAuthorized',
 'publicationAuthorizationBasis'];
const historyEntryKeys=['date','score','status','weights'];
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

function validatePrepared(preflight,now){
 if(preflight?.status!=='PREFLIGHT_PASS_NO_REMOTE_ACCESS'||
  preflight.stage!=='LOCAL_PREPARATION_COMPLETE'||preflight.providerCalls!==0||
  preflight.d1Queries!==0||preflight.d1Writes!==0||
  preflight.schedulerWrites!==0||preflight.publicationExecuted!==false)
  fail('PREFLIGHT_REQUIRED');
 const c=preflight.candidate;
 if(!keys(c,candidateKeys)||c.version!=='ZGMINI_CONFIGURED_THEME_PUBLIC_V1'||
  c.status!=='READY'||c.publicationAuthorized!==true||c.derivedOnlyNoRaw!==true||
  c.publicationAuthorizationBasis!=='LOCAL_OPERATOR_ATTESTATION_NOT_INDEPENDENT_LEGAL_VERIFICATION'||
  typeof c.themeId!=='string'||!(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/).test(c.themeId)||
  c.themeId.length>48||typeof c.theme!=='string'||!c.theme.trim()||
  c.theme.length>60||/[^\x20-\x7e\u0080-\uffff]/.test(c.theme)||
  c.benchmark!=='SPY'||c.methodologyVersion!=='ADAPTIVE_R2_PAIR_R3'||
  !Array.isArray(c.etfs)||c.etfs.length!==2||new Set(c.etfs).size!==2||
  c.etfs.some(e=>typeof e!=='string'||!/^[A-Z]{1,6}$/.test(e)||e==='SPY')||
  ![c.definitionSha256,c.candidateSha256,c.approvalSha256].every(sha)||
  preflight.definitionSha256!==c.definitionSha256||
  preflight.candidateSha256!==c.candidateSha256||
  preflight.approvalSha256!==c.approvalSha256||
  preflight.feedKey!=='theme-configured:'+c.themeId||
  typeof c.sourceVersion!=='string'||!/^GMH_MANIFEST_SHA256_[a-f0-9]{64}$/.test(c.sourceVersion)||
  !date(c.observationDate)||!score(c.score)||
  !Array.isArray(c.history)||c.history.length<1||c.history.length>252)
  fail('CANDIDATE_CONTRACT');
 const sourceAt=Date.parse(c.sourceStoredAt),observedAt=Date.parse(c.observationDate+'T23:59:59Z');
 if(!Number.isFinite(sourceAt)||sourceAt>now||sourceAt!==Date.parse(preflight.sourceStoredAt)||
  !Number.isFinite(observedAt)||observedAt>now||
  now-sourceAt>=MAX_AGE_MS||now-observedAt>=MAX_AGE_MS||
  c.observationDate!==preflight.observationDate)
  fail('SOURCE_STALE_OR_FUTURE');
 let previous='';
 for(const item of c.history){
  if(!keys(item,historyEntryKeys)||!date(item.date)||item.date<=previous||
   (item.score!==null&&!score(item.score))||
   typeof item.status!=='string'||!item.status||item.status.length>80||
   (item.weights!==null&&(!keys(item.weights,['first','second',
    'firstEffectiveSessions','secondEffectiveSessions','method'])||
    !Number.isFinite(item.weights.first)||!Number.isFinite(item.weights.second)||
    item.weights.first<0||item.weights.second<0||
    Math.abs(item.weights.first+item.weights.second-1)>0.000001||
    !Number.isSafeInteger(item.weights.firstEffectiveSessions)||
    !Number.isSafeInteger(item.weights.secondEffectiveSessions)||
    typeof item.weights.method!=='string'||!item.weights.method.startsWith('R3_APPROVED_'))))
   fail('HISTORY_CONTRACT');
  previous=item.date;
 }
 if(previous!==c.observationDate||
  Math.abs(c.history.at(-1).score-c.score)>0.000001)
  fail('LATEST_SCORE_MISMATCH');
 return c;
}

// 'prepared' is useful for pure tests; production calls the guarded wrapper
// below, which *replays* the stored source and verifies the operator approval.
export async function publishPreparedConfiguredThemeD1({preflight,query,now=Date.now(),
 expectedStoredAt=null}={}){
 if(typeof query!=='function'||!Number.isSafeInteger(now)||now<=0||
  (expectedStoredAt!==null&&(!Number.isSafeInteger(expectedStoredAt)||expectedStoredAt<=0)))
  fail('ADAPTER_CLOCK_OR_EXPECTED_STAMP');
 const candidate=validatePrepared(preflight,now),key=preflight.feedKey;
 const select=async()=>{
  const r=await query(READ,[key],{write:false}),row=r?.results?.[0];
  if(!row)return null;
  if(typeof row.body!=='string'||!Number.isSafeInteger(Number(row.stored_at))||
   Number(row.stored_at)<=0)fail('D1_ROW_INVALID');
  let body;try{body=JSON.parse(row.body);}catch{fail('D1_ROW_INVALID');}
  return {body,raw:row.body,storedAt:Number(row.stored_at)};
 };
 const before=await select();
 if((before?.storedAt??null)!==expectedStoredAt)fail('D1_CAS_EXPECTED_STAMP');
 if(before){
  const old=before.body;
  if(old?.version!==candidate.version||old.themeId!==candidate.themeId||
   old.theme!==candidate.theme||old.methodologyVersion!==candidate.methodologyVersion||
   old.definitionSha256!==candidate.definitionSha256||
   !same(old.etfs,candidate.etfs)||old.benchmark!==candidate.benchmark||
   !Array.isArray(old.history)||!date(old.observationDate)||
   old.observationDate>candidate.observationDate)
   fail('D1_EXISTING_IDENTITY_OR_NEWER_PRESERVED');
  const next=new Map(candidate.history.map(p=>[p.date,p]));
  if(!old.history.length||!old.history.some(p=>next.has(p.date))||
   old.history.some(p=>!date(p.date)||(next.has(p.date)&&!same(p,next.get(p.date)))))
   fail('D1_PRIOR_HISTORY_IMMUTABLE');
  if(old.observationDate===candidate.observationDate){
   if(!same(old.history,candidate.history)||old.score!==candidate.score)
    fail('D1_SAME_DATE_REWRITE_DENIED');
   return {status:'UNCHANGED',key,observationDate:old.observationDate,
    written:0,storedAt:before.storedAt};
  }
 }
 if(now<=(before?.storedAt??0))fail('D1_CLOCK_NOT_MONOTONIC');
 const record={...candidate,publishedAt:new Date(now).toISOString()};
 const encoded=JSON.stringify(record);
 if(new TextEncoder().encode(encoded).length>MAX_BYTES)fail('D1_BODY_LIMIT');
 let outcome;
 try{
  outcome=before?
   await query(UPDATE,[encoded,now,key,before.storedAt,before.raw],{write:true}):
   await query(INSERT,[key,encoded,now],{write:true});
 }catch{
  // A network failure after POST can mean the write succeeded. Read only;
  // never blindly retry an ambiguous D1 mutation.
  let after=null;try{after=await select();}catch{}
  if(after?.raw===encoded&&after.storedAt===now)
   return {status:'WRITTEN_AND_READBACK_VERIFIED',key,
    observationDate:candidate.observationDate,written:1,storedAt:now};
  fail('D1_WRITE_OUTCOME_UNKNOWN');
 }
 const after=await select();
 if(after?.raw===encoded&&after.storedAt===now)
  return {status:outcome?.meta?.changes===1?'WRITTEN_AND_READBACK_VERIFIED':'EXACT_RECORD_PRESENT',
   key,observationDate:candidate.observationDate,
   written:outcome?.meta?.changes===1?1:0,storedAt:now};
 fail(outcome?.meta?.changes===1?'D1_READBACK_MISMATCH':'D1_CAS_NOT_APPLIED');
}

// Only this entry point is for live callers: local preflight is re-run at
// publish time and a caller cannot supply an old approved candidate.
export async function publishConfiguredThemeD1({dataRoot,id,query,now=Date.now(),
 expectedStoredAt=null}={}){
 const {preflightConfiguredPublication}=await import('./theme-config-publication-preflight.mjs');
 const preflight=preflightConfiguredPublication({dataRoot,id,now});
 return publishPreparedConfiguredThemeD1({preflight,query,now,expectedStoredAt});
}
