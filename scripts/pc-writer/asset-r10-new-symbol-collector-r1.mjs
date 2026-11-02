import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {inspectBackfillPages,planNewSymbolBackfill} from './asset-r10-new-symbol-backfill-research.mjs';

// R10-only, explicitly invoked research collection. Never merges with approved
// group-*.json, incremental/*.json, release payloads, SQLite or D1.
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const result=(status,extra={})=>({status,canPromote:false,productionEligible:false,
  releaseWrites:0,d1Writes:0,pcApprovedInputWrites:0,...extra});
const digest=value=>sha256(JSON.stringify(value));
const SHA=/^[0-9a-f]{64}$/;

function safeRequest(request){
 try{
  const url=new URL(request.url);
  return url.origin==='https://data.alpaca.markets'&&url.pathname==='/v2/stocks/bars'&&
    url.searchParams.toString()===new URLSearchParams(request.params).toString()&&
    request.method==='GET'&&request.params.symbols===request.ticker&&
    request.params.asof==='-'&&request.params.feed==='iex'&&
    request.params.adjustment==='split'&&request.params.timeframe==='1Day'&&
    request.params.limit==='10000'&&request.sessionCount===200;
 }catch{return false;}
}

/**
 * A concrete, but never scheduled, collector that saves only immutable raw
 * research evidence. The caller must supply fetchImpl deliberately; this module
 * has no ambient/default HTTP behavior and does not read credentials itself.
 * `base` must be the approved PC writer data root, never a source checkout.
 */
export async function stageR10NewSymbolBars({plan,base,authorization,credentials,
  fetchImpl,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),
  now=Date.now(),maxTimeoutMs=20000}={}){
 if(plan?.status!=='RESEARCH_REQUESTS_PREPARED_NO_PROVIDER_CALLS'||
    !Array.isArray(plan.requests)||plan.requestCount!==plan.requests.length||
    !SHA.test(plan.auditDigest??'')||!plan.requests.length||
    plan.requests.length>10||plan.requests.some(req=>!safeRequest(req))||
    plan.auditDigest!==digest({provenance:plan.provenance,
      requests:plan.requests,window:plan.expectedSessions}))
  return result('STOP_RESEARCH_PLAN_INVALID');
 const reconstructed=planNewSymbolBackfill({
  sessions:plan.expectedSessions,throughDate:plan.expectedSessions.at(-1),
  asOfDate:plan.provenance?.asOfDate,
  missingSymbols:plan.requests.map(r=>r.ticker),
  pitProof:{status:'PIT_TIME_EFFECTIVE_IDENTITIES_VERIFIED',
    isResearchOnly:true,eventDigest:plan.provenance?.eventDigest},
  identities:plan.provenance?.identities,
  providerPolicy:plan.provenance?.providerPolicy});
 if(reconstructed.status!=='RESEARCH_REQUESTS_PREPARED_NO_PROVIDER_CALLS'||
    reconstructed.auditDigest!==plan.auditDigest)
  return result('STOP_RESEARCH_PLAN_SEMANTICS_INVALID');
 if(typeof base!=='string'||!path.isAbsolute(base))
  return result('STOP_LOCAL_CLIENT_UNAVAILABLE');
 if(authorization?.researchCollectionApproved!==true||
    authorization?.approvedAuditDigest!==plan.auditDigest||
    authorization?.rightsEvidenceSha256!==plan.provenance?.providerPolicy?.rightsEvidenceSha256||
    authorization?.maxRequests!==plan.provenance?.providerPolicy?.approvedRequestCap||
    authorization?.approvedBasePath!==path.resolve(base??''))
  return result('STOP_RESEARCH_AUTHORIZATION_MISSING');
 if(typeof fetchImpl!=='function'||typeof wait!=='function'||
    typeof credentials?.id!=='string'||!credentials.id||
    typeof credentials?.secret!=='string'||!credentials.secret)
  return result('STOP_LOCAL_CLIENT_UNAVAILABLE');
 if(!Number.isFinite(now)||!Number.isInteger(maxTimeoutMs)||maxTimeoutMs<1000||maxTimeoutMs>20000)
  return result('STOP_RUNTIME_SCOPE_INVALID');

 const destination=path.join(path.resolve(base),'asset-r10-alpaca','research-asof-unmapped',plan.auditDigest);
 if(fs.existsSync(destination))return result('STOP_RESEARCH_ALREADY_STAGED_REVIEW_REQUIRED',{providerRequests:0});

 const pagesByTicker={},wireEvidence=[];let providerRequests=0;
 const requestCap=plan.provenance.providerPolicy.approvedRequestCap;
 try{
  for(const request of plan.requests){
   let token=null;pagesByTicker[request.ticker]=[];
   do{
    if(providerRequests>=requestCap)
      return result('STOP_RESEARCH_PROVIDER_BUDGET',{providerRequests});
    if(providerRequests>0)await wait(1000);
    const url=new URL(request.url);
    if(token!==null)url.searchParams.set('page_token',token);
    // Record attempted calls even if fetch throws, times out, or is aborted.
    providerRequests++;
    const response=await fetchImpl(url,{headers:{
      'APCA-API-KEY-ID':credentials.id,'APCA-API-SECRET-KEY':credentials.secret},
      redirect:'error',signal:AbortSignal.timeout(maxTimeoutMs)});
    if(!response?.ok)return result('STOP_RESEARCH_PROVIDER_HTTP',{providerRequests,httpStatus:response?.status??null});
    // Keep exactly the returned text bytes as a separate SHA256 witness.
    const wire=await response.text();
    if(Buffer.byteLength(wire,'utf8')>8_000_000)return result('STOP_RESEARCH_PROVIDER_RESPONSE_TOO_LARGE',{providerRequests});
    const data=JSON.parse(wire),canonicalHash=digest(data),wireHash=sha256(wire);
    const pageNumber=pagesByTicker[request.ticker].length+1;
    pagesByTicker[request.ticker].push({requestedPageToken:token,httpStatus:200,
      requestParams:request.params,response:data,responseSha256:canonicalHash});
    wireEvidence.push({ticker:request.ticker,pageNumber,wire,wireSha256:wireHash,
      canonicalSha256:canonicalHash,requestedPageToken:token});
    token=data.next_page_token??null;
   }while(token!==null);
  }
 }catch{
  return result('STOP_RESEARCH_PROVIDER_OR_JSON_ERROR',{providerRequests});
 }
 const inspected=inspectBackfillPages({plan,pagesByTicker});
 if(inspected.status!=='RESEARCH_PRICES_200_SESSIONS_VALIDATED_AUDIT_PENDING')
  return result(inspected.status,{providerRequests,missingCount:inspected.missingCount??null});

 const root=path.dirname(destination);
 // Save only the canonical request/provenance contract (never credentials,
 // authorization, provider headers, or ambient environment). A later offline
 // PC cycle can reconstruct and audit these raw bytes without an in-memory plan.
 const planSnapshot={auditDigest:plan.auditDigest,requestCount:plan.requestCount,
  requests:plan.requests,expectedSessions:plan.expectedSessions,
  provenance:plan.provenance};
 const manifest={schemaVersion:'ASSET_R10_ALPACA_UNMAPPED_RESEARCH_CAPTURE_R1',
  planAuditDigest:plan.auditDigest,collectedAt:new Date(now).toISOString(),
  planSnapshot,planSnapshotSha256:digest(planSnapshot),
  source:'ALPACA',feed:'iex',adjustment:'split',asof:'-',
  observationStart:plan.expectedSessions[0],observationEnd:plan.expectedSessions.at(-1),
  sourceRightsEvidenceSha256:plan.provenance.providerPolicy.rightsEvidenceSha256,
  evidenceMode:'WIRE_TEXT_SHA256_AND_PARSED_CANONICAL_SHA256',
  providerRequests,canPromote:false,productionEligible:false,
  files:wireEvidence.map(x=>({relativePath:path.join(x.ticker,`page-${String(x.pageNumber).padStart(3,'0')}.json`),
    source:'ALPACA',ticker:x.ticker,sha256:x.wireSha256,canonicalSha256:x.canonicalSha256,
    pageToken:x.requestedPageToken})),
  priceRows:inspected.results.map(x=>({ticker:x.ticker,count:x.completeSessions,
    digest:x.priceRowDigest}))};
 let temp=null;
 try{
  fs.mkdirSync(root,{recursive:true});
  temp=fs.mkdtempSync(path.join(root,'.staging-'));
  for(const file of manifest.files){
   const evidence=wireEvidence.find(x=>x.ticker===file.ticker&&x.wireSha256===file.sha256);
   const target=path.join(temp,file.relativePath);
   fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,evidence.wire,{flag:'wx'});
   if(sha256(fs.readFileSync(target))!==file.sha256)throw Error('R10_RESEARCH_WRITE_READBACK_MISMATCH');
  }
  const manifestFile=path.join(temp,'manifest.json'),body=JSON.stringify(manifest,null,2)+'\n';
  fs.writeFileSync(manifestFile,body,{flag:'wx'});
  if(fs.readFileSync(manifestFile,'utf8')!==body)throw Error('R10_RESEARCH_MANIFEST_READBACK_MISMATCH');
  // Rename to a content-identified path; never overwrite older evidence.
  if(fs.existsSync(destination))return result('STOP_RESEARCH_STAGING_TARGET_RACE',{providerRequests});
  fs.renameSync(temp,destination);
 }catch{
  return result('STOP_RESEARCH_STAGING_IO',{providerRequests,
    incompleteStageExists:temp!==null&&fs.existsSync(temp)});
 }
 return result('RESEARCH_CAPTURED_NOT_PROMOTABLE',{providerRequests,
  stagedRelativePath:path.join('asset-r10-alpaca','research-asof-unmapped',plan.auditDigest),
  manifestSha256:sha256(JSON.stringify(manifest,null,2)+'\n'),
  capturedSymbols:manifest.priceRows.map(x=>x.ticker)});
}
