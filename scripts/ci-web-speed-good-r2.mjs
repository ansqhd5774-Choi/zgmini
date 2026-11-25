// R2 #8: Google's published web-speed "Good" thresholds as a CI reference.
// Does not pretend a local Vite API-unavailable lab measures real-user p75,
// INP, Lighthouse score, or production traffic. No new external calls or gates.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {LAB_SCHEMA,LAB_FIXTURE,BASE,VIEWPORTS,METRIC_NAMES,
 normalizeRawMetrics} from './ci-performance-lab.mjs';

export const WEB_SPEED_GOOD=Object.freeze({
 lcpMs:2500,
 inpMs:200,
 cls:0.1,
 fcpMs:1800,
 lighthousePerformanceScore:90
});
export const STANDARD_SOURCES=Object.freeze({
 coreWebVitals:'https://web.dev/articles/vitals',
 fcp:'https://web.dev/articles/fcp',
 lighthouse:'https://developer.chrome.com/docs/lighthouse/performance/performance-scoring'
});
export const MEASURED_LAB_METRICS=Object.freeze(['lcpMs','cls','fcpMs']);
export const TARGET_STATE='OFFICIAL_GOOD_TARGETS_CONFIGURED';
const invalid=()=>{throw Error('CI_WEB_SPEED_LAB_UNVERIFIED');};

function evaluateOne(metric,value){
 const limit=WEB_SPEED_GOOD[metric];
 if(!Number.isFinite(limit)||limit<0)throw Error('CI_WEB_SPEED_TARGET_INVALID');
 const measured=value===null?null:
  typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;
 return {observed:measured,limit,
  state:measured===null?'UNVERIFIED':measured<=limit?
   'AT_OR_BELOW_GOOD_TARGET':'EXCEEDS_GOOD_TARGET'};
}
function validReport(report){
 if(!report||report.schemaVersion!==LAB_SCHEMA||
    report.fixture!==LAB_FIXTURE||
    !Array.isArray(report.reports)||
    report.reports.length!==VIEWPORTS.length||
    report.scope!=='local mock browser laboratory only')invalid();
 const seen=new Set();
 for(const value of report.reports){
  if(value?.schemaVersion!==LAB_SCHEMA||value.fixture!==LAB_FIXTURE||
   value.url!==BASE+'/'||
   typeof value.browserVersion!=='string'||!value.browserVersion.trim()||
   !value.metrics||typeof value.metrics!=='object'||Array.isArray(value.metrics)||
   !VIEWPORTS.some(x=>x.width===value.viewport?.width&&x.height===value.viewport?.height)||
   METRIC_NAMES.some(name=>!Object.hasOwn(value.metrics,name)))invalid();
  const key=value.viewport.width+'x'+value.viewport.height;
  if(seen.has(key))invalid();
  seen.add(key);
 }
 return report.reports;
}
export function assessWebSpeedGoodLab(report){
 const rows=validReport(report);
 const devices=rows.map(row=>{
  const raw=normalizeRawMetrics(row.metrics);
  const assessed=Object.fromEntries(MEASURED_LAB_METRICS.map(
   metric=>[metric,evaluateOne(metric,raw[metric])]));
  const states=Object.values(assessed).map(x=>x.state);
  const labReferenceState=states.includes('EXCEEDS_GOOD_TARGET')?
   'LAB_GOOD_TARGET_EXCEEDED':
   states.includes('UNVERIFIED')?'LAB_METRICS_INCOMPLETE':
   'LAB_MEASURED_TARGETS_MET';
  return {viewport:row.viewport,browserVersion:row.browserVersion,
   fixture:row.fixture,labReferenceState,
   metrics:assessed};
 });
 return {schemaVersion:1,standard:'GOOGLE_WEB_SPEED_GOOD',
  targetState:TARGET_STATE,referenceSources:STANDARD_SOURCES,
  thresholds:WEB_SPEED_GOOD,
  sampleKind:'LOCAL_ISOLATED_API_UNAVAILABLE',
  productionFieldP75:'UNVERIFIED',
  coreWebVitalsSiteGood:'UNVERIFIED',
  inp:{value:null,limit:WEB_SPEED_GOOD.inpMs,state:'NOT_MEASURED'},
  lighthousePerformanceScore:{value:null,minimum:WEB_SPEED_GOOD.lighthousePerformanceScore,state:'NOT_MEASURED'},
  mergeBlocking:false,automaticReleaseGate:false,
  devices};
}
async function main(){
 if(process.argv.length!==2||process.env.CI!=='true')
  throw Error('CI_WEB_SPEED_CI_ONLY');
 const input=JSON.parse(await readFile(
  resolve('artifacts/performance-lab/report.json'),'utf8'));
 const report=assessWebSpeedGoodLab(input);
 const dir=resolve('artifacts/performance-lab');
 await mkdir(dir,{recursive:true});
 await writeFile(resolve(dir,'web-speed-good.json'),
  JSON.stringify(report,null,2)+'\n','utf8');
 console.log('CI_WEB_SPEED_GOOD_REFERENCE '+JSON.stringify({
  targets:report.thresholds,
  states:report.devices.map(x=>({viewport:x.viewport,state:x.labReferenceState,
   metrics:x.metrics})),
  fieldP75:report.productionFieldP75,
  inp:report.inp.state,
  lighthouse:report.lighthousePerformanceScore.state,
  mergeBlocking:false
 }));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{console.error(e.message);process.exitCode=1;});
