import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {
  E1_R5_SEC_HISTORY_BACKFILL_CONTRACT,
  E1_R5_SEC_HISTORY_BACKFILL_VERSION,
  buildHistoricalBackfillPlan,
  buildSecArchiveDocumentUrl,
} from './earnings-r5-sec-history-backfill.mjs';

export const E1_R5_SEC_HISTORY_BACKFILL_R2_VERSION='E1-R5-SEC-HISTORY-BACKFILL-R2';
export const E1_R5_SEC_HISTORY_BACKFILL_R2_CONTRACT=Object.freeze({
  sourceCorpusVersion:E1_R5_SEC_HISTORY_BACKFILL_CONTRACT.sourceCorpusVersion,
  authority:E1_R5_SEC_HISTORY_BACKFILL_CONTRACT.authority,
  host:E1_R5_SEC_HISTORY_BACKFILL_CONTRACT.host,
  lookbackDays:550,
  priorPerIssuer:4,
  maxRequestsPerRun:E1_R5_SEC_HISTORY_BACKFILL_CONTRACT.maxRequestsPerRun,
  requestIntervalMs:E1_R5_SEC_HISTORY_BACKFILL_CONTRACT.requestIntervalMs,
  maxDocumentBytes:E1_R5_SEC_HISTORY_BACKFILL_CONTRACT.maxDocumentBytes,
  researchOnly:true,
  productionActivation:false,
  dbWrites:0,
  rawTextPublication:false,
  mutatesCurrentCheckpoint:false,
  seedVersion:E1_R5_SEC_HISTORY_BACKFILL_VERSION,
});

const DEFAULT_BASE=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
const USER_AGENT='ZGMINI/1.0 (+https://zgmini.kr)';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const clean=value=>String(value??'').trim();
const readJson=file=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}};
const ensureDir=dir=>fs.mkdirSync(dir,{recursive:true});
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const accessionKey=value=>clean(value).replaceAll('-','');
const cik10=value=>String(value??'').replace(/\D/g,'').padStart(10,'0');
const safeCode=error=>{const raw=String(error?.code??error?.message??'SEC_HISTORY_R2_FAILED');return /^[A-Z0-9_:-]+$/.test(raw)?raw:'SEC_HISTORY_R2_FAILED';};
function atomicJson(file,value){ensureDir(path.dirname(file));const part=`${file}.${process.pid}.part`;fs.writeFileSync(part,JSON.stringify(value,null,2)+'\n','utf8');fs.renameSync(part,file);}
function parseArgs(argv=process.argv.slice(2)){const out={};for(const item of argv){const m=item.match(/^--([^=]+)=(.*)$/);if(m)out[m[1]]=m[2];}return out;}
function resolveSubmissionFile(incoming,cik){const name=`CIK${cik}.json`,candidates=[path.join(incoming,name),path.join(incoming,'submissions',name)];return candidates.find(file=>{try{return fs.statSync(file).isFile();}catch{return false;}})??null;}
function validStored(file){try{const s=fs.statSync(file);return s.isFile()&&s.size>0&&s.size<=E1_R5_SEC_HISTORY_BACKFILL_R2_CONTRACT.maxDocumentBytes;}catch{return false;}}
function decodeEntities(value){return String(value??'').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>');}
function visibleText(value){return decodeEntities(String(value??'').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();}
function likelyExhibit(href,label){const combined=`${href} ${label}`;return /(?:^|[^a-z0-9])(?:ex(?:hibit)?[-_. ]?99(?:[-_. ]?1)?|99[-_. ]1)(?:[^a-z0-9]|$)/i.test(combined)||/\b(?:press release|earnings release)\b/i.test(label);}
function extractFirstExhibitLink(html,{baseUrl}={}){let base;try{base=new URL(baseUrl);}catch{return null;}if(base.protocol!=='https:'||base.hostname!==E1_R5_SEC_HISTORY_BACKFILL_R2_CONTRACT.host)return null;const baseDir=base.pathname.slice(0,base.pathname.lastIndexOf('/')+1);for(const match of String(html??'').matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){const href=decodeEntities(match[1]),label=visibleText(match[2]);if(!likelyExhibit(href,label))continue;try{const url=new URL(href,base);if(url.protocol!=='https:'||url.hostname!==E1_R5_SEC_HISTORY_BACKFILL_R2_CONTRACT.host||!url.pathname.startsWith(baseDir)||!/\.(?:html?|txt)$/i.test(url.pathname))continue;url.hash='';return url.href;}catch{}}return null;}
function localDocumentPath(root,candidate,url){const u=new URL(url);return path.join(root,candidate.cik,accessionKey(candidate.accessionNumber),path.basename(u.pathname));}
async function throttle(state,sleepImpl){const wait=Math.max(0,E1_R5_SEC_HISTORY_BACKFILL_R2_CONTRACT.requestIntervalMs-(Date.now()-state.lastRequestAt));if(wait>0)await sleepImpl(wait);}
async function fetchToFile(url,file,{fetchImpl,state,report,sleepImpl}){if(validStored(file)){const bytes=fs.readFileSync(file);report.reusedDocuments++;return {status:'REUSED',bytes,sha256:sha256(bytes)};}if(report.requestCount>=report.maxRequests)return {status:'BUDGET'};await throttle(state,sleepImpl);state.lastRequestAt=Date.now();report.requestCount++;let response;try{response=await fetchImpl(url,{method:'GET',redirect:'error',headers:{'user-agent':USER_AGENT,'accept':'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1','accept-encoding':'gzip, deflate'},signal:AbortSignal.timeout(30_000)});}catch(error){throw Object.assign(new Error('SEC_REQUEST_FAILED'),{code:'SEC_REQUEST_FAILED',causeCode:error?.code??null});}if(!response?.ok)throw Object.assign(new Error(`SEC_HTTP_${response?.status??0}`),{code:`SEC_HTTP_${response?.status??0}`});const declared=Number(response.headers?.get?.('content-length')??NaN);if(Number.isFinite(declared)&&declared>E1_R5_SEC_HISTORY_BACKFILL_R2_CONTRACT.maxDocumentBytes)throw Object.assign(new Error('SEC_DOCUMENT_TOO_LARGE'),{code:'SEC_DOCUMENT_TOO_LARGE'});const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length===0||bytes.length>E1_R5_SEC_HISTORY_BACKFILL_R2_CONTRACT.maxDocumentBytes)throw Object.assign(new Error('SEC_DOCUMENT_BODY_INVALID'),{code:'SEC_DOCUMENT_BODY_INVALID'});ensureDir(path.dirname(file));const part=`${file}.${process.pid}.part`;try{fs.rmSync(part,{force:true});}catch{}fs.writeFileSync(part,bytes);fs.renameSync(part,file);report.downloadedDocuments++;return {status:'DOWNLOADED',bytes,sha256:sha256(bytes)};}

export function buildR2SeedLedger({r1Ledger,asOf}={}){
  const c=E1_R5_SEC_HISTORY_BACKFILL_R2_CONTRACT;
  if(!r1Ledger||r1Ledger.version!==c.seedVersion||r1Ledger.sourceCorpusVersion!==c.sourceCorpusVersion||r1Ledger.asOf!==asOf||r1Ledger.lookbackDays!==c.lookbackDays||r1Ledger.priorPerIssuer!==2||!r1Ledger.completed||typeof r1Ledger.completed!=='object')throw Object.assign(new Error('R1_SEED_CONTRACT_MISMATCH'),{code:'R1_SEED_CONTRACT_MISMATCH'});
  const completed=JSON.parse(JSON.stringify(r1Ledger.completed));
  return {version:E1_R5_SEC_HISTORY_BACKFILL_R2_VERSION,sourceCorpusVersion:c.sourceCorpusVersion,asOf,lookbackDays:c.lookbackDays,priorPerIssuer:c.priorPerIssuer,researchOnly:true,seededFrom:{version:r1Ledger.version,completedAccessions:Object.keys(completed).length},completed,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
}
function loadR2Ledger({r2File,r1File,asOf}){const c=E1_R5_SEC_HISTORY_BACKFILL_R2_CONTRACT,prior=readJson(r2File);if(!prior){const seed=buildR2SeedLedger({r1Ledger:readJson(r1File),asOf});atomicJson(r2File,seed);return seed;}if(prior.version!==E1_R5_SEC_HISTORY_BACKFILL_R2_VERSION||prior.sourceCorpusVersion!==c.sourceCorpusVersion||prior.asOf!==asOf||prior.lookbackDays!==c.lookbackDays||prior.priorPerIssuer!==c.priorPerIssuer||!prior.completed||typeof prior.completed!=='object')throw Object.assign(new Error('R2_LEDGER_CONTRACT_MISMATCH'),{code:'R2_LEDGER_CONTRACT_MISMATCH'});return prior;}
function formatText(report){return [
  `E1-R5 SEC HISTORY BACKFILL R2: ${report.status}`,
  `VERSION: ${E1_R5_SEC_HISTORY_BACKFILL_R2_VERSION}`,
  `AS_OF: ${report.asOf}`,
  `LOOKBACK_DAYS: ${report.lookbackDays}`,
  `PRIOR_PER_ISSUER: ${report.priorPerIssuer}`,
  `R1_SEED_COMPLETED: ${report.r1SeedCompleted}`,
  `PLANNED_ACCESSIONS: ${report.plannedAccessions}`,
  `PLANNED_COMPLETED: ${report.completedAccessions}`,
  `REMAINING_ACCESSIONS: ${report.remainingAccessions}`,
  `LEDGER_TOTAL_COMPLETED: ${report.ledgerTotalCompleted}`,
  `DOCUMENTS: requests=${report.requestCount} downloaded=${report.downloadedDocuments} reused=${report.reusedDocuments}`,
  `DECISION: ${report.decision}`,
  `NETWORK_CALLS: ${report.requestCount}`,
  'DB_WRITES: 0','CURRENT_R17_CHECKPOINT_MUTATED: NO','R1_LEDGER_MUTATED: NO','PRODUCTION_ACTIVATION: NO',report.errorCode?`ERROR: ${report.errorCode}`:null,
].filter(Boolean).join('\r\n')+'\r\n';}

export async function collectEarningsR5SecHistoryR2({base=DEFAULT_BASE,maxRequests=100,fetchImpl=globalThis.fetch,sleepImpl=sleep}={}){
  const c=E1_R5_SEC_HISTORY_BACKFILL_R2_CONTRACT;if(!Number.isInteger(maxRequests)||maxRequests<1||maxRequests>c.maxRequestsPerRun)throw Object.assign(new Error('HISTORY_MAX_REQUESTS_INVALID'),{code:'HISTORY_MAX_REQUESTS_INVALID'});
  const root=path.join(base,'manual-input','e1-r5','sec-guidance-r17'),documentsRoot=path.join(root,'documents'),checkpointFile=path.join(root,'checkpoint.json'),r1File=path.join(root,'historical-backfill-r1.json'),r2File=path.join(root,'historical-backfill-r2.json'),incoming=path.join(base,'manual-input','e1-r5','incoming'),reportsDir=path.join(base,'manual-input','e1-r5','reports');
  const checkpoint=readJson(checkpointFile);if(!checkpoint||checkpoint.version!==c.sourceCorpusVersion)throw Object.assign(new Error('SOURCE_CORPUS_VERSION_MISMATCH'),{code:'SOURCE_CORPUS_VERSION_MISMATCH'});const asOf=clean(checkpoint.asOf);if(!/^\d{4}-\d{2}-\d{2}$/.test(asOf))throw Object.assign(new Error('SOURCE_AS_OF_INVALID'),{code:'SOURCE_AS_OF_INVALID'});if(!fs.existsSync(r1File))throw Object.assign(new Error('R1_LEDGER_MISSING'),{code:'R1_LEDGER_MISSING'});
  ensureDir(documentsRoot);ensureDir(reportsDir);
  const ciks=[...new Set(Object.values(checkpoint.completed??{}).map(row=>cik10(row?.cik)).filter(value=>/^\d{10}$/.test(value)))],submissionsByCik=new Map();for(const cik of ciks){const file=resolveSubmissionFile(incoming,cik);if(file)submissionsByCik.set(cik,readJson(file));}
  const planning=buildHistoricalBackfillPlan({checkpoint,submissionsByCik,asOf,lookbackDays:c.lookbackDays,priorPerIssuer:c.priorPerIssuer}),ledger=loadR2Ledger({r2File,r1File,asOf}),r1SeedCompleted=Number(ledger.seededFrom?.completedAccessions??0);
  const report={status:'RUNNING',at:new Date().toISOString(),asOf,lookbackDays:c.lookbackDays,priorPerIssuer:c.priorPerIssuer,r1SeedCompleted,currentIssuerCount:planning.currentIssuerCount,plannedIssuerCount:planning.plannedIssuerCount,plannedAccessions:planning.plan.length,completedAccessions:0,remainingAccessions:planning.plan.length,ledgerTotalCompleted:Object.keys(ledger.completed).length,missingSubmissionCiks:planning.missingSubmissionCiks,noPriorCandidateCiks:planning.noPriorCandidateCiks,maxRequests,requestCount:0,downloadedDocuments:0,reusedDocuments:0,networkCalls:0,dbWrites:0,productionActivation:false,currentCheckpointMutated:false,r1LedgerMutated:false,errorCode:null,decision:'RUNNING'};
  const state={lastRequestAt:0};
  try{
    for(const candidate of planning.plan){
      if(ledger.completed[candidate.accessionNumber])continue;
      const primaryUrl=buildSecArchiveDocumentUrl(candidate);if(!primaryUrl)throw Object.assign(new Error('PRIMARY_URL_INVALID'),{code:'PRIMARY_URL_INVALID'});
      const primaryFile=localDocumentPath(documentsRoot,candidate,primaryUrl),primary=await fetchToFile(primaryUrl,primaryFile,{fetchImpl,state,report,sleepImpl});if(primary.status==='BUDGET')break;
      const sourceFiles=[{role:'PRIMARY',url:primaryUrl,sha256:primary.sha256,file:path.relative(root,primaryFile).replaceAll('\\','/')}],exhibitUrl=extractFirstExhibitLink(primary.bytes.toString('utf8'),{baseUrl:primaryUrl});
      if(exhibitUrl){const exhibitFile=localDocumentPath(documentsRoot,candidate,exhibitUrl),exhibit=await fetchToFile(exhibitUrl,exhibitFile,{fetchImpl,state,report,sleepImpl});if(exhibit.status==='BUDGET')break;sourceFiles.push({role:'EXHIBIT',url:exhibitUrl,sha256:exhibit.sha256,file:path.relative(root,exhibitFile).replaceAll('\\','/')});}
      ledger.completed[candidate.accessionNumber]={cik:candidate.cik,filed:candidate.filed,acceptedAt:candidate.acceptedAt,accessionNumber:candidate.accessionNumber,form:candidate.form,items:candidate.items,currentAccessionNumber:candidate.currentAccessionNumber,currentFiled:candidate.currentFiled,sourceFiles,storedAt:new Date().toISOString()};ledger.updatedAt=new Date().toISOString();atomicJson(r2File,ledger);
    }
  }catch(error){report.status='FAILED';report.errorCode=safeCode(error);}
  report.completedAccessions=planning.plan.filter(item=>ledger.completed[item.accessionNumber]).length;report.remainingAccessions=Math.max(0,planning.plan.length-report.completedAccessions);report.ledgerTotalCompleted=Object.keys(ledger.completed).length;report.networkCalls=report.requestCount;if(report.status!=='FAILED')report.status=report.remainingAccessions===0?'COMPLETE':'RUNNING';report.decision=report.status==='FAILED'?'STOP_AND_DIAGNOSE':report.remainingAccessions>0?'RESUME_REQUIRED':'R2_HISTORICAL_CORPUS_READY_FOR_GUIDANCE_READINESS';report.at=new Date().toISOString();
  const jsonReport=path.join(reportsDir,'e1-r5-sec-history-backfill-r2-last.json'),textReport=path.join(reportsDir,'e1-r5-sec-history-backfill-r2-last.txt');atomicJson(jsonReport,report);fs.writeFileSync(textReport,formatText(report),'utf8');return {report,jsonReport,textReport,ledgerFile:r2File,checkpointFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const cli=parseArgs(),maxRequests=Number(cli['max-requests']??100);collectEarningsR5SecHistoryR2({base:cli.base?path.resolve(cli.base):undefined,maxRequests}).then(({report,jsonReport,textReport,ledgerFile})=>{console.log(JSON.stringify({status:report.status,decision:report.decision,r1SeedCompleted:report.r1SeedCompleted,plannedAccessions:report.plannedAccessions,completedAccessions:report.completedAccessions,remainingAccessions:report.remainingAccessions,ledgerTotalCompleted:report.ledgerTotalCompleted,networkCalls:report.requestCount,dbWrites:0,productionActivation:false,textReport,jsonReport,ledgerFile}));if(report.status==='FAILED')process.exitCode=1;}).catch(error=>{console.log(JSON.stringify({status:'FAILED',code:safeCode(error)}));process.exitCode=1;});
}
