import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";

export const E1_R5_SEC_HISTORY_BACKFILL_VERSION="E1-R5-SEC-HISTORY-BACKFILL-R1";
export const E1_R5_SEC_HISTORY_BACKFILL_CONTRACT=Object.freeze({
  sourceCorpusVersion:"E1-R5-R17-SEC-GUIDANCE-R1",
  authority:"SEC EDGAR",
  host:"www.sec.gov",
  forms:Object.freeze(["8-K","8-K/A"]),
  items:Object.freeze(["2.02","7.01"]),
  maxRequestsPerRun:100,
  requestIntervalMs:650,
  maxDocumentBytes:20_000_000,
  researchOnly:true,
  productionActivation:false,
  dbWrites:0,
  rawTextPublication:false,
  mutatesCurrentCheckpoint:false,
});

const DEFAULT_BASE=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const USER_AGENT="ZGMINI/1.0 (+https://zgmini.kr)";
const DAY_MS=86_400_000;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const clean=value=>String(value??"").trim();
const upper=value=>clean(value).toUpperCase();

function parseArgs(argv=process.argv.slice(2)){
  const out={};
  for(const item of argv){const m=item.match(/^--([^=]+)=(.*)$/);if(m)out[m[1]]=m[2];}
  return out;
}
function readJson(file){try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function ensureDir(dir){fs.mkdirSync(dir,{recursive:true});}
function writeJsonAtomic(file,value){ensureDir(path.dirname(file));const part=`${file}.part`;fs.writeFileSync(part,JSON.stringify(value,null,2)+"\n","utf8");fs.renameSync(part,file);}
function sha256(bytes){return createHash("sha256").update(bytes).digest("hex");}
function safeCode(error){const raw=String(error?.code??error?.message??"SEC_HISTORY_BACKFILL_FAILED");return /^[A-Z0-9_:-]+$/.test(raw)?raw:"SEC_HISTORY_BACKFILL_FAILED";}
function cik10(value){return String(value??"").replace(/\D/g,"").padStart(10,"0");}
function accessionKey(value){return clean(value).replaceAll("-","");}
function validAccession(value){return /^\d{10}-\d{2}-\d{6}$/.test(clean(value));}
function safePrimaryDocument(value){const text=clean(value);return text.length>0&&text.length<=255&&!/[\\/]/.test(text)&&/^[A-Za-z0-9_.-]+$/.test(text);}
function isoDay(value){
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const ms=Date.parse(`${value}T00:00:00Z`);if(!Number.isFinite(ms))return null;
  return new Date(ms).toISOString().slice(0,10)===value?value:null;
}
function dayNumber(value){const day=isoDay(value);return day?Math.floor(Date.parse(`${day}T00:00:00Z`)/DAY_MS):null;}
function splitItems(value){
  if(Array.isArray(value))return value.flatMap(splitItems);
  return clean(value).split(/[;,\s]+/).map(item=>item.trim()).filter(Boolean);
}
function hasGuidanceItem(value){const items=new Set(splitItems(value));return E1_R5_SEC_HISTORY_BACKFILL_CONTRACT.items.some(item=>items.has(item));}
function recentFilingsFromSubmission(document){
  const recent=document?.filings?.recent;if(!recent||typeof recent!=="object")return [];
  const keys=["accessionNumber","filingDate","form","items","primaryDocument","acceptanceDateTime"];
  const length=Math.max(0,...keys.map(key=>Array.isArray(recent[key])?recent[key].length:0));
  const rows=[];
  for(let index=0;index<length;index++)rows.push(Object.fromEntries(keys.map(key=>[key,Array.isArray(recent[key])?recent[key][index]:null])));
  return rows;
}
function classifyCandidate(row,{asOf,lookbackDays}){
  const form=upper(row?.form);if(!E1_R5_SEC_HISTORY_BACKFILL_CONTRACT.forms.includes(form))return null;
  if(!hasGuidanceItem(row?.items))return null;
  const filed=isoDay(clean(row?.filingDate));const cutoff=dayNumber(asOf),observed=dayNumber(filed);
  if(cutoff==null||observed==null||observed>cutoff||cutoff-observed>lookbackDays)return null;
  const accessionNumber=clean(row?.accessionNumber),primaryDocument=clean(row?.primaryDocument);
  if(!validAccession(accessionNumber)||!safePrimaryDocument(primaryDocument))return null;
  return {form,filed,accessionNumber,primaryDocument,items:splitItems(row?.items).filter(item=>E1_R5_SEC_HISTORY_BACKFILL_CONTRACT.items.includes(item)),acceptedAt:clean(row?.acceptanceDateTime)||null};
}
function resolveSubmissionFile(incoming,cik){
  const name=`CIK${cik}.json`;
  const candidates=[path.join(incoming,name),path.join(incoming,"submissions",name),path.join(incoming,path.basename(incoming),name)];
  return candidates.find(file=>fs.existsSync(file)&&fs.statSync(file).isFile())??null;
}
function latestCurrentByCik(checkpoint){
  const out=new Map();
  for(const item of Object.values(checkpoint?.completed??{})){
    const cik=cik10(item?.cik),filed=isoDay(clean(item?.filed)),accessionNumber=clean(item?.accessionNumber);
    if(!/^\d{10}$/.test(cik)||!filed||!validAccession(accessionNumber))continue;
    const prior=out.get(cik);
    if(!prior||filed>prior.filed||(filed===prior.filed&&accessionNumber>prior.accessionNumber))out.set(cik,{cik,filed,accessionNumber});
  }
  return out;
}

export function buildHistoricalBackfillPlan({checkpoint,submissionsByCik=new Map(),asOf,lookbackDays=550,priorPerIssuer=2}={}){
  if(checkpoint?.version!==E1_R5_SEC_HISTORY_BACKFILL_CONTRACT.sourceCorpusVersion)throw Object.assign(new Error("SOURCE_CORPUS_VERSION_MISMATCH"),{code:"SOURCE_CORPUS_VERSION_MISMATCH"});
  if(!isoDay(asOf)||!Number.isInteger(lookbackDays)||lookbackDays<1||!Number.isInteger(priorPerIssuer)||priorPerIssuer<1||priorPerIssuer>4)throw Object.assign(new Error("HISTORY_PLAN_ARGUMENT_INVALID"),{code:"HISTORY_PLAN_ARGUMENT_INVALID"});
  const current=latestCurrentByCik(checkpoint);const existing=new Set(Object.keys(checkpoint.completed??{}));
  const plan=[];let missingSubmissionCiks=0,noPriorCandidateCiks=0;
  for(const [cik,currentEntry] of [...current.entries()].sort((a,b)=>a[0].localeCompare(b[0]))){
    const document=submissionsByCik instanceof Map?submissionsByCik.get(cik):submissionsByCik?.[cik];
    if(!document){missingSubmissionCiks++;continue;}
    const candidates=[];
    for(const row of recentFilingsFromSubmission(document)){
      const candidate=classifyCandidate(row,{asOf,lookbackDays});
      if(!candidate||existing.has(candidate.accessionNumber)||candidate.filed>=currentEntry.filed)continue;
      candidates.push({...candidate,cik,currentAccessionNumber:currentEntry.accessionNumber,currentFiled:currentEntry.filed});
    }
    candidates.sort((a,b)=>b.filed.localeCompare(a.filed)||b.accessionNumber.localeCompare(a.accessionNumber));
    if(!candidates.length){noPriorCandidateCiks++;continue;}
    plan.push(...candidates.slice(0,priorPerIssuer));
  }
  return {plan,currentIssuerCount:current.size,missingSubmissionCiks,noPriorCandidateCiks,plannedIssuerCount:new Set(plan.map(item=>item.cik)).size};
}

export function buildSecArchiveDocumentUrl({cik,accessionNumber,document,primaryDocument}){
  const cikText=clean(cik).replace(/^0+/,"")||"0";const accession=clean(accessionNumber),file=clean(document??primaryDocument);
  if(!/^\d{1,10}$/.test(cikText)||cikText==="0"||!validAccession(accession)||!safePrimaryDocument(file))return null;
  return `https://www.sec.gov/Archives/edgar/data/${cikText}/${accession.replaceAll("-","")}/${file}`;
}
function decodeEntities(value){return String(value??"").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,"<").replace(/&gt;/gi,">");}
function visibleText(value){return decodeEntities(String(value??"").replace(/<[^>]+>/g," ")).replace(/\s+/g," ").trim();}
function likelyExhibit(href,label){const combined=`${href} ${label}`;return /(?:^|[^a-z0-9])(?:ex(?:hibit)?[-_. ]?99(?:[-_. ]?1)?|99[-_. ]1)(?:[^a-z0-9]|$)/i.test(combined)||/\b(?:press release|earnings release)\b/i.test(label);}
function extractFirstExhibitLink(html,{baseUrl}={}){
  let base;try{base=new URL(baseUrl);}catch{return null;}
  if(base.protocol!=="https:"||base.hostname!==E1_R5_SEC_HISTORY_BACKFILL_CONTRACT.host)return null;
  const baseDir=base.pathname.slice(0,base.pathname.lastIndexOf("/")+1);
  for(const match of String(html??"").matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
    const href=decodeEntities(match[1]),label=visibleText(match[2]);if(!likelyExhibit(href,label))continue;
    try{const url=new URL(href,base);if(url.protocol!=="https:"||url.hostname!==E1_R5_SEC_HISTORY_BACKFILL_CONTRACT.host||!url.pathname.startsWith(baseDir)||!/\.(?:html?|txt)$/i.test(url.pathname))continue;url.hash="";return url.href;}catch{}
  }
  return null;
}
function localDocumentPath(root,candidate,url){const u=new URL(url);return path.join(root,candidate.cik,accessionKey(candidate.accessionNumber),path.basename(u.pathname));}
function validStored(file){try{const s=fs.statSync(file);return s.isFile()&&s.size>0&&s.size<=E1_R5_SEC_HISTORY_BACKFILL_CONTRACT.maxDocumentBytes;}catch{return false;}}
async function throttle(state,sleepImpl){const wait=Math.max(0,E1_R5_SEC_HISTORY_BACKFILL_CONTRACT.requestIntervalMs-(Date.now()-state.lastRequestAt));if(wait>0)await sleepImpl(wait);}
async function fetchToFile(url,file,{fetchImpl,state,report,sleepImpl}){
  if(validStored(file)){const bytes=fs.readFileSync(file);report.reusedDocuments++;return {status:"REUSED",bytes,sha256:sha256(bytes)};}
  if(report.requestCount>=report.maxRequests)return {status:"BUDGET"};
  await throttle(state,sleepImpl);state.lastRequestAt=Date.now();report.requestCount++;
  let response;try{response=await fetchImpl(url,{method:"GET",redirect:"error",headers:{"user-agent":USER_AGENT,"accept":"text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1","accept-encoding":"gzip, deflate"},signal:AbortSignal.timeout(30_000)});}catch(error){throw Object.assign(new Error("SEC_REQUEST_FAILED"),{code:"SEC_REQUEST_FAILED",causeCode:error?.code??null});}
  if(!response?.ok)throw Object.assign(new Error(`SEC_HTTP_${response?.status??0}`),{code:`SEC_HTTP_${response?.status??0}`});
  const declared=Number(response.headers?.get?.("content-length")??NaN);if(Number.isFinite(declared)&&declared>E1_R5_SEC_HISTORY_BACKFILL_CONTRACT.maxDocumentBytes)throw Object.assign(new Error("SEC_DOCUMENT_TOO_LARGE"),{code:"SEC_DOCUMENT_TOO_LARGE"});
  const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length===0||bytes.length>E1_R5_SEC_HISTORY_BACKFILL_CONTRACT.maxDocumentBytes)throw Object.assign(new Error("SEC_DOCUMENT_BODY_INVALID"),{code:"SEC_DOCUMENT_BODY_INVALID"});
  ensureDir(path.dirname(file));const part=`${file}.part`;try{fs.rmSync(part,{force:true});}catch{}fs.writeFileSync(part,bytes);fs.renameSync(part,file);report.downloadedDocuments++;
  return {status:"DOWNLOADED",bytes,sha256:sha256(bytes)};
}
function loadLedger(file,{asOf,lookbackDays,priorPerIssuer}){
  const prior=readJson(file);
  if(!prior)return {version:E1_R5_SEC_HISTORY_BACKFILL_VERSION,sourceCorpusVersion:E1_R5_SEC_HISTORY_BACKFILL_CONTRACT.sourceCorpusVersion,asOf,lookbackDays,priorPerIssuer,researchOnly:true,completed:{}};
  if(prior.version!==E1_R5_SEC_HISTORY_BACKFILL_VERSION||prior.sourceCorpusVersion!==E1_R5_SEC_HISTORY_BACKFILL_CONTRACT.sourceCorpusVersion||prior.asOf!==asOf||prior.lookbackDays!==lookbackDays||prior.priorPerIssuer!==priorPerIssuer)throw Object.assign(new Error("HISTORY_BACKFILL_CONTRACT_MISMATCH"),{code:"HISTORY_BACKFILL_CONTRACT_MISMATCH"});
  if(!prior.completed||typeof prior.completed!=="object")prior.completed={};return prior;
}
function formatText(report){
  return [
    `E1-R5 SEC HISTORY BACKFILL: ${report.status}`,
    `VERSION: ${E1_R5_SEC_HISTORY_BACKFILL_VERSION}`,
    `AS_OF: ${report.asOf}`,
    `LOOKBACK_DAYS: ${report.lookbackDays}`,
    `PRIOR_PER_ISSUER: ${report.priorPerIssuer}`,
    `CURRENT_ISSUERS: ${report.currentIssuerCount}`,
    `PLANNED_ISSUERS: ${report.plannedIssuerCount}`,
    `PLANNED_ACCESSIONS: ${report.plannedAccessions}`,
    `COMPLETED_ACCESSIONS: ${report.completedAccessions}`,
    `REMAINING_ACCESSIONS: ${report.remainingAccessions}`,
    `MISSING_SUBMISSION_CIKS: ${report.missingSubmissionCiks}`,
    `NO_PRIOR_CANDIDATE_CIKS: ${report.noPriorCandidateCiks}`,
    `DOCUMENTS: requests=${report.requestCount} downloaded=${report.downloadedDocuments} reused=${report.reusedDocuments}`,
    `DECISION: ${report.decision}`,
    `NETWORK_CALLS: ${report.requestCount}`,
    `DB_WRITES: 0`,
    `CURRENT_R17_CHECKPOINT_MUTATED: NO`,
    `PRODUCTION_ACTIVATION: NO`,
    report.errorCode?`ERROR: ${report.errorCode}`:null,
  ].filter(Boolean).join("\r\n")+"\r\n";
}

export async function collectEarningsR5SecHistory({base=DEFAULT_BASE,lookbackDays=550,priorPerIssuer=2,maxRequests=100,fetchImpl=globalThis.fetch,sleepImpl=sleep}={}){
  if(!Number.isInteger(maxRequests)||maxRequests<1||maxRequests>E1_R5_SEC_HISTORY_BACKFILL_CONTRACT.maxRequestsPerRun)throw Object.assign(new Error("HISTORY_MAX_REQUESTS_INVALID"),{code:"HISTORY_MAX_REQUESTS_INVALID"});
  if(!Number.isInteger(lookbackDays)||lookbackDays<1||!Number.isInteger(priorPerIssuer)||priorPerIssuer<1||priorPerIssuer>4)throw Object.assign(new Error("HISTORY_ARGUMENT_INVALID"),{code:"HISTORY_ARGUMENT_INVALID"});
  const root=path.join(base,"manual-input","e1-r5","sec-guidance-r17"),documentsRoot=path.join(root,"documents"),checkpointFile=path.join(root,"checkpoint.json"),ledgerFile=path.join(root,"historical-backfill-r1.json"),incoming=path.join(base,"manual-input","e1-r5","incoming"),reportsDir=path.join(base,"manual-input","e1-r5","reports");
  const checkpoint=readJson(checkpointFile);if(!checkpoint)throw Object.assign(new Error("SOURCE_CHECKPOINT_MISSING"),{code:"SOURCE_CHECKPOINT_MISSING"});
  if(checkpoint.version!==E1_R5_SEC_HISTORY_BACKFILL_CONTRACT.sourceCorpusVersion)throw Object.assign(new Error("SOURCE_CORPUS_VERSION_MISMATCH"),{code:"SOURCE_CORPUS_VERSION_MISMATCH"});
  const asOf=isoDay(checkpoint.asOf);if(!asOf)throw Object.assign(new Error("SOURCE_AS_OF_INVALID"),{code:"SOURCE_AS_OF_INVALID"});
  ensureDir(documentsRoot);ensureDir(reportsDir);
  const current=latestCurrentByCik(checkpoint),submissionsByCik=new Map();
  for(const cik of current.keys()){const file=resolveSubmissionFile(incoming,cik);if(file)submissionsByCik.set(cik,readJson(file));}
  const planning=buildHistoricalBackfillPlan({checkpoint,submissionsByCik,asOf,lookbackDays,priorPerIssuer});const ledger=loadLedger(ledgerFile,{asOf,lookbackDays,priorPerIssuer});const plannedKeys=new Set(planning.plan.map(item=>item.accessionNumber));
  const report={status:"RUNNING",at:new Date().toISOString(),asOf,lookbackDays,priorPerIssuer,currentIssuerCount:planning.currentIssuerCount,plannedIssuerCount:planning.plannedIssuerCount,plannedAccessions:planning.plan.length,completedAccessions:0,remainingAccessions:planning.plan.length,missingSubmissionCiks:planning.missingSubmissionCiks,noPriorCandidateCiks:planning.noPriorCandidateCiks,maxRequests,requestCount:0,downloadedDocuments:0,reusedDocuments:0,networkCalls:0,dbWrites:0,productionActivation:false,currentCheckpointMutated:false,errorCode:null,decision:"RUNNING"};
  const state={lastRequestAt:0};
  try{
    for(const candidate of planning.plan){
      if(ledger.completed[candidate.accessionNumber])continue;
      const primaryUrl=buildSecArchiveDocumentUrl(candidate);if(!primaryUrl)throw Object.assign(new Error("PRIMARY_URL_INVALID"),{code:"PRIMARY_URL_INVALID"});
      const primaryFile=localDocumentPath(documentsRoot,candidate,primaryUrl),primary=await fetchToFile(primaryUrl,primaryFile,{fetchImpl,state,report,sleepImpl});if(primary.status==="BUDGET")break;
      const sourceFiles=[{role:"PRIMARY",url:primaryUrl,sha256:primary.sha256,file:path.relative(root,primaryFile).replaceAll("\\","/")}];
      const exhibitUrl=extractFirstExhibitLink(primary.bytes.toString("utf8"),{baseUrl:primaryUrl});
      if(exhibitUrl){const exhibitFile=localDocumentPath(documentsRoot,candidate,exhibitUrl),exhibit=await fetchToFile(exhibitUrl,exhibitFile,{fetchImpl,state,report,sleepImpl});if(exhibit.status==="BUDGET")break;sourceFiles.push({role:"EXHIBIT",url:exhibitUrl,sha256:exhibit.sha256,file:path.relative(root,exhibitFile).replaceAll("\\","/")});}
      ledger.completed[candidate.accessionNumber]={cik:candidate.cik,filed:candidate.filed,acceptedAt:candidate.acceptedAt,accessionNumber:candidate.accessionNumber,form:candidate.form,items:candidate.items,currentAccessionNumber:candidate.currentAccessionNumber,currentFiled:candidate.currentFiled,sourceFiles,storedAt:new Date().toISOString()};ledger.updatedAt=new Date().toISOString();writeJsonAtomic(ledgerFile,ledger);
    }
  }catch(error){report.status="FAILED";report.errorCode=safeCode(error);}
  report.completedAccessions=planning.plan.filter(item=>ledger.completed[item.accessionNumber]).length;report.remainingAccessions=Math.max(0,planning.plan.length-report.completedAccessions);report.networkCalls=report.requestCount;
  if(report.status!=="FAILED")report.status=report.remainingAccessions===0?"COMPLETE":"RUNNING";
  report.decision=report.status==="FAILED"?"STOP_AND_DIAGNOSE":report.remainingAccessions>0?"RESUME_REQUIRED":report.completedAccessions>0?"HISTORICAL_CORPUS_READY_FOR_CROSS_FILING_AUDIT":"NO_PRIOR_CANDIDATES_IN_LOCAL_SUBMISSIONS";
  report.at=new Date().toISOString();
  const jsonReport=path.join(reportsDir,"e1-r5-sec-history-backfill-last.json"),textReport=path.join(reportsDir,"e1-r5-sec-history-backfill-last.txt");writeJsonAtomic(jsonReport,report);fs.writeFileSync(textReport,formatText(report),"utf8");
  return {report,jsonReport,textReport,ledgerFile,checkpointFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const cli=parseArgs();const lookbackDays=Number(cli["lookback-days"]??550),priorPerIssuer=Number(cli["prior-per-issuer"]??2),maxRequests=Number(cli["max-requests"]??100);
  collectEarningsR5SecHistory({base:cli.base?path.resolve(cli.base):undefined,lookbackDays,maxRequests,priorPerIssuer}).then(({report,jsonReport,textReport,ledgerFile})=>{console.log(JSON.stringify({status:report.status,decision:report.decision,plannedAccessions:report.plannedAccessions,completedAccessions:report.completedAccessions,remainingAccessions:report.remainingAccessions,networkCalls:report.requestCount,dbWrites:0,productionActivation:false,textReport,jsonReport,ledgerFile}));if(report.status==="FAILED")process.exitCode=1;}).catch(error=>{console.log(JSON.stringify({status:"FAILED",code:safeCode(error)}));process.exitCode=1;});
}
