// Source-only, read-only aggregation of pre-attested snapshot identities.
// No DB, raw body, provider calls, approval, or publication.
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
