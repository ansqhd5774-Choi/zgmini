// Extract a narrow, safe performance summary from a locally generated LHR.
// No production API calls, personal data, remote uploads or arbitrary budgets.
import {readdir,readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const EXPECTED_ORIGIN='http://127.0.0.1:3000';
const METRICS=Object.freeze({
 firstContentfulPaint:'first-contentful-paint',
 largestContentfulPaint:'largest-contentful-paint',
 speedIndex:'speed-index',
 totalBlockingTime:'total-blocking-time',
 cumulativeLayoutShift:'cumulative-layout-shift'
});
export const PERFORMANCE_SCOPE='LOCAL_PRODUCTION_PREVIEW_ABOUT';

function finiteNonNegative(value){
 return typeof value==='number'&&Number.isFinite(value)&&value>=0;
}

export function summarizeLighthouseReport(report){
 if(!report||typeof report!=='object'||Array.isArray(report)||
    report.runtimeError||!report.audits||
    !report.categories?.performance||
    !finiteNonNegative(report.categories.performance.score)||
    report.categories.performance.score>1)
  throw Error('CI_PERFORMANCE_REPORT_INVALID');
 let requested,final;
 try{
  requested=new URL(report.requestedUrl);
  final=new URL(report.finalUrl);
 }catch{
  throw Error('CI_PERFORMANCE_URL_INVALID');
 }
 if(requested.origin!==EXPECTED_ORIGIN||
    final.origin!==EXPECTED_ORIGIN||
    !['/about','/about/'].includes(requested.pathname)||
    !['/about','/about/'].includes(final.pathname)||
    requested.search||final.search||requested.hash||final.hash)
  throw Error('CI_PERFORMANCE_URL_UNEXPECTED');
 const metrics={};
 for(const [name,key] of Object.entries(METRICS)){
  const value=report.audits[key]?.numericValue;
  if(!finiteNonNegative(value))throw Error('CI_PERFORMANCE_METRIC_INVALID_'+key);
  metrics[name]=value;
 }
 return {
  schemaVersion:1,
  scope:PERFORMANCE_SCOPE,
  urlPath:'/about',
  method:'Lighthouse CI v0.16.1 mobile lab, locally served production build',
  labOnly:true,
  budgetStatus:'UNSET_NO_GATING',
  performanceScore:report.categories.performance.score,
  metrics
 };
}

export function evaluatePerformanceBudget(summary,budget=null){
 if(!summary||summary.schemaVersion!==1||summary.scope!==PERFORMANCE_SCOPE)
  throw Error('CI_PERFORMANCE_SUMMARY_INCOMPARABLE');
 if(budget===null)return {status:'UNSET',violations:[],blocking:false};
 if(!budget||typeof budget!=='object'||Array.isArray(budget)||
    !Object.keys(budget).length||
    Object.keys(budget).some(key=>!(key in METRICS)))
  throw Error('CI_PERFORMANCE_BUDGET_INVALID');
 const violations=[];
 for(const [key,max] of Object.entries(budget)){
  if(!finiteNonNegative(max)||!finiteNonNegative(summary.metrics?.[key]))
   throw Error('CI_PERFORMANCE_BUDGET_INVALID');
  if(summary.metrics[key]>max)violations.push(key);
 }
 return {status:violations.length?'EXCEEDED':'WITHIN',
  violations,blocking:false};
}

export async function summarizeCollectedReports(directory){
 const entries=await readdir(directory);
 const reportFiles=entries.filter(x=>/^[A-Za-z0-9._-]+\.report\.json$/.test(x));
 if(reportFiles.length!==1)
  throw Error('CI_PERFORMANCE_REPORT_COUNT_INVALID');
 const file=await readFile(join(directory,reportFiles[0]),'utf8');
 if(file.length>15*1024*1024)throw Error('CI_PERFORMANCE_REPORT_TOO_LARGE');
 let report;
 try{report=JSON.parse(file);}catch{throw Error('CI_PERFORMANCE_REPORT_JSON_INVALID');}
 return summarizeLighthouseReport(report);
}

async function main(){
 if(process.argv.length!==2)throw Error('CI_PERFORMANCE_NO_ARGUMENTS');
 const summary=await summarizeCollectedReports(resolve('.lighthouseci'));
 const output=resolve('artifacts/ci-performance-lighthouse/summary.json');
 await mkdir(resolve('artifacts/ci-performance-lighthouse'),{recursive:true});
 await writeFile(output,JSON.stringify(summary,null,2)+'\n','utf8');
 console.log('CI_PERFORMANCE_LAB '+JSON.stringify({
  performanceScore:summary.performanceScore,metrics:summary.metrics,
  scope:summary.scope,budgetStatus:summary.budgetStatus
 }));
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{console.error(e.message);process.exitCode=1;});
