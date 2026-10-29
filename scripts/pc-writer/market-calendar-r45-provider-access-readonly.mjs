// R45: Exactly three (max) bounded verification requests on explicit manual invocation.
// No API key, authenticated URL, raw provider response, SQLite or D1 writes are logged.
import fs from 'node:fs';
import path from 'node:path';
import {parseEnv} from 'node:util';
import {fileURLToPath} from 'node:url';

const RESULT_NAME='MARKET_CALENDAR_R45_PROVIDER_ACCESS_RESULT.txt';
const TARGETS=Object.freeze([
 {id:'FMP_BATCH',provider:'FMP',symbols:['ABBV','AAPL'],url:'https://financialmodelingprep.com/stable/market-capitalization-batch',param:'symbols'},
 {id:'FMP_SINGLE',provider:'FMP',symbols:['ABBV'],url:'https://financialmodelingprep.com/stable/market-capitalization',param:'symbol'},
 {id:'EARNINGS_PROFILE',provider:'EARNINGSAPI',symbols:['ABBV'],url:'https://api.earningsapi.com/v1/profile/ABBV'},
]);
const isObject=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const num=v=>typeof v==='number'&&Number.isFinite(v)&&v>0;
const mask=v=>String(v??'').replace(/[\u0000-\u001f]/g,'');
export function classifyMarketCapBody(id,status,body){
 const generic={id,httpStatus:status,access:'UNKNOWN',validSymbols:0,observedSymbols:0,hasAsOfDate:false};
 if(status===401)return {...generic,access:'AUTH_REJECTED'};
 if(status===403||status===402)return {...generic,access:'PLAN_OR_PERMISSION_RESTRICTED'};
 if(status===429)return {...generic,access:'QUOTA_OR_RATE_LIMITED'};
 if(status<200||status>=300)return {...generic,access:'HTTP_ERROR'};
 let parsed;try{parsed=JSON.parse(body);}catch{return {...generic,access:'NON_JSON_RESPONSE'};}
 const flags=JSON.stringify(parsed).slice(0,3000).toLowerCase();
 if(/upgrade|premium|subscribe|subscription|plan.*restricted|not available under|not authorized|access denied/.test(flags))
  return {...generic,access:'PLAN_OR_PERMISSION_RESTRICTED'};
 if(/invalid api key|invalid apikey|api key is invalid/.test(flags))return {...generic,access:'AUTH_REJECTED'};
 const expected=TARGETS.find(t=>t.id===id)?.symbols??[];
 let rows=Array.isArray(parsed)?parsed:isObject(parsed)&&Array.isArray(parsed.data)?parsed.data:[parsed];
 if(isObject(parsed)&&isObject(parsed.data))rows=[parsed.data];
 const matched=rows.filter(x=>isObject(x)&&expected.includes(String(x.symbol??x.ticker??'').toUpperCase()));
 const valid=matched.filter(x=>num(x.marketCap)||num(x.marketcap));
 const at=valid.some(x=>/^20\d\d-\d\d-\d\d$/.test(String(x.date??x.asOfDate??'')));
 return {...generic,access:valid.length?'CAP_FIELD_PRESENT':matched.length?'CAP_FIELD_MISSING':'SCHEMA_OR_SYMBOL_MISMATCH',
  validSymbols:valid.length,observedSymbols:matched.length,hasAsOfDate:at};
}
async function singleRequest(t,key,fetchImpl){
 const url=new URL(t.url);
 if(t.param)url.searchParams.set(t.param,t.symbols.join(','));
 url.searchParams.set('apikey',key);
 try{
  const response=await fetchImpl(url.toString(),{method:'GET',headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
  const length=Number(response.headers?.get?.('content-length')??0);
  if(length>64*1024)return {id:t.id,httpStatus:response.status,access:'OVERSIZED_RESPONSE_STOP',validSymbols:0,observedSymbols:0,hasAsOfDate:false};
  const body=await response.text();
  if(body.length>64*1024)return {id:t.id,httpStatus:response.status,access:'OVERSIZED_RESPONSE_STOP',validSymbols:0,observedSymbols:0,hasAsOfDate:false};
  return classifyMarketCapBody(t.id,response.status,body);
 }catch{return {id:t.id,httpStatus:null,access:'NETWORK_OR_TIMEOUT',validSymbols:0,observedSymbols:0,hasAsOfDate:false};}
}
export async function runR45({keys,fetchImpl=fetch}={}){
 // Report only provider labels and aggregate outcomes, never keys or raw data.
 const report={audit:'MARKET_CALENDAR_R45_PROVIDER_ACCESS',mode:'MANUAL_BOUNDED_PROBE',providerRequests:0,
  maxProviderRequests:3,dbWrites:0,d1Writes:0,gitChanges:0,scheduled:false,credentialsExposed:false,rawDataLogged:false,endpoints:[]};
 if(!isObject(keys))return {...report,status:'R45_PROVIDER_KEYS_UNAVAILABLE'};
 for(const target of TARGETS){
  const key=target.provider==='FMP'?keys.FMP_API_KEY:(keys.EARNINGSAPI_API_KEY??keys.EARNINGS_API_KEY);
  if(typeof key!=='string'||!key.trim()){
   report.endpoints.push({id:target.id,access:'MISSING_CONFIGURED_KEY',httpStatus:null,validSymbols:0,observedSymbols:0,hasAsOfDate:false});
   continue;
  }
  report.providerRequests++;
  report.endpoints.push(await singleRequest(target,key.trim(),fetchImpl));
 }
 report.status='R45_BOUNDED_PROBE_COMPLETED';
 report.fullCoverageValidated=false;
 report.publicDisplayLicenseValidated=false;
 report.nextGate='INSPECT_PROVIDER_ACCESS_AND_DESIGN_BULK_OR_OFFICIAL_FALLBACK';
 return report;
}
export async function runOnPc(pcHome,outputDir,{fetchImpl=fetch}={}){
 const output=path.join(outputDir,RESULT_NAME);
 if(fs.existsSync(output))return {status:'R45_RESULT_ALREADY_EXISTS_STOP',output,recorded:false};
 const envFile=path.join(pcHome,'providers.env');
 let keys;
 try{
  if(!fs.existsSync(envFile))throw Error('MISSING');
  keys=parseEnv(fs.readFileSync(envFile,'utf8'));
 }catch{
  keys={};
 }
 const report=await runR45({keys,fetchImpl});
 const entries=Object.entries(report).map(([k,v])=>k+'='+JSON.stringify(v));
 // Exclusive-create so a re-run never overwrites an earlier diagnostic result.
 fs.writeFileSync(output,entries.join('\r\n')+'\r\n',{encoding:'utf8',flag:'wx'});
 return {status:report.status,output,recorded:true};
}
const self=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(self){
 const pcHome=process.argv[2]||'E:\\ZGmini\\data\\pc-writer';
 const dir=path.dirname(fileURLToPath(import.meta.url));
 try{
  const result=await runOnPc(pcHome,dir);
  process.stdout.write('STATUS='+mask(result.status)+'\nRESULT='+RESULT_NAME+'\n');
  if(result.status!=='R45_BOUNDED_PROBE_COMPLETED')process.exitCode=2;
 }catch{
  process.stdout.write('STATUS=R45_LOCAL_DIAGNOSTIC_ERROR_STOP\n');process.exitCode=2;
 }
}
