import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadLocalProviders} from './local-env.mjs';

const DEFAULT_BASE=path.join(os.homedir(),'.zgmini','pc-writer');
const LOCK_FILE='local-sector-fear-greed-r21346-prospective-lock-readiness.json';
const OUT_JSON='local-sector-fear-greed-r21350-prospective-etf-bridge.json';
const OUT_TXT='local-sector-fear-greed-r21350-prospective-etf-bridge.txt';

export const R21350_EXPECTED_LOCK_STATUS='SHADOW_R21346_PROSPECTIVE_LOCK_READY';
export const R21350_EXPECTED_CONTRACT_HASH='ae6df6a57507d151dfdc52e43881e8a68112233933707ec471ed97aefdd571d7';
export const R21350_REFERENCE_OBSERVATIONS=756;
export const R21350_ETFS=Object.freeze(['XLK','XLV','XLF','XLY','XLC','XLI','XLP','XLE','XLU','XLRE','XLB']);

function safeJson(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}}
function saveJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,JSON.stringify(value,null,2)+'\n');fs.renameSync(tmp,file);}
function saveText(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,value);fs.renameSync(tmp,file);}
const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(`${x}T00:00:00Z`));

export function nextDateR21350(date){if(!validDate(date))throw new Error('R21350_INVALID_DISCOVERY_END');const d=new Date(`${date}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);}
export function planR21350(lock,{now=new Date()}={}){
 if(lock?.status!==R21350_EXPECTED_LOCK_STATUS)throw new Error('R21350_LOCK_NOT_READY');
 if(lock?.contractHash!==R21350_EXPECTED_CONTRACT_HASH)throw new Error('R21350_CONTRACT_HASH_MISMATCH');
 if(lock?.contract?.normalizationReference!==R21350_REFERENCE_OBSERVATIONS)throw new Error('R21350_REFERENCE_MISMATCH');
 const discoveryEnd=lock?.contract?.discoveryEnd;if(!validDate(discoveryEnd))throw new Error('R21350_DISCOVERY_END_MISSING');
 const start=nextDateR21350(discoveryEnd);const d=now instanceof Date?now:new Date(now);const end=new Date(d.getTime()-86400000).toISOString().slice(0,10);
 return {discoveryEnd,start,end,symbols:[...R21350_ETFS],provider:'ALPACA',feed:'iex',timeframe:'1Day',adjustment:'split',maxProviderRequests:1,referenceObservations:R21350_REFERENCE_OBSERVATIONS,contractHash:R21350_EXPECTED_CONTRACT_HASH};
}

export function normalizeBarsR21350(body){
 if(!body||typeof body!=='object'||!body.bars||typeof body.bars!=='object')throw new Error('R21350_INVALID_RESPONSE');
 const series={};
 for(const ticker of R21350_ETFS){const rows=Array.isArray(body.bars[ticker])?body.bars[ticker]:[];series[ticker]=rows.map(b=>{const date=String(b?.t??'').slice(0,10),close=Number(b?.c),volume=Number(b?.v);if(!validDate(date)||!Number.isFinite(close)||close<=0||!Number.isFinite(volume)||volume<0)throw new Error('R21350_INVALID_BAR');return {ticker,tradeDate:date,currentClose:close,currentVolume:volume,source:'ALPACA',feed:'iex',adjustmentStatus:'split'};});}
 return series;
}

export async function runR21350(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{approved=false,fetchImpl=fetch,now=new Date()}={}){
 const lock=safeJson(path.join(base,LOCK_FILE));const plan=planR21350(lock,{now});
 if(plan.end<plan.start)return {status:'R21350_NO_NEW_WINDOW',providerCalls:0,plan,series:{}};
 if(!approved)return {status:'R21350_APPROVAL_REQUIRED_NO_PROVIDER_CALL',providerCalls:0,plan,series:null};
 const env=loadLocalProviders(base);if(!env.APCA_API_KEY_ID||!env.APCA_API_SECRET_KEY)throw new Error('R21350_ALPACA_CREDENTIAL_MISSING');
 const url=new URL('https://data.alpaca.markets/v2/stocks/bars');url.search=new URLSearchParams({symbols:plan.symbols.join(','),timeframe:plan.timeframe,start:`${plan.start}T00:00:00Z`,end:`${plan.end}T23:59:59Z`,feed:plan.feed,adjustment:plan.adjustment,limit:'10000'});
 const response=await fetchImpl(url,{headers:{'APCA-API-KEY-ID':env.APCA_API_KEY_ID,'APCA-API-SECRET-KEY':env.APCA_API_SECRET_KEY},signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new Error(`R21350_ALPACA_HTTP_${response.status}`);const body=await response.json();if(body?.next_page_token)throw new Error('R21350_UNEXPECTED_PAGINATION_MAX_ONE_REQUEST');
 const series=normalizeBarsR21350(body);const commonDates=[...new Set(series[R21350_ETFS[0]].map(x=>x.tradeDate))].filter(d=>R21350_ETFS.every(t=>series[t].some(x=>x.tradeDate===d))).sort();
 const payload={version:'R2.13.50-PROSPECTIVE-ETF-BRIDGE',generatedAt:(now instanceof Date?now:new Date(now)).toISOString(),status:'SHADOW_R21350_PROSPECTIVE_ETF_BRIDGE_COLLECTED',mode:'LOCAL_RESEARCH_ONLY',provider:'ALPACA',providerCalls:1,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,normalizationChanged:false,weightsChanged:false,referenceWindowChanged:false,candidateSelected:false,optionsReplacementSelected:false,contractHash:plan.contractHash,discoveryEnd:plan.discoveryEnd,start:plan.start,end:plan.end,symbols:plan.symbols,commonDates,series};
 const jsonFile=path.join(base,OUT_JSON),txtFile=path.join(base,OUT_TXT);saveJson(jsonFile,payload);const reread=safeJson(jsonFile);if(reread?.status!==payload.status||reread?.contractHash!==payload.contractHash)throw new Error('R21350_LOCAL_READBACK_FAILED');
 const lines=['ZGMINI SECTOR FEAR & GREED R2.13.50 PROSPECTIVE ETF BRIDGE',`generatedAt=${payload.generatedAt}`,`status=${payload.status}`,`providerCalls=${payload.providerCalls}`,`contractHash=${payload.contractHash}`,`window=${payload.start}..${payload.end}`,`commonSessions=${payload.commonDates.length} first=${payload.commonDates[0]??'NA'} last=${payload.commonDates.at(-1)??'NA'}`,'','ETF | ROWS | FIRST | LAST',...R21350_ETFS.map(t=>`${t} | ${payload.series[t].length} | ${payload.series[t][0]?.tradeDate??'NA'} | ${payload.series[t].at(-1)?.tradeDate??'NA'}`),'','note=ONE_BOUNDED_ALPACA_REQUEST_MAX','note=LOCAL_RESEARCH_OUTPUT_ONLY','note=NO_PUBLICATION_NO_D1_NO_FORMULA_WEIGHT_REFERENCE_SCHEMA_SCHEDULER_OR_PRODUCTION_CHANGE'];saveText(txtFile,lines.join('\n')+'\n');
 return {...payload,jsonFile,txtFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const approved=process.env.ZGMINI_R21350_PROVIDER_CALL_APPROVED==='YES';runR21350(undefined,{approved}).then(r=>console.log(JSON.stringify({status:r.status,providerCalls:r.providerCalls,plan:r.plan??null,jsonFile:r.jsonFile??null,txtFile:r.txtFile??null,commonDates:r.commonDates??null},null,2))).catch(e=>{console.error(e?.stack??e?.message??String(e));process.exitCode=1;});}
