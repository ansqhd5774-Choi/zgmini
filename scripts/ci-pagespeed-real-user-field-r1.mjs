// R2 #8: public Google PageSpeed Insights read-only field-data observation.
// Only real CrUX percentile values can be used for field Core Web Vitals.
// Optional origin fallback is labelled; no fabricated values, API keys or gates.
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {WEB_SPEED_GOOD} from './ci-web-speed-good-r2.mjs';

export const ORIGIN='https://zgmini.kr';
export const PAGE=ORIGIN+'/';
export const API='https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
export const STRATEGIES=Object.freeze(['mobile','desktop']);
export const CRUX_KEYS=Object.freeze({
 lcpMs:'LARGEST_CONTENTFUL_PAINT_MS',
 inpMs:'INTERACTION_TO_NEXT_PAINT',
 cls:'CUMULATIVE_LAYOUT_SHIFT_SCORE'
});
export const FIELD_SCOPE='PUBLIC_GOOGLE_PSI_CRUX_ROLLING_28_DAY_P75';
const error=(m)=>{throw Error(m);};
const isObject=v=>Boolean(v)&&typeof v==='object'&&!Array.isArray(v);
const cleanNumber=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
function normalizeUrl(raw){
 try{
  const u=new URL(raw);
  return u.protocol==='https:'&&u.username===''&&u.password===''&&
   u.search===''&&u.hash===''&&u.origin===ORIGIN&&u.pathname==='/' ?
   u.href:null;
 }catch{return null;}
}

function metric(metricKey,raw){
 const key=CRUX_KEYS[metricKey];
 const unitScale=metricKey==='cls'?100:1;
 const p=raw?.metrics?.[key]?.percentile;
 // PSI CLS percentile is stored in 100x layout-shift units: 5 -> 0.05.
 const value=Number.isSafeInteger(p)&&p>=0?
  Math.round(p/unitScale*100000)/100000:null;
 const goodLimit=WEB_SPEED_GOOD[metricKey];
 return {p75:value,goodLimit,state:value===null?'UNVERIFIED':
   value<=goodLimit?'GOOD':'EXCEEDS_GOOD'};
}
function extractField(psi){
 const page=psi?.loadingExperience;
 const origin=psi?.originLoadingExperience;
 const pageUsable=isObject(page)&&isObject(page.metrics)&&
  Object.keys(page.metrics).length>0&&!page.origin_fallback&&
  normalizeUrl(page.id)===PAGE;
 const originUsable=isObject(origin)&&isObject(origin.metrics)&&
  Object.keys(origin.metrics).length>0&&origin.id===ORIGIN;
 const data=pageUsable?page:originUsable?origin:null;
 const scope=pageUsable?'PAGE_URL':originUsable?'ORIGIN_AGGREGATE':null;
 const metrics=Object.fromEntries(Object.keys(CRUX_KEYS).map(k=>[k,metric(k,data)]));
 const states=Object.values(metrics).map(x=>x.state);
 const overall=!data?'NO_CRUX_FIELD_DATA':
  states.includes('EXCEEDS_GOOD')?'FIELD_GOOD_TARGET_EXCEEDED':
  states.includes('UNVERIFIED')?'FIELD_METRICS_INCOMPLETE':
  'FIELD_ALL_THREE_GOOD';
 return {dataScope:scope,overall,metrics};
}
function lighthouseScore(psi){
 const score=psi?.lighthouseResult?.categories?.performance?.score;
 const n=typeof score==='number'&&Number.isFinite(score)&&
   score>=0&&score<=1?Math.round(score*1000)/10:null;
 return {score:n,goodMinimum:WEB_SPEED_GOOD.lighthousePerformanceScore,
  state:n===null?'UNVERIFIED':n>=WEB_SPEED_GOOD.lighthousePerformanceScore?
   'GOOD':'BELOW_GOOD'};
}

export function evaluatePsiFieldResponse(strategy,psi){
 if(!STRATEGIES.includes(strategy)||!isObject(psi))
  error('CI_PSI_FIELD_INVALID_RESPONSE');
 // PSI must represent the intended site. URL-level and origin-level values
 // are separately checked below, so redirects can never relabel a different site.
 if(normalizeUrl(psi.id)!==PAGE)
  error('CI_PSI_FIELD_UNEXPECTED_TARGET');
 const field=extractField(psi);
 const lighthouse=lighthouseScore(psi);
 return {strategy,sourceStatus:'PSI_RECEIVED',
  collectionScope:FIELD_SCOPE,
  dataScope:field.dataScope,fieldState:field.overall,
  metrics:field.metrics,lighthouse,
  analysisUtcTimestamp:typeof psi.analysisUTCTimestamp==='string'?
   psi.analysisUTCTimestamp:null,
  approvedBlockingGate:false};
}
export function unavailablePsiResult(strategy,status){
 if(!STRATEGIES.includes(strategy)||![
  'HTTP_403','HTTP_429','HTTP_5XX','HTTP_OTHER','TIMEOUT_OR_NETWORK',
  'INVALID_RESPONSE','NO_API_KEY_REQUIRED_BUT_DISABLED'
 ].includes(status))
  error('CI_PSI_SOURCE_STATE_INVALID');
 return {strategy,sourceStatus:status,collectionScope:FIELD_SCOPE,
  dataScope:null,fieldState:'UNVERIFIED',
  metrics:Object.fromEntries(Object.keys(CRUX_KEYS).map(k=>[k,{
   p75:null,goodLimit:WEB_SPEED_GOOD[k],state:'UNVERIFIED'
  }])),
  lighthouse:{score:null,goodMinimum:WEB_SPEED_GOOD.lighthousePerformanceScore,
   state:'UNVERIFIED'},analysisUtcTimestamp:null,
  approvedBlockingGate:false};
}
function classifyHttp(status){
 if(status===403)return 'HTTP_403';
 if(status===429)return 'HTTP_429';
 if(status>=500)return 'HTTP_5XX';
 return 'HTTP_OTHER';
}
export async function queryPsiField(strategy,{fetchFn=fetch,timeoutMs=85000}={}){
 if(!STRATEGIES.includes(strategy)||typeof fetchFn!=='function'||
  !Number.isInteger(timeoutMs)||timeoutMs<1000||timeoutMs>90000)
  error('CI_PSI_QUERY_SCOPE_INVALID');
 const url=new URL(API);
 url.searchParams.set('url',PAGE);
 url.searchParams.set('strategy',strategy);
 url.searchParams.set('category','performance');
 let response;
 try{
  response=await fetchFn(url.toString(),{
   method:'GET',redirect:'error',
   signal:AbortSignal.timeout(timeoutMs),
   headers:{accept:'application/json'}
  });
 }catch{return unavailablePsiResult(strategy,'TIMEOUT_OR_NETWORK');}
 if(!response?.ok)return unavailablePsiResult(strategy,classifyHttp(response?.status));
 let data;
 try{data=await response.json();}catch{return unavailablePsiResult(strategy,'INVALID_RESPONSE');}
 try{return evaluatePsiFieldResponse(strategy,data);}
 catch(e){
  if(e.message==='CI_PSI_FIELD_INVALID_RESPONSE')return unavailablePsiResult(strategy,'INVALID_RESPONSE');
  if(e.message==='CI_PSI_FIELD_UNEXPECTED_TARGET')
   return unavailablePsiResult(strategy,'INVALID_RESPONSE');
  throw e;
 }
}

export function summarizePsiDevices(devices){
 if(!Array.isArray(devices)||devices.length!==STRATEGIES.length||
  devices.some((x,i)=>x?.strategy!==STRATEGIES[i]||
   x.approvedBlockingGate!==false))
  error('CI_PSI_DEVICE_INVENTORY_INVALID');
 return {schemaVersion:1,target:PAGE,
  observedAt:new Date().toISOString(),
  source:'GOOGLE_PAGESPEED_INSIGHTS_PUBLIC_API',
  scope:FIELD_SCOPE,referenceThresholds:WEB_SPEED_GOOD,
  targetKind:'OFFICIAL_GOOD',
  classification:devices.every(x=>x.fieldState==='FIELD_ALL_THREE_GOOD')?
   'BOTH_DEVICES_FIELD_GOOD':
   devices.some(x=>x.fieldState==='FIELD_GOOD_TARGET_EXCEEDED')?
   'ONE_OR_MORE_DEVICES_EXCEED_GOOD':
   'SITE_FIELD_GOOD_UNVERIFIED',
  mergeBlocking:false,automaticReleaseGate:false,
  devices};
}

export async function main(){
 if(process.argv.length!==2||process.env.CI!=='true')
  error('CI_PSI_CI_ONLY');
 // Exactly two bounded public GETs; no credentials or deployment data.
 const devices=await Promise.all(STRATEGIES.map(s=>queryPsiField(s)));
 const result=summarizePsiDevices(devices);
 const dir=resolve('artifacts/performance-lab');
 await mkdir(dir,{recursive:true});
 await writeFile(resolve(dir,'production-psi-crux-field.json'),
  JSON.stringify(result,null,2)+'\n','utf8');
 console.log('CI_PSI_PUBLIC_FIELD '+JSON.stringify({
  classification:result.classification,devices:result.devices.map(v=>({
   strategy:v.strategy,sourceStatus:v.sourceStatus,dataScope:v.dataScope,
   fieldState:v.fieldState,p75:Object.fromEntries(Object.entries(v.metrics).map(
    ([k,m])=>[k,m.p75])),lighthouse:v.lighthouse
  })),mergeBlocking:false
 }));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{console.error(e.message);process.exitCode=1;});
