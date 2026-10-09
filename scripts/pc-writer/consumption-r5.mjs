import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {loadLocalProviders} from './local-env.mjs';
import {localDatabase} from './local-db.mjs';
import {marketOperationalStore} from '../../worker/market-operational-store.mjs';
import {hash} from './d1.mjs';
import {calculateConsumptionR5} from '../../lib/market-score/consumption-r5.mjs';

const categories=[4,5,6,7,9,10,11,12,15,16,17,18,19,20,21,22];
const isNumber=x=>typeof x==='number'&&Number.isFinite(x);
export async function collectConsumptionR5({db,fetchImpl=globalThis.fetch,now=Date.now(),providers}={}){
 const store=marketOperationalStore(db),previous=await store.readInput('consumption-r5');
 if(previous&&now>=previous.storedAt&&now-previous.storedAt<86400000)return {status:'COMPLETE',providerRequests:0};
 const pending=await store.readInput('consumption-r5-pending');
 if(pending&&now>=pending.storedAt&&now-pending.storedAt<86400000){
  const result=calculateConsumptionR5(pending.body,{asOfDate:new Date(now).toISOString().slice(0,10)});
  if(result.status==='READY'){
   await store.writeInput('consumption-r5',pending.body,pending.storedAt);
   if(hash((await store.readInput('consumption-r5'))?.body)!==hash(pending.body))throw Error('R5_READBACK');
   return {status:'COMPLETE',providerRequests:0,resumed:true,score:result.score,observationDate:result.updatedAt,trendPoints:result.trend.length};
  }
 }
 const env=providers??loadLocalProviders(process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer'));
 if(!env.FRED_API_KEY||!env.BEA_API_KEY)return {status:'FAILED',reason:'R5_PROVIDER_CONFIGURATION_MISSING',providerRequests:0};
 let requests=0;
 const json=async(url)=>{requests++;const r=await fetchImpl(url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('R5_PROVIDER_HTTP');return r.json();};
 const fred=async(id,initial=false)=>{
  const url=new URL('https://api.stlouisfed.org/fred/series/observations');
  const params={series_id:id,api_key:env.FRED_API_KEY,file_type:'json',observation_start:'2013-01-01'};
  if(initial)Object.assign(params,{realtime_start:'1776-07-04',realtime_end:'9999-12-31',output_type:'4'});
  for(const [key,value]of Object.entries(params))url.searchParams.set(key,value);
  const body=await json(url);if(!Array.isArray(body.observations))throw Error('R5_FRED_SCHEMA');return body.observations;
 };
 const bea=async(dataset,table)=>{
  const url=new URL('https://apps.bea.gov/api/data');
  const years=Array.from({length:new Date(now).getUTCFullYear()-2013+1},(_,i)=>String(2013+i)).join(',');
  for(const [key,value]of Object.entries({UserID:env.BEA_API_KEY,method:'GetData',datasetname:dataset,TableName:table,Frequency:'M',Year:years,ResultFormat:'JSON'}))url.searchParams.set(key,value);
  const data=(await json(url)).BEAAPI?.Results?.Data;if(!Array.isArray(data))throw Error('R5_BEA_SCHEMA');return data;
 };
 try{
  // Bounded sequential requests stay well below official free API limits; no retries overwrite old inputs.
  const releases=await fred('PCEC96',true),releaseMap=new Map(releases.map(x=>[x.date,x.realtime_start]));
  const pce=await bea('NIUnderlyingDetail','U20306'),income=await bea('NIPA','T20600');
  const series={},sourceSeries={};
  const convert=(rows,line)=>rows.filter(x=>+x.LineNumber===line).map(x=>{
   const match=/^(\d{4})M(\d{2})$/.exec(x.TimePeriod);if(!match)throw Error('R5_BEA_DATE');
   const observationDate=`${match[1]}-${match[2]}-01`,availableDate=releaseMap.get(observationDate);
   const value=Number(String(x.DataValue).replaceAll(',',''));
   if(!availableDate||!Number.isFinite(value))throw Error('R5_BEA_VALUE_OR_RELEASE');
   return {observationDate,availableDate,value};
  });
  series.realPce=convert(pce,1);series.realGoods=convert(pce,2);series.realServices=convert(pce,13);
  series.realIncome=convert(income,37);series.savingRate=convert(income,35);
  series.population=convert(income,40);
  for(const line of categories)series[`pceCategory${line}`]=convert(pce,line);
  const merge=(a,b,fn)=>{
   const map=new Map(b.map(x=>[x.observationDate,x]));
   return a.map(x=>{const y=map.get(x.observationDate);return {observationDate:x.observationDate,availableDate:y?[x.availableDate,y.availableDate].sort().at(-1):x.availableDate,value:y&&isNumber(x.value)&&isNumber(y.value)?fn(x.value,y.value):null};});
  };
  series.realPcePerCapita=merge(series.realPce,series.population,(a,b)=>b>0?a/b*1e6:null);
  for(const [key,id]of [['employmentRatio','EMRATIO'],['privateEmployment','USPRIV'],['weeklyEarnings','CES0500000011'],['cpi','CPIAUCSL'],['consumerDebtService','CDSP'],['consumerDelinquency','DRCLACBS']]){
   const current=await fred(id),initial=await fred(id,true),dates=new Map(initial.map(x=>[x.date,x.realtime_start]));
   series[key]=current.map(x=>{
    if(!dates.has(x.date))throw Error('R5_FRED_RELEASE_MISSING');
    const value=x.value==='.'?null:Number(x.value);if(value!==null&&!Number.isFinite(value))throw Error('R5_FRED_VALUE');
    return {observationDate:x.date,availableDate:dates.get(x.date),value};
   });sourceSeries[key]=id;
  }
  series.realPayroll=merge(merge(series.privateEmployment,series.weeklyEarnings,(a,b)=>a*b),series.cpi,(a,b)=>b>0?a/b*100:null);
  const body={series,categoryIds:categories.map(x=>`pceCategory${x}`),categoryLabels:Object.fromEntries(categories.map(line=>[`pceCategory${line}`,pce.find(x=>+x.LineNumber===line)?.LineDescription])),sourceSeries,historyMode:'CURRENT_VINTAGE_ONLY',lookAheadSafe:false,releaseDateMethod:'ALFRED_INITIAL_RELEASE; BEA_PIO_CALENDAR',sources:{pce3:'BEA U20306 line 1',pce12:'BEA U20306 line 1',perCapita:'BEA U20306 line 1 / T20600 line 40',income3:'BEA T20600 line 37',income12:'BEA T20600 line 37',employment:'BLS / FRED EMRATIO',payroll:'BLS USPRIV × CES0500000011 / CPIAUCSL',saving:'BEA T20600 line 35',debt:'Federal Reserve / FRED CDSP',delinquency:'Federal Reserve / FRED DRCLACBS',diffusion:'BEA U20306 16 non-overlapping categories',goods:'BEA U20306 line 2',services:'BEA U20306 line 13'}};
  body.sourceVersion='CONSUMPTION_R5:'+hash(body);
  await store.writeInput('consumption-r5-pending',body,now);
  const result=calculateConsumptionR5(body,{asOfDate:new Date(now).toISOString().slice(0,10)});
  if(result.status!=='READY')return {status:'FAILED',reason:'R5_INPUT_INCOMPLETE',missingFactors:result.missingFactors,providerRequests:requests};
  await store.writeInput('consumption-r5',body,now);
  const check=await store.readInput('consumption-r5');if(hash(check?.body)!==hash(body))throw Error('R5_READBACK');
  return {status:'COMPLETE',providerRequests:requests,observationDate:result.updatedAt,score:result.score,trendPoints:result.trend.length,areas:result.areas};
 }catch(error){return {status:'FAILED',reason:error.message?.startsWith('R5_')?error.message:'R5_COLLECTION_FAILED',providerRequests:requests};}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
 const db=localDatabase(path.join(base,'storage','core.sqlite'));
 try{const result=await collectConsumptionR5({db});console.log(JSON.stringify(result));if(result.status!=='COMPLETE')process.exitCode=1;}finally{db.close();}
}
