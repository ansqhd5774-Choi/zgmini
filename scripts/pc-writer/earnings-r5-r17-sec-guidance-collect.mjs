import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {readLatestEarningsUniverse} from "./earnings-r5-offline-preflight.mjs";
import {recentFilingsFromSubmission,classifySecGuidanceCandidateFiling} from "../../lib/market-score/earnings-e1-r5-forward-sources.mjs";
import {guidanceNetBreadth} from "../../lib/market-score/earnings-e1-r5-contract.mjs";
import {E1_R5_R17_SEC_POLICY,buildSecArchiveDocumentUrl,classifyGuidanceDirectionFromHtml,extractSecExhibitLinks} from "../../lib/market-score/earnings-e1-r5-guidance-r17.mjs";

const DEFAULT_BASE=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const USER_AGENT="ZGMINI/1.0 (+https://zgmini.kr)";
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function parseArgs(argv=process.argv.slice(2)){
  const out={};for(const item of argv){const m=item.match(/^--([^=]+)=(.*)$/);if(m)out[m[1]]=m[2];}return out;
}
function readJson(file){try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function ensureDir(dir){fs.mkdirSync(dir,{recursive:true});}
function writeJsonAtomic(file,value){ensureDir(path.dirname(file));const part=`${file}.part`;fs.writeFileSync(part,JSON.stringify(value,null,2)+"\n","utf8");fs.renameSync(part,file);}
function sha256(bytes){return createHash("sha256").update(bytes).digest("hex");}
function safeCode(error){const raw=String(error?.code??error?.message??"R17_FAILED");return /^[A-Z0-9_:-]+$/.test(raw)?raw:"R17_FAILED";}
function cik10(value){return String(value??"").replace(/\D/g,"").padStart(10,"0");}
function accessionKey(value){return String(value??"").replaceAll("-","");}
function resolveSubmissionFile(directory,cik){
  const name=`CIK${cik}.json`;const candidates=[path.join(directory,name),path.join(directory,"submissions",name),path.join(directory,path.basename(directory),name)];
  return candidates.find(file=>fs.existsSync(file)&&fs.statSync(file).isFile())??null;
}

export function buildR17LatestIssuerCandidates({members=[],submissionsDir,asOf,lookbackDays=185}){
  const out=[];
  for(const member of members){
    const cik=cik10(member?.cik);if(!/^\d{10}$/.test(cik))continue;
    const file=resolveSubmissionFile(submissionsDir,cik);const document=file?readJson(file):null;if(!document)continue;
    const candidates=[];
    for(const row of recentFilingsFromSubmission(document)){
      const result=classifySecGuidanceCandidateFiling(row,{asOf,lookbackDays});
      if(result.status==="CANDIDATE")candidates.push({...result,cik});
    }
    candidates.sort((a,b)=>b.filed.localeCompare(a.filed)||b.accessionNumber.localeCompare(a.accessionNumber));
    if(candidates[0])out.push(candidates[0]);
  }
  out.sort((a,b)=>b.filed.localeCompare(a.filed)||a.cik.localeCompare(b.cik)||a.accessionNumber.localeCompare(b.accessionNumber));
  return out;
}

function checkpointTemplate({asOf,lookbackDays}){
  return {version:E1_R5_R17_SEC_POLICY.version,asOf,lookbackDays,researchOnly:true,completed:{}};
}
function loadCheckpoint(file,{asOf,lookbackDays}){
  const prior=readJson(file);if(!prior)return checkpointTemplate({asOf,lookbackDays});
  if(prior.version!==E1_R5_R17_SEC_POLICY.version||prior.asOf!==asOf||prior.lookbackDays!==lookbackDays)throw Object.assign(new Error("R17_CHECKPOINT_CONTRACT_MISMATCH"),{code:"R17_CHECKPOINT_CONTRACT_MISMATCH"});
  if(!prior.completed||typeof prior.completed!=="object")prior.completed={};
  return prior;
}
function localDocumentPath(root,candidate,url){
  const u=new URL(url);const name=path.basename(u.pathname);return path.join(root,candidate.cik,accessionKey(candidate.accessionNumber),name);
}
function validStored(file){try{const s=fs.statSync(file);return s.isFile()&&s.size>0&&s.size<=E1_R5_R17_SEC_POLICY.maxDocumentBytes;}catch{return false;}}
async function throttle(state,sleepImpl){
  const wait=Math.max(0,E1_R5_R17_SEC_POLICY.requestIntervalMs-(Date.now()-state.lastRequestAt));if(wait>0)await sleepImpl(wait);
}
async function fetchToFile(url,file,{fetchImpl,state,report,sleepImpl}){
  if(validStored(file)){
    const bytes=fs.readFileSync(file);report.reusedDocuments++;return {status:"REUSED",bytes,sha256:sha256(bytes)};
  }
  if(report.requestCount>=report.maxRequests)return {status:"BUDGET"};
  await throttle(state,sleepImpl);state.lastRequestAt=Date.now();report.requestCount++;
  let response;
  try{response=await fetchImpl(url,{method:"GET",redirect:"error",headers:{"user-agent":USER_AGENT,"accept":"text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1","accept-encoding":"gzip, deflate"},signal:AbortSignal.timeout(30000)});}
  catch(error){throw Object.assign(new Error("SEC_REQUEST_FAILED"),{code:"SEC_REQUEST_FAILED",causeCode:error?.code??null});}
  if(!response?.ok)throw Object.assign(new Error(`SEC_HTTP_${response?.status??0}`),{code:`SEC_HTTP_${response?.status??0}`});
  const declared=Number(response.headers?.get?.("content-length")??NaN);if(Number.isFinite(declared)&&declared>E1_R5_R17_SEC_POLICY.maxDocumentBytes)throw Object.assign(new Error("SEC_DOCUMENT_TOO_LARGE"),{code:"SEC_DOCUMENT_TOO_LARGE"});
  const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length===0||bytes.length>E1_R5_R17_SEC_POLICY.maxDocumentBytes)throw Object.assign(new Error("SEC_DOCUMENT_BODY_INVALID"),{code:"SEC_DOCUMENT_BODY_INVALID"});
  ensureDir(path.dirname(file));const part=`${file}.part`;try{fs.rmSync(part,{force:true});}catch{}fs.writeFileSync(part,bytes);fs.renameSync(part,file);report.downloadedDocuments++;
  return {status:"DOWNLOADED",bytes,sha256:sha256(bytes)};
}
function summarizeCompleted(completed){
  const counts={UP:0,FLAT:0,DOWN:0,WITHDRAW:0,MIXED:0,UNCLASSIFIED:0};
  for(const item of Object.values(completed)){const key=item?.direction??"UNCLASSIFIED";if(key in counts)counts[key]++;else counts.UNCLASSIFIED++;}
  const eligible=counts.UP+counts.FLAT+counts.DOWN;
  return {counts,eligible,diagnosticNetBreadth:eligible?guidanceNetBreadth(counts.UP,counts.FLAT,counts.DOWN):null};
}
function formatText(report){
  const c=report.directionCounts;
  return [
    `E1-R5 R17 SEC GUIDANCE COLLECTION: ${report.status}`,
    `AT: ${report.at}`,
    `AS_OF: ${report.asOf}`,
    `POLICY: RESEARCH_ONLY maxRequests=${report.maxRequests} requestIntervalMs=${report.requestIntervalMs} rawTextPublication=false`,
    `CANDIDATES: total=${report.candidateIssuers} completed=${report.completedIssuers} remaining=${report.remainingIssuers}`,
    `DOCUMENTS: requests=${report.requestCount} downloaded=${report.downloadedDocuments} reused=${report.reusedDocuments}`,
    `DIRECTION: UP=${c.UP} FLAT=${c.FLAT} DOWN=${c.DOWN} WITHDRAW=${c.WITHDRAW} MIXED=${c.MIXED} UNCLASSIFIED=${c.UNCLASSIFIED} eligible=${report.eligibleDirections}`,
    `DIAGNOSTIC_NET_BREADTH: ${report.diagnosticNetBreadth??"-"}`,
    `NETWORK_CALLS: ${report.requestCount}`,
    `DB_WRITES: 0`,
    `PRODUCTION_ACTIVATION: NO`,
    `RAW_TEXT_PUBLICATION: NO`,
    report.errorCode?`ERROR: ${report.errorCode}`:null,
  ].filter(Boolean).join("\r\n")+"\r\n";
}

export async function collectEarningsR5R17SecGuidance({base=DEFAULT_BASE,asOf=new Date().toISOString().slice(0,10),lookbackDays=185,maxRequests=100,fetchImpl=globalThis.fetch,sleepImpl=sleep,candidates=null}={}){
  if(!Number.isInteger(maxRequests)||maxRequests<1||maxRequests>E1_R5_R17_SEC_POLICY.maxRequestsPerRun)throw Object.assign(new Error("R17_MAX_REQUESTS_INVALID"),{code:"R17_MAX_REQUESTS_INVALID"});
  const incoming=path.join(base,"manual-input","e1-r5","incoming");const submissionsDir=path.join(incoming,"submissions");const root=path.join(base,"manual-input","e1-r5","sec-guidance-r17");const documentsRoot=path.join(root,"documents");const checkpointFile=path.join(root,"checkpoint.json");const reports=path.join(base,"manual-input","e1-r5","reports");
  ensureDir(documentsRoot);ensureDir(reports);
  let list=candidates;
  if(!Array.isArray(list)){
    const universe=readLatestEarningsUniverse(path.join(base,"storage","core.sqlite"));
    list=buildR17LatestIssuerCandidates({members:universe.members??[],submissionsDir,asOf,lookbackDays});
  }
  const checkpoint=loadCheckpoint(checkpointFile,{asOf,lookbackDays});
  const report={status:"RUNNING",at:new Date().toISOString(),asOf,lookbackDays,candidateIssuers:list.length,completedIssuers:0,remainingIssuers:list.length,maxRequests,requestIntervalMs:E1_R5_R17_SEC_POLICY.requestIntervalMs,requestCount:0,downloadedDocuments:0,reusedDocuments:0,dbWrites:0,productionActivation:false,rawTextPublication:false,researchOnly:true,errorCode:null};
  const state={lastRequestAt:0};
  try{
    for(const candidate of list){
      if(checkpoint.completed[candidate.accessionNumber])continue;
      const primaryUrl=buildSecArchiveDocumentUrl({cik:candidate.cik,accessionNumber:candidate.accessionNumber,document:candidate.primaryDocument});if(!primaryUrl)throw Object.assign(new Error("R17_PRIMARY_URL_INVALID"),{code:"R17_PRIMARY_URL_INVALID"});
      const primaryFile=localDocumentPath(documentsRoot,candidate,primaryUrl);const primary=await fetchToFile(primaryUrl,primaryFile,{fetchImpl,state,report,sleepImpl});if(primary.status==="BUDGET")break;
      const primaryHtml=primary.bytes.toString("utf8");let classification=classifyGuidanceDirectionFromHtml(primaryHtml);let sourceRole="PRIMARY";let sourceUrl=primaryUrl;let sourceSha256=primary.sha256;
      if(classification.status==="UNCLASSIFIED"){
        const links=extractSecExhibitLinks(primaryHtml,{baseUrl:primaryUrl,maxLinks:1});
        if(links[0]){
          const exhibitFile=localDocumentPath(documentsRoot,candidate,links[0]);const exhibit=await fetchToFile(links[0],exhibitFile,{fetchImpl,state,report,sleepImpl});if(exhibit.status==="BUDGET")break;
          const exhibitClassification=classifyGuidanceDirectionFromHtml(exhibit.bytes.toString("utf8"));
          classification=exhibitClassification;sourceRole="EXHIBIT";sourceUrl=links[0];sourceSha256=exhibit.sha256;
        }
      }
      checkpoint.completed[candidate.accessionNumber]={cik:candidate.cik,filed:candidate.filed,accessionNumber:candidate.accessionNumber,direction:classification.direction??"UNCLASSIFIED",classificationStatus:classification.status,eligibleForBreadth:classification.eligibleForBreadth===true,sourceRole,sourceSha256,sourceHost:new URL(sourceUrl).hostname};
      checkpoint.updatedAt=new Date().toISOString();writeJsonAtomic(checkpointFile,checkpoint);
    }
  }catch(error){report.status="FAILED";report.errorCode=safeCode(error);}
  const completedKeys=new Set(Object.keys(checkpoint.completed));const summary=summarizeCompleted(checkpoint.completed);report.completedIssuers=list.filter(item=>completedKeys.has(item.accessionNumber)).length;report.remainingIssuers=Math.max(0,list.length-report.completedIssuers);report.directionCounts=summary.counts;report.eligibleDirections=summary.eligible;report.diagnosticNetBreadth=summary.diagnosticNetBreadth;
  if(report.status!=="FAILED")report.status=report.remainingIssuers===0?"COMPLETE":"RUNNING";
  report.at=new Date().toISOString();
  const jsonReport=path.join(reports,"e1-r5-r17-sec-guidance-last.json");const textReport=path.join(reports,"e1-r5-r17-sec-guidance-last.txt");writeJsonAtomic(jsonReport,report);fs.writeFileSync(textReport,formatText(report),"utf8");
  return {report,jsonReport,textReport,checkpointFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const cli=parseArgs();const lookbackDays=Number(cli["lookback-days"]??185);const maxRequests=Number(cli["max-requests"]??100);
  collectEarningsR5R17SecGuidance({base:cli.base?path.resolve(cli.base):undefined,asOf:cli["as-of"]??undefined,lookbackDays:Number.isInteger(lookbackDays)&&lookbackDays>0?lookbackDays:185,maxRequests:Number.isInteger(maxRequests)?maxRequests:100}).then(({report,jsonReport,textReport,checkpointFile})=>{
    console.log(JSON.stringify({status:report.status,textReport,jsonReport,checkpointFile,networkCalls:report.requestCount,dbWrites:0,productionActivation:false,remainingIssuers:report.remainingIssuers}));if(report.status==="FAILED")process.exitCode=1;
  }).catch(error=>{console.log(JSON.stringify({status:"FAILED",code:safeCode(error)}));process.exitCode=1;});
}
