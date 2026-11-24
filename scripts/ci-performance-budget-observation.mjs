// #8 Performance Budget pre-approval evidence: historical local Playwright lab only.
// Never infer a performance threshold, production Web Vital or pass/fail budget.
// Existing browser CI remains the sole executor; GitHub Actions read only.
import {execFileSync} from 'node:child_process';
import {mkdtemp,readFile,rm,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {LAB_SCHEMA,LAB_FIXTURE,VIEWPORTS,METRIC_NAMES,
 comparePerformanceLab} from './ci-performance-lab.mjs';

export const BUDGET_STATUS='NOT_CONFIGURED';
export const REPOSITORY='ansqhd5774-Choi/zgmini';
export const BROWSER_WORKFLOW='community-chat-browser.yml';
export const ARTIFACT='community-chat-browser-r1';
const SHA=/^[a-f0-9]{40}$/;
const EXIT=(code)=>{throw Error(code);};
function validLab(value){
 if(!value||value.schemaVersion!==LAB_SCHEMA||
  value.fixture!==LAB_FIXTURE||!Array.isArray(value.reports)||
  value.reports.length!==VIEWPORTS.length||
  value.reports.some((v,i)=>v?.schemaVersion!==LAB_SCHEMA||
   v.fixture!==LAB_FIXTURE||
   v.viewport?.width!==VIEWPORTS[i].width||
   v.viewport?.height!==VIEWPORTS[i].height||
   typeof v.browserVersion!=='string'||!v.browserVersion||
   !v.metrics||typeof v.metrics!=='object'||
   METRIC_NAMES.some(name=>!Object.hasOwn(v.metrics,name))))
  EXIT('CI_BUDGET_LAB_REPORT_UNVERIFIED');
 return value;
}

export function compareBudgetObservations(historical,current){
 validLab(historical);validLab(current);
 const details=[];
 for(let i=0;i<VIEWPORTS.length;i++){
  const before=historical.reports[i],after=current.reports[i];
  let delta;
  try{delta=comparePerformanceLab(before,after);}
  catch(e){
   if(e.message==='CI_PERFORMANCE_BASELINE_INCOMPARABLE')
    return {state:'INCOMPARABLE_FIXTURE_OR_BROWSER',details:[]};
   throw e;
  }
  details.push({viewport:after.viewport,fixture:after.fixture,
   browserVersion:after.browserVersion,
   historicalMetrics:before.metrics,currentMetrics:after.metrics,
   comparableMetrics:delta.comparableMetrics,deltas:delta.deltas});
 }
 if(details.every(v=>v.comparableMetrics===0))
  return {state:'UNVERIFIED_METRICS',details};
 return {state:'COMPARABLE_OBSERVATION',details};
}

export function eligibleHistoricalRuns(runs,{currentRunId,currentHeadSha,limit=3}={}){
 if(!Array.isArray(runs)||runs.length>30||
    !Number.isSafeInteger(currentRunId)||currentRunId<1||
    !SHA.test(currentHeadSha??'')||
    !Number.isInteger(limit)||limit<1||limit>3)
  EXIT('CI_BUDGET_HISTORY_INPUT_UNVERIFIED');
 return runs.filter(r=>r&&Number.isSafeInteger(r.databaseId)&&
   r.databaseId>0&&r.databaseId<currentRunId&&
   r.status==='completed'&&r.conclusion==='success'&&
   SHA.test(r.headSha??'')&&r.headSha!==currentHeadSha&&
   ['pull_request','workflow_dispatch'].includes(r.event))
  .slice(0,limit);
}

export async function reviewHistoricalBudget({
 current,runs,currentRunId,currentHeadSha,download,limit=3
}={}){
 validLab(current);
 if(typeof download!=='function')EXIT('CI_BUDGET_DOWNLOAD_REQUIRED');
 const candidates=eligibleHistoricalRuns(runs,{currentRunId,currentHeadSha,limit});
 let unavailable=0,incomparable=0;
 for(const candidate of candidates){
  const raw=await download(candidate);
  if(raw===null){unavailable++;continue;} // expired/missing artifact
  let result;
  try{result=compareBudgetObservations(raw,current);}
  catch(e){
   if(e.message==='CI_BUDGET_LAB_REPORT_UNVERIFIED'){incomparable++;continue;}
   throw e;
  }
  if(result.state!=='COMPARABLE_OBSERVATION'){
   incomparable++;
   continue;
  }
  return {schemaVersion:1,
   status:BUDGET_STATUS,approvedThresholds:false,mergeBlocking:false,
   scope:'PREAPPROVAL_LOCAL_API_UNAVAILABLE_CHROMIUM_LAB',
   historicalBaselineStatus:'HISTORICAL_NOT_APPROVED',
   comparisonState:result.state,currentRunId,currentHeadSha,
   historical:{runId:candidate.databaseId,headSha:candidate.headSha,event:candidate.event},
   candidatesChecked:unavailable+incomparable+1,
   unavailableArtifacts:unavailable,incomparableArtifacts:incomparable,
   details:result.details};
 }
 return {schemaVersion:1,status:BUDGET_STATUS,approvedThresholds:false,
  mergeBlocking:false,scope:'PREAPPROVAL_LOCAL_API_UNAVAILABLE_CHROMIUM_LAB',
  historicalBaselineStatus:'UNVERIFIED',
  comparisonState:candidates.length?'NO_COMPARABLE_HISTORICAL_ARTIFACT':'NO_PRIOR_SUCCESSFUL_RUN',
  currentRunId,currentHeadSha,historical:null,candidatesChecked:candidates.length,
  unavailableArtifacts:unavailable,incomparableArtifacts:incomparable,details:[]};
}

function gh(args,env){
 return execFileSync('gh',args,{encoding:'utf8',env,
  timeout:45000,maxBuffer:1024*1024*2,windowsHide:true,
  stdio:['ignore','pipe','pipe']}).trim();
}
async function downloadArtifact(run,env){
 const dir=await mkdtemp(join(tmpdir(),'zgmini-perf-history-'));
 try{
  try{
   gh(['run','download',String(run.databaseId),'--repo',REPOSITORY,
    '--name',ARTIFACT,'--dir',dir],env);
  }catch{return null;} // artifact missing/expired; no synthetic sample
  for(const path of ['performance-lab/report.json','artifacts/performance-lab/report.json']){
   try{return JSON.parse(await readFile(join(dir,path),'utf8'));}
   catch(e){if(e.code!=='ENOENT')throw e;}
  }
  return null;
 }finally{await rm(dir,{recursive:true,force:true});}
}

export async function main(){
 if(process.argv.length!==2||process.env.CI!=='true'||
    process.env.GITHUB_REPOSITORY!==REPOSITORY||
    !/^[1-9][0-9]*$/.test(process.env.GITHUB_RUN_ID??'')||
    !SHA.test(process.env.GITHUB_SHA??'')||
    typeof process.env.GITHUB_TOKEN!=='string'||
    !process.env.GITHUB_TOKEN.trim())
  EXIT('CI_BUDGET_RUN_CONTEXT_INVALID');
 const current=JSON.parse(await readFile(
  resolve('artifacts/performance-lab/report.json'),'utf8'));
 const env={...process.env,GH_TOKEN:process.env.GITHUB_TOKEN,
  GH_PROMPT_DISABLED:'1'};
 const response=gh(['run','list','--repo',REPOSITORY,
  '--workflow',BROWSER_WORKFLOW,'--limit','30',
  '--json','databaseId,headSha,event,status,conclusion'],env);
 const runs=JSON.parse(response);
 const result=await reviewHistoricalBudget({current,runs,
  currentRunId:Number(process.env.GITHUB_RUN_ID),
  currentHeadSha:process.env.GITHUB_SHA,
  download:run=>downloadArtifact(run,env)});
 const dir=resolve('artifacts/performance-lab');
 await mkdir(dir,{recursive:true});
 await writeFile(join(dir,'budget-observation.json'),
  JSON.stringify(result,null,2)+'\n');
 console.log('CI_PERFORMANCE_BUDGET_OBSERVATION '+JSON.stringify({
  status:result.status,comparisonState:result.comparisonState,
  candidatesChecked:result.candidatesChecked,
  historicalRunId:result.historical?.runId??null,
  comparableMetrics:result.details.map(r=>r.comparableMetrics),
  mergeBlocking:false
 }));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{console.error(e.message);process.exitCode=1;});
