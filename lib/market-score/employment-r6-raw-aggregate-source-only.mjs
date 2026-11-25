// Source-only, read-only aggregation of pre-attested snapshot identities.
// No DB, provider calls, approval, or publication. Raw verification stays private in-memory.
import {createHash} from 'node:crypto';
const MONTH=/^20\d{2}-(0[1-9]|1[0-2])$/;
const GROUP=/^[A-Z][A-Z0-9_]{0,79}$/;
const fail=code=>{const e=new Error(code);e.code=code;throw e;};
const valid=n=>Number.isSafeInteger(n)&&n>=0;
const plus=(a,b)=>{if(!valid(a)||!valid(b)||!Number.isSafeInteger(a+b))fail('R6_AGG_COUNT_INVALID');return a+b;};
const zero=()=>({metadataKeys:0,bodyVerifiedKeys:0,runCertifiedKeys:0});
const add=(dest,row)=>{dest.metadataKeys=plus(dest.metadataKeys,1);if(row.bodyVerified)dest.bodyVerifiedKeys=plus(dest.bodyVerifiedKeys,1);if(row.runCertified)dest.runCertifiedKeys=plus(dest.runCertifiedKeys,1);};
export function aggregateAttestedR6Snapshots({entries,allowedGroups,maxEntries=4000}={}){
 if(!Array.isArray(entries)||!Array.isArray(allowedGroups)||allowedGroups.length===0||allowedGroups.length>64
    ||allowedGroups.some(x=>typeof x!=='string'||!GROUP.test(x))||new Set(allowedGroups).size!==allowedGroups.length
    ||!Number.isSafeInteger(maxEntries)||maxEntries<0||maxEntries>4000||entries.length>maxEntries)
  fail('R6_AGG_INPUT_INVALID');
 const approved=new Set(allowedGroups),seen=new Set(),groups=new Map(),months=new Map(),total=zero();
 for(const row of entries){
  if(!row||typeof row!=='object'||Array.isArray(row)||typeof row.identity!=='string'||!row.identity.length||row.identity.length>256
    ||typeof row.group!=='string'||!approved.has(row.group)||!(row.month==='UNKNOWN'||typeof row.month==='string'&&MONTH.test(row.month))
    ||typeof row.bodyVerified!=='boolean'||typeof row.runCertified!=='boolean'||row.runCertified&&!row.bodyVerified)
   fail('R6_AGG_ROW_INVALID');
  if(seen.has(row.identity))fail('R6_AGG_DUPLICATE_IDENTITY');
  seen.add(row.identity);
  if(!groups.has(row.group))groups.set(row.group,zero());
  if(!months.has(row.month))months.set(row.month,zero());
  add(total,row);add(groups.get(row.group),row);add(months.get(row.month),row);
 }
 const byGroup=[...groups].sort(([a],[b])=>a.localeCompare(b)).map(([releaseGroup,c])=>({releaseGroup,...c}));
 const sortedMonths=[...months].filter(([m])=>m!=='UNKNOWN').sort(([a],[b])=>b.localeCompare(a));
 const byMonth=sortedMonths.slice(0,12).map(([retrievalMonth,c])=>({retrievalMonth,...c}));
 if(sortedMonths.length>12){
  const older=zero();
  for(const [,c] of sortedMonths.slice(12))for(const key of Object.keys(older))older[key]=plus(older[key],c[key]);
  byMonth.push({retrievalMonth:'OLDER',...older});
 }
 if(months.has('UNKNOWN'))byMonth.push({retrievalMonth:'UNKNOWN',...months.get('UNKNOWN')});
 for(const rows of [byGroup,byMonth]){
  const sum=zero();
  for(const row of rows)for(const key of Object.keys(sum))sum[key]=plus(sum[key],row[key]);
  if(Object.keys(total).some(key=>total[key]!==sum[key]))fail('R6_AGG_TOTAL_MISMATCH');
 }
 return {schema:'W04_R6_SAFE_RAW_AGGREGATE_SOURCE_ONLY_V1',
  status:'SOURCE_ONLY_NOT_RUNTIME_ATTESTATION',...total,
  rawSnapshotByGroup:byGroup,rawSnapshotByMonth:byMonth};
}

const SHA256=/^[a-f0-9]{64}$/;
const ISO=/^20\d{2}-(?:0[1-9]|1[0-2])-[0-3]\dT(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?Z$/;
const digest=s=>createHash('sha256').update(s,'utf8').digest('hex');
const time=s=>{const n=typeof s==='string'&&ISO.test(s)?Date.parse(s):NaN;return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===s.slice(0,10)?n:null;};
/**
 * Derive aggregate counts from the original bytes and matching collector Run receipts.
 * Pure source-only verifier; callers must independently attest the origin and completeness
 * of the supplied snapshot/run arrays. No raw details are returned.
 */
export function verifyAndAggregateStoredR6Snapshots({
 snapshots,runs,allowedGroups,asOfDate,maxEntries=4000,maxRuns=20000,maxBodyBytes=32*1024*1024,
}={}){
 if(!Array.isArray(snapshots)||!Array.isArray(runs)||!Array.isArray(allowedGroups)
   ||snapshots.length>maxEntries||runs.length>maxRuns
   ||!Number.isSafeInteger(maxEntries)||maxEntries<0||maxEntries>4000
   ||!Number.isSafeInteger(maxRuns)||maxRuns<0||maxRuns>20000
   ||!Number.isSafeInteger(maxBodyBytes)||maxBodyBytes<0||maxBodyBytes>32*1024*1024
   ||typeof asOfDate!=='string'||!/^20\d{2}-(?:0[1-9]|1[0-2])-[0-3]\d$/.test(asOfDate)
   ||!Number.isFinite(Date.parse(asOfDate+'T00:00:00Z'))
   ||new Date(asOfDate+'T00:00:00Z').toISOString().slice(0,10)!==asOfDate)
   fail('R6_ATTEST_INPUT_INVALID');
 const end=Date.parse(asOfDate+'T23:59:59.999Z'),allowed=new Set(allowedGroups);
 const byId=new Map(),valid=new Set(),claims=[];
 let totalBytes=0;
 for(const snap of snapshots){
  if(!snap||typeof snap!=='object'||!SHA256.test(snap.snapshotId??'')
   ||!SHA256.test(snap.bodySha256??'')||!allowed.has(snap.releaseGroup)
   ||typeof snap.provider!=='string'||!GROUP.test(snap.provider)
   ||typeof snap.requestKey!=='string'||!snap.requestKey.length||snap.requestKey.length>512
   ||typeof snap.body!=='string'||time(snap.retrievedAt)===null
   ||time(snap.createdAt)===null)
   fail('R6_ATTEST_SNAPSHOT_INVALID');
  if(byId.has(snap.snapshotId))fail('R6_ATTEST_DUPLICATE_SNAPSHOT');
  const retrieved=time(snap.retrievedAt),created=time(snap.createdAt);
  if(retrieved>end||created>end||created<retrieved)fail('R6_ATTEST_TIME_INVALID');
  const size=Buffer.byteLength(snap.body,'utf8');
  totalBytes+=size;
  if(size>maxBodyBytes||totalBytes>64*1024*1024)fail('R6_ATTEST_BYTE_CAP');
  const keyHash=digest([snap.releaseGroup,snap.provider,snap.requestKey,snap.bodySha256].join('|'));
  const passed=keyHash===snap.snapshotId&&digest(snap.body)===snap.bodySha256
    &&snap.responseHash===snap.bodySha256;
  if(passed)valid.add(snap.snapshotId);
  byId.set(snap.snapshotId,snap);
  claims.push({identity:snap.snapshotId,group:snap.releaseGroup,month:snap.retrievedAt.slice(0,7),
    bodyVerified:passed,runCertified:false});
 }
 const certified=new Set();
 let runReferenceCount=0;
 for(const run of runs){
  if(!run||typeof run!=='object'||typeof run.provider!=='string'
   ||!['SUCCESS','PARTIAL','FAILED','BLOCKED'].includes(run.status)
   ||time(run.completedAt)===null||time(run.completedAt)>end
   ||!Array.isArray(run.rawSnapshots)||run.rawSnapshots.length>4000)
   fail('R6_ATTEST_RUN_INVALID');
  runReferenceCount+=run.rawSnapshots.length;
  if(runReferenceCount>40000)fail('R6_ATTEST_RUN_REFERENCE_CAP');
  if(!['SUCCESS','PARTIAL'].includes(run.status))continue;
  for(const item of run.rawSnapshots){
   if(!item||typeof item!=='object')fail('R6_ATTEST_RUN_INVALID');
   const snap=byId.get(item.snapshotId);
   if(snap&&valid.has(snap.snapshotId)&&item.bodySha256===snap.bodySha256
      &&run.provider==='EMPLOYMENT_R6_'+snap.releaseGroup
      &&time(snap.retrievedAt)<=time(run.completedAt)
      &&time(snap.createdAt)<=time(run.completedAt))certified.add(snap.snapshotId);
  }
 }
 for(const row of claims)row.runCertified=certified.has(row.identity);
 return aggregateAttestedR6Snapshots({entries:claims,allowedGroups,maxEntries});
}
