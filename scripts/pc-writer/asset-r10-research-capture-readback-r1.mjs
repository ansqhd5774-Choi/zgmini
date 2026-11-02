import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {inspectBackfillPages,planNewSymbolBackfill} from './asset-r10-new-symbol-backfill-research.mjs';

// Read-only verification of R36's immutable Alpaca research capture. A valid
// receipt is deliberately NOT permission to merge price rows into R10 inputs.
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const digest=value=>sha256(JSON.stringify(value));
const SHA=/^[a-f0-9]{64}$/;
const TICKER=/^[A-Z0-9][A-Z0-9.\-]{0,14}$/;
const stop=(status,more={})=>({status,canPromote:false,productionEligible:false,
  providerRequests:0,approvedInputWrites:0,d1Writes:0,releaseWrites:0,...more});

const snapshotOf=plan=>({auditDigest:plan.auditDigest,requestCount:plan.requestCount,
  requests:plan.requests,expectedSessions:plan.expectedSessions,
  provenance:plan.provenance});

function reconstructSnapshot(snapshot){
 if(!snapshot||typeof snapshot!=='object'||!Array.isArray(snapshot.expectedSessions)||
    !Array.isArray(snapshot.requests)||!Array.isArray(snapshot.provenance?.identities))return null;
 const reconstructed=planNewSymbolBackfill({
  sessions:snapshot.expectedSessions,throughDate:snapshot.expectedSessions.at(-1),
  asOfDate:snapshot.provenance.asOfDate,
  missingSymbols:snapshot.requests.map(request=>request.ticker),
  pitProof:{status:'PIT_TIME_EFFECTIVE_IDENTITIES_VERIFIED',isResearchOnly:true,
   eventDigest:snapshot.provenance.eventDigest},
  identities:snapshot.provenance.identities,
  providerPolicy:snapshot.provenance.providerPolicy,
 });
 return reconstructed.status==='RESEARCH_REQUESTS_PREPARED_NO_PROVIDER_CALLS'&&
    reconstructed.auditDigest===snapshot.auditDigest&&
    JSON.stringify(snapshotOf(reconstructed))===JSON.stringify(snapshot)?reconstructed:null;
}

function safeDirectory(parent,name){
 const target=path.join(parent,name),stat=fs.lstatSync(target);
 if(!stat.isDirectory()||stat.isSymbolicLink())throw Error('UNSAFE_RESEARCH_DIRECTORY');
 return target;
}

/**
 * Verifies the exact bytes that were staged, original authorization lineage,
 * every Alpaca page and every expected session. Only an unmodified research
 * receipt may be returned, never an approved input or publication decision.
 * No network, API credentials, environment, SQLite or D1 access occurs.
 */
export function verifyR10ResearchCapture({base,plan,auditDigest}={}){
 const selectedDigest=plan?.auditDigest??auditDigest;
 if(typeof base!=='string'||!path.isAbsolute(base)||!SHA.test(selectedDigest??'')||
    (auditDigest!==undefined&&auditDigest!==selectedDigest)||
    (plan!==undefined&&(plan?.status!=='RESEARCH_REQUESTS_PREPARED_NO_PROVIDER_CALLS'||
      !Array.isArray(plan?.requests)||plan.requests.length===0||plan.requests.length>10||
      plan.requests.some(request=>!TICKER.test(request?.ticker??'')))))
  return stop('STOP_RESEARCH_READBACK_SCOPE_INVALID');

 try{
  const root=path.resolve(base);
  const staged=safeDirectory(safeDirectory(safeDirectory(root,
    'asset-r10-alpaca'),'research-asof-unmapped'),selectedDigest);
  const manifestPath=path.join(staged,'manifest.json');
  if(fs.lstatSync(manifestPath).isSymbolicLink()||
     fs.statSync(manifestPath).size>100_000)
   return stop('STOP_RESEARCH_MANIFEST_INVALID');
  const manifestBytes=fs.readFileSync(manifestPath);
  const manifest=JSON.parse(manifestBytes.toString('utf8'));
  const hasSnapshot=Object.hasOwn(manifest,'planSnapshot');
  const hasSnapshotHash=Object.hasOwn(manifest,'planSnapshotSha256');
  if(hasSnapshot!==hasSnapshotHash)return stop('STOP_RESEARCH_PLAN_SNAPSHOT_INVALID');
  if(hasSnapshot&&(!SHA.test(manifest.planSnapshotSha256??'')||
     digest(manifest.planSnapshot)!==manifest.planSnapshotSha256))
   return stop('STOP_RESEARCH_PLAN_SNAPSHOT_HASH_MISMATCH');
  if(!hasSnapshot&&plan===undefined)
   return stop('STOP_RESEARCH_PLAN_SNAPSHOT_MISSING');
  const restored=reconstructSnapshot(hasSnapshot?manifest.planSnapshot:snapshotOf(plan));
  if(!restored)return stop('STOP_RESEARCH_PLAN_SEMANTICS_INVALID');
  if(plan!==undefined&&hasSnapshot&&
     JSON.stringify(snapshotOf(plan))!==JSON.stringify(manifest.planSnapshot))
   return stop('STOP_RESEARCH_PLAN_SNAPSHOT_MISMATCH');
  const effectivePlan=restored;
  if(manifest?.schemaVersion!=='ASSET_R10_ALPACA_UNMAPPED_RESEARCH_CAPTURE_R1'||
     manifest.planAuditDigest!==selectedDigest||
     manifest.sourceRightsEvidenceSha256!==effectivePlan.provenance?.providerPolicy?.rightsEvidenceSha256||
     manifest.source!=='ALPACA'||manifest.feed!=='iex'||
     manifest.adjustment!=='split'||manifest.asof!=='-'||
     manifest.canPromote!==false||manifest.productionEligible!==false||
     manifest.evidenceMode!=='WIRE_TEXT_SHA256_AND_PARSED_CANONICAL_SHA256'||
     manifest.observationStart!==effectivePlan.expectedSessions?.[0]||
     manifest.observationEnd!==effectivePlan.expectedSessions?.at(-1)||
     !Array.isArray(manifest.files)||manifest.files.length===0||
     !Number.isInteger(manifest.providerRequests)||
     manifest.providerRequests!==manifest.files.length||
     manifest.providerRequests>effectivePlan.provenance?.providerPolicy?.approvedRequestCap||
     !Array.isArray(manifest.priceRows)||
     manifest.priceRows.length!==effectivePlan.requests.length)
   return stop('STOP_RESEARCH_MANIFEST_INVALID');

  const pagesByTicker={},pageCount=new Map(),used=new Set();
  for(const request of effectivePlan.requests)pagesByTicker[request.ticker]=[];
  for(const file of manifest.files){
   if(!TICKER.test(file?.ticker??'')||
      !Object.hasOwn(pagesByTicker,file?.ticker)||
      !SHA.test(file.sha256??'')||!SHA.test(file.canonicalSha256??''))
    return stop('STOP_RESEARCH_FILE_LINEAGE_INVALID');
   const count=(pageCount.get(file.ticker)??0)+1;
   pageCount.set(file.ticker,count);
   const relativePath=path.join(file.ticker,`page-${String(count).padStart(3,'0')}.json`);
   if(file.relativePath!==relativePath||used.has(relativePath))
    return stop('STOP_RESEARCH_FILE_LINEAGE_INVALID');
   used.add(relativePath);
   // Ensure an untrusted manifest cannot traverse directories or read symlinks.
   const tickerDir=safeDirectory(staged,file.ticker);
   const filePath=path.join(tickerDir,path.basename(relativePath));
   const stat=fs.lstatSync(filePath);
   if(!stat.isFile()||stat.isSymbolicLink()||stat.size>8_000_000)
    return stop('STOP_RESEARCH_FILE_LINEAGE_INVALID');
   const bytes=fs.readFileSync(filePath);
   if(sha256(bytes)!==file.sha256)
    return stop('STOP_RESEARCH_WIRE_SHA_MISMATCH');
   const response=JSON.parse(bytes.toString('utf8'));
   if(digest(response)!==file.canonicalSha256)
    return stop('STOP_RESEARCH_CANONICAL_SHA_MISMATCH');
   const request=effectivePlan.requests.find(row=>row.ticker===file.ticker);
   pagesByTicker[file.ticker].push({requestedPageToken:file.pageToken??null,
     httpStatus:200,requestParams:request.params,response,
     responseSha256:file.canonicalSha256});
  }

  const inspected=inspectBackfillPages({plan:effectivePlan,pagesByTicker});
  if(inspected.status!=='RESEARCH_PRICES_200_SESSIONS_VALIDATED_AUDIT_PENDING')
   return stop('STOP_RESEARCH_CAPTURE_PRICE_VALIDATION',{
     validationStatus:inspected.status});
  const expectedRows=inspected.results.map(row=>({ticker:row.ticker,
    count:row.completeSessions,digest:row.priceRowDigest}));
  if(JSON.stringify(manifest.priceRows)!==JSON.stringify(expectedRows))
   return stop('STOP_RESEARCH_PRICE_ROW_DIGEST_MISMATCH');

  return stop('STAGED_RESEARCH_READBACK_VERIFIED_NOT_PROMOTABLE',{
    planAuditDigest:selectedDigest,
    manifestSha256:sha256(manifestBytes),
    capturedSymbols:expectedRows.map(row=>row.ticker),
    capturedSessionsPerSymbol:200,
    verifiedSourcePages:manifest.files.length,
    observationStart:manifest.observationStart,
    observationEnd:manifest.observationEnd,
  });
 }catch{
  return stop('STOP_RESEARCH_READBACK_MISSING_OR_INVALID');
 }
}
