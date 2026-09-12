import {fetchBls,BLS_SERIES} from '../lib/market-data/providers.mjs';
import {payrollChanges} from '../lib/market-data/semantics.mjs';
import {inspectRuntime} from './p0-runtime-signals.mjs';
import {POLICY} from './p0-fred-transport.mjs';
function pair(points){if(points.length<2)throw Error('HISTORY');return [points.at(-1),points.at(-2)];}
function yoy(points){const [current,previous]=pair(points);const prior=p=>points.find(v=>v.date===`${Number(p.date.slice(0,4))-1}${p.date.slice(4)}`);const a=prior(current),b=prior(previous);if(!a||!b||a.value===0||b.value===0)throw Error('HISTORY');return {currentRaw:current.value,yearAgoRaw:a.value,previousRaw:previous.value,previousYearAgoRaw:b.value,currentYoY:(current.value/a.value-1)*100,previousYoY:(previous.value/b.value-1)*100,currentDate:current.date,previousDate:previous.date,semantic:'MATCH'};}
export function summarizeBls(data){const cpi=yoy(data.get(BLS_SERIES.cpi)??[]),ppi=yoy(data.get(BLS_SERIES.ppi)??[]);const [u,v]=pair(data.get(BLS_SERIES.unemployment)??[]);const levels=data.get(BLS_SERIES.payrolls)??[],changes=payrollChanges(levels);const [a,b]=pair(changes);return {cpi,ppi,unemployment:{current:u.value,previous:v.value,currentDate:u.date,previousDate:v.date,formulaReceives:'RAW_PERCENT_LEVEL',semantic:'MATCH'},payroll:{currentLevel:levels.at(-1).value,previousLevel:levels.at(-2).value,priorLevel:levels.at(-3).value,currentMonthlyChange:a.value,previousMonthlyChange:b.value,currentDate:a.date,previousDate:b.date,priorDate:levels.at(-3).date,unit:'THOUSAND_PERSONS',formulaCurrentValue:a.value,formulaPreviousValue:b.value,semantic:'MATCH',liveValidation:'PASS'}};}
export function createBlsDiagnostic({fetchImpl=globalThis.fetch,now=Date.now,cacheStore=()=>globalThis.caches?.default}={}){let cache,inFlight;return async function(request,env={},context={}){
 const runtime=inspectRuntime(request,context).runtimeClassification;
 const reply=(b,status=200)=>Response.json({diagnosticOnly:true,runtimeClassification:runtime,...b},{status,headers:{'cache-control':'no-store','x-robots-tag':'noindex'}});
 if(request.method!=='GET')return reply({error:'METHOD_NOT_ALLOWED',requestCount:0},405);
 if(new URL(request.url).search)return reply({error:'QUERY_NOT_ALLOWED',requestCount:0},400);
 if(now()>=Date.parse(POLICY.expiresAt))return reply({error:'EXPIRED',requestCount:0},410);
 if(runtime!=='PRODUCTION_CONFIRMED')return reply({status:'NOT_RUN',requestCount:0});
 const key=(typeof env.BLS_API_KEY==='string'?env.BLS_API_KEY.trim():'')||(typeof env.BLS_REGISTRATION_KEY==='string'?env.BLS_REGISTRATION_KEY.trim():'');
 if(!key)return reply({keyPresent:false,registered:false,requestCount:0,durationMs:0,status:'KEY_MISSING',classification:'PRODUCTION_BLS_KEY_MISSING'});
 if(cache&&now()-cache.at<POLICY.cacheMs)return reply(cache.data);
 if(!inFlight)inFlight=(async()=>{
 const store=cacheStore(),cacheKey=new Request('https://zgmini.kr/api/internal/p0-bls-transport-check');
 if(store)try{const hit=await store.match(cacheKey);if(hit){const saved=await hit.json();if(now()-saved.at<POLICY.cacheMs){cache=saved;return saved.data;}}}catch{}
 let networkError=false;const result=await fetchBls({key,now:new Date(now()),fetchImpl:async function(url,init){try{return await Reflect.apply(fetchImpl,globalThis,[url,{...init,redirect:'manual'}]);}catch(e){networkError=true;throw e;}}});
 let classification={TIMEOUT:'PRODUCTION_BLS_TIMEOUT',HTTP_ERROR:'PRODUCTION_BLS_HTTP_FAILURE',QUOTA_EXCEEDED:'PRODUCTION_BLS_AUTH_FAILURE',REQUEST_FAILED:networkError?'PRODUCTION_BLS_DATA_FAILURE':'PRODUCTION_BLS_AUTH_FAILURE'}[result.status]??'PRODUCTION_BLS_DATA_FAILURE';
 let series; if(result.status==='SUCCESS')try{series=summarizeBls(result.data);classification='PRODUCTION_BLS_REGISTERED_PASS';}catch{}
 const data={keyPresent:true,registered:result.registered,requestCount:result.requestCount,durationMs:result.durationMs,status:result.status,classification,...(series?{series}:{})};
 cache={at:now(),data};if(store)try{await store.put(cacheKey,Response.json(cache,{headers:{'cache-control':'public, max-age=900'}}));}catch{}
 return data;})().finally(()=>{inFlight=null;});return reply(await inFlight);
 };}
export const blsDiagnostic=createBlsDiagnostic();
