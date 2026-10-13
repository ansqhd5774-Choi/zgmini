import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const DEFAULT_BASE=path.join(os.homedir(),'.zgmini','pc-writer');
const SOURCE42='local-sector-fear-greed-r21342-tail-correlation-screen.json';
const ALPACA_DIR='asset-r10-alpaca';
const OUT='local-sector-fear-greed-r21354-spy-source-overlap-inventory';
export const R21354_FEATURE='internalCorrelationShock';
export const R21354_MIN_TRAILING_ROWS=64;
export const R21354_REFERENCE_OBSERVATIONS=756;

const finite=x=>typeof x==='number'&&Number.isFinite(x);
const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(`${x}T00:00:00Z`));
function safeJson(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}}
function saveJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,JSON.stringify(value,null,2)+'\n');fs.renameSync(tmp,file);}
function saveText(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,value);fs.renameSync(tmp,file);}

export function collectAnchoredSpyRowsR21354(node,{underSpy=false,out=[]}={}){
  if(Array.isArray(node)){for(const x of node)collectAnchoredSpyRowsR21354(x,{underSpy,out});return out;}
  if(!node||typeof node!=='object')return out;
  const ticker=String(node.ticker??node.symbol??'').trim().toUpperCase();
  const date=String(node.date??node.tradeDate??node.trade_date??'').slice(0,10);
  const close=Number(node.close??node.currentClose??node.current_close??node.c);
  if(validDate(date)&&finite(close)&&close>0&&(ticker==='SPY'||(!ticker&&underSpy)))out.push({date,close});
  for(const [key,value] of Object.entries(node))if(value&&typeof value==='object')collectAnchoredSpyRowsR21354(value,{underSpy:underSpy||String(key).toUpperCase()==='SPY',out});
  return out;
}

export function normalizeSpyRowsR21354(rows=[]){
  const byDate=new Map(),conflicts=[];
  for(const row of Array.isArray(rows)?rows:[]){const date=String(row?.date??'').slice(0,10),close=Number(row?.close);if(!validDate(date)||!finite(close)||close<=0)continue;const old=byDate.get(date);if(old!==undefined&&Math.abs(old/close-1)>1e-10)conflicts.push({date,first:old,next:close});if(old===undefined)byDate.set(date,close);}
  return {rows:[...byDate.entries()].map(([date,close])=>({date,close})).sort((a,b)=>a.date.localeCompare(b.date)),conflicts};
}

export function targetDatesR21354(source42={}){
  const feature=source42?.featureResults?.[R21354_FEATURE];if(feature?.status!=='READY_252')throw new Error('R21354_FEATURE_NOT_READY');
  const dates=[];for(const h of [5,20,60])for(const metric of ['return','drawdown'])for(const row of feature?.crossSectional?.detail?.[h]?.[metric]??[])if(validDate(row?.date))dates.push(row.date);
  return [...new Set(dates)].sort();
}

export function summarizeSpySourceR21354(rows=[],targets=[]){
  const normalized=normalizeSpyRowsR21354(rows),targetSet=new Set(targets),dateIndex=new Map(normalized.rows.map((r,i)=>[r.date,i])),overlap=targets.filter(d=>dateIndex.has(d)),eligible=targets.filter(d=>{const i=dateIndex.get(d);return Number.isInteger(i)&&i>=R21354_MIN_TRAILING_ROWS-1;});
  return {rows:normalized.rows.length,conflicts:normalized.conflicts.length,firstDate:normalized.rows[0]?.date??null,lastDate:normalized.rows.at(-1)?.date??null,targetDates:targets.length,targetOverlap:overlap.length,firstOverlap:overlap[0]??null,lastOverlap:overlap.at(-1)??null,trailing63Eligible:eligible.length,firstEligible:eligible[0]??null,lastEligible:eligible.at(-1)??null};
}

function listAlpacaFiles(dir){if(!fs.existsSync(dir))return [];const base=fs.readdirSync(dir).filter(n=>/^group-\d+\.json$/.test(n)).sort().map(n=>path.join(dir,n));const inc=path.join(dir,'incremental'),extra=fs.existsSync(inc)?fs.readdirSync(inc).filter(n=>!n.startsWith('.')).sort().map(n=>path.join(inc,n)).filter(f=>fs.statSync(f).isFile()):[];return [...base,...extra];}

export function runR21354(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  const s42=safeJson(path.join(base,SOURCE42));if(!s42)throw new Error(`R21354_INPUT_MISSING:${SOURCE42}`);if(s42?.approvedR1ReferenceRequirement!==R21354_REFERENCE_OBSERVATIONS||s42?.normalizationChanged!==false||s42?.weightsChanged!==false||s42?.referenceWindowChanged!==false)throw new Error('R21354_R21342_CONTRACT_MISMATCH');
  const targets=targetDatesR21354(s42),sources=[];
  const names=fs.existsSync(base)?fs.readdirSync(base).filter(n=>n.endsWith('.json')).sort():[];
  for(const name of names){const payload=safeJson(path.join(base,name));if(!payload)continue;const rows=collectAnchoredSpyRowsR21354(payload);if(!rows.length)continue;sources.push({source:name,...summarizeSpySourceR21354(rows,targets)});}
  const alpacaRows=[];for(const file of listAlpacaFiles(path.join(base,ALPACA_DIR))){const payload=safeJson(file);if(Array.isArray(payload))for(const row of payload){const ticker=String(row?.ticker??row?.symbol??'').trim().toUpperCase();if(ticker!=='SPY')continue;const date=String(row?.date??row?.tradeDate??row?.trade_date??'').slice(0,10),close=Number(row?.close??row?.currentClose??row?.current_close);if(validDate(date)&&finite(close)&&close>0)alpacaRows.push({date,close});}}
  if(alpacaRows.length)sources.push({source:'asset-r10-alpaca/*',...summarizeSpySourceR21354(alpacaRows,targets)});
  sources.sort((a,b)=>b.trailing63Eligible-a.trailing63Eligible||b.targetOverlap-a.targetOverlap||b.rows-a.rows||a.source.localeCompare(b.source));
  const best=sources[0]??null,state=best?.trailing63Eligible>=100?'SPY_SOURCE_WITH_SUFFICIENT_REGIME_COVERAGE_FOUND':best?.targetOverlap>0?'SPY_OVERLAP_EXISTS_BUT_REGIME_COVERAGE_INSUFFICIENT':'NO_LOCAL_SPY_TARGET_DATE_OVERLAP';
  const generatedAt=(now instanceof Date?now:new Date(now)).toISOString(),report={version:'R2.13.54-SPY-SOURCE-OVERLAP-INVENTORY',generatedAt,status:'SHADOW_R21354_SPY_SOURCE_OVERLAP_INVENTORY_COMPLETE',mode:'LOCAL_READ_ONLY_NO_FUTURE_DEPENDENCY',providerCalls:0,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,normalizationChanged:false,weightsChanged:false,referenceWindowChanged:false,retuning:false,candidateSelected:false,optionsReplacementSelected:false,targetDates:{count:targets.length,first:targets[0]??null,last:targets.at(-1)??null},sources,bestSource:best?.source??null,bestTrailing63Eligible:best?.trailing63Eligible??0,state,next:state==='SPY_SOURCE_WITH_SUFFICIENT_REGIME_COVERAGE_FOUND'?'RERUN_REGIME_DIAGNOSTIC_WITH_IDENTIFIED_STORED_SOURCE':'REVIEW_LOCAL_SPY_STORAGE_COVERAGE_WITHOUT_PROVIDER_CALL'};
  const lines=['ZGMINI SECTOR FEAR & GREED R2.13.54 SPY SOURCE OVERLAP INVENTORY',`generatedAt=${generatedAt}`,`status=${report.status}`,'providerCalls=0 futureDataDependency=false localStoredDataOnly=true','publicMutation=false d1Mutation=false productionFormulaChanged=false schedulerChanged=false','approvedR1ReferenceRequirement=756 normalizationChanged=false weightsChanged=false referenceWindowChanged=false retuning=false',`targetDates=${report.targetDates.count} ${report.targetDates.first??'NA'}..${report.targetDates.last??'NA'}`,'','SOURCE | ROWS | FIRST | LAST | TARGET_OVERLAP | FIRST_OVERLAP | LAST_OVERLAP | TRAILING63_ELIGIBLE | FIRST_ELIGIBLE | LAST_ELIGIBLE'];for(const s of sources)lines.push(`${s.source} | ${s.rows} | ${s.firstDate??'NA'} | ${s.lastDate??'NA'} | ${s.targetOverlap}/${s.targetDates} | ${s.firstOverlap??'NA'} | ${s.lastOverlap??'NA'} | ${s.trailing63Eligible} | ${s.firstEligible??'NA'} | ${s.lastEligible??'NA'}`);lines.push('',`bestSource=${report.bestSource??'NONE'}`,`bestTrailing63Eligible=${report.bestTrailing63Eligible}`,`state=${state}`,'note=SPY_ROWS_ACCEPTED_ONLY_WHEN_EXPLICIT_TICKER_SPY_OR_NESTED_UNDER_SPY_KEY','note=NO_PROVIDER_NO_PUBLICATION_NO_RETUNING_NO_FORMULA_WEIGHT_REFERENCE_SCHEMA_SCHEDULER_OR_PRODUCTION_CHANGE',`next=${report.next}`);
  const jf=path.join(base,`${OUT}.json`),tf=path.join(base,`${OUT}.txt`);saveJson(jf,report);saveText(tf,lines.join('\n')+'\n');return {...report,jsonFile:jf,txtFile:tf};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const r=runR21354();console.log(JSON.stringify({status:r.status,jsonFile:r.jsonFile,txtFile:r.txtFile,providerCalls:r.providerCalls,bestSource:r.bestSource,bestTrailing63Eligible:r.bestTrailing63Eligible,state:r.state,next:r.next},null,2));}catch(e){console.error(e?.stack??e?.message??String(e));process.exitCode=1;}}
