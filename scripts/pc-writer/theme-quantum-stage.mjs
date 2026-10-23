// QTUM single-ETF private staging. No provider calls, D1 writes or scheduler edits.
// The caller must obtain an independently permitted raw file. Import preserves it
// under the approved E: data root; calculation reads only saved, hashed files.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {r158ScorePrices} from '../../lib/market-score/theme-etf-provisional-score.mjs';

export const QUANTUM_ID='quantum-computing';
export const QUANTUM_SYMBOLS=Object.freeze(['QTUM','SPY']);
export const QUANTUM_MODE='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE';
const sha=b=>createHash('sha256').update(b).digest('hex');
const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const fail=s=>{throw Error('QUANTUM_STAGE_'+s)};
const nyDay=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'});
function rootDir(dataRoot){
 if(!dataRoot||!fs.existsSync(dataRoot))fail('APPROVED_E_DATA_ROOT_MISSING');
 const base=fs.realpathSync(dataRoot);
 if(process.platform==='win32'&&!/^E:[\\/]/i.test(base))fail('NOT_APPROVED_E_DRIVE');
 return base;
}
function inside(base,relative){
 const resolved=path.resolve(base,relative),rel=path.relative(base,resolved);
 if(!rel||rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))fail('UNSAFE_PATH');
 if(fs.existsSync(resolved)){
  const real=fs.realpathSync(resolved),check=path.relative(base,real);
  if(!check||check==='..'||check.startsWith('..'+path.sep)||path.isAbsolute(check))fail('JUNCTION_ESCAPE');
 }
 return resolved;
}
function dataHome(dataRoot){
 const base=rootDir(dataRoot),home=inside(base,'themes/'+QUANTUM_ID);
 fs.mkdirSync(home,{recursive:true});
 if(fs.realpathSync(home)!==home)fail('THEME_JUNCTION_NOT_APPROVED');
 return home;
}
function readBars(bytes,symbol){
 if(bytes.length>40_000_000)fail('RAW_TOO_LARGE');
 const lines=bytes.toString('utf8').split(/\r?\n/).filter(Boolean);
 if(!lines.length||lines.length>400_000)fail('RAW_ROW_COUNT');
 let previous='';const bars=[];
 for(const line of lines){
  let row;try{row=JSON.parse(line)}catch{fail('RAW_JSONL')}
  if(row?.symbol!==symbol||typeof row.timestamp!=='string'||!Number.isFinite(Date.parse(row.timestamp))||
     typeof row.close!=='number'||!Number.isFinite(row.close)||row.close<=0||
     (row.is_gap!==undefined&&typeof row.is_gap!=='boolean')||row.timestamp<=previous)fail('RAW_SCHEMA_OR_ORDER');
  previous=row.timestamp;bars.push(row);
 }
 return bars;
}
function atomicJson(target,doc){
 const temp=target+'.'+process.pid+'.tmp';
 fs.writeFileSync(temp,JSON.stringify(doc,null,2)+'\n',{flag:'wx'});
 try{fs.renameSync(temp,target)}finally{if(fs.existsSync(temp))fs.unlinkSync(temp)}
}
function readManifest(home){
 const file=inside(home,'raw-manifest.json');
 if(!fs.existsSync(file))return {version:1,themeId:QUANTUM_ID,files:[]};
 const m=JSON.parse(fs.readFileSync(file,'utf8'));
 if(m.version!==1||m.themeId!==QUANTUM_ID||!Array.isArray(m.files))fail('MANIFEST_IDENTITY');
 return m;
}
export function ingestQuantum({dataRoot,symbol,inputFile,source,collectedAt,priceMode=QUANTUM_MODE}={}){
 if(!QUANTUM_SYMBOLS.includes(symbol)||!/^https:\/\//.test(source??'')||!Number.isFinite(Date.parse(collectedAt??''))||priceMode!==QUANTUM_MODE)fail('INGEST_PROVENANCE');
 const home=dataHome(dataRoot),raw=inside(home,'raw'),state=inside(home,'state');
 fs.mkdirSync(raw,{recursive:true});fs.mkdirSync(state,{recursive:true});
 const lock=inside(state,'quantum-stage.lock');let fd;
 try{fd=fs.openSync(lock,'wx')}catch{fail('ANOTHER_QUANTUM_STAGE_RUNNING')}
 fs.closeSync(fd);
 try{
  const bytes=fs.readFileSync(inputFile),bars=readBars(bytes,symbol),digest=sha(bytes);
  const relative='raw/'+symbol+'_'+digest+'.jsonl',dest=inside(home,relative);
  const dates=bars.map(b=>nyDay.format(new Date(b.timestamp))).sort();
  const entry={path:relative,sha256:digest,source,collectedAt,
   observationFrom:dates[0],observationThrough:dates.at(-1),priceMode,
   schemaVersion:'GMH_NDJSON_1H_COLUMNS_V1'};
  if(!date(entry.observationFrom)||!date(entry.observationThrough))fail('BAD_OBSERVATION_DATES');
  const manifest=readManifest(home),old=manifest.files.find(f=>f.path===relative);
  if(old&&JSON.stringify(old)!==JSON.stringify(entry))fail('SOURCE_PROVENANCE_CONFLICT');
  if(!fs.existsSync(dest))fs.writeFileSync(dest,bytes,{flag:'wx'});
  if(sha(fs.readFileSync(dest))!==digest)fail('RAW_READBACK_MISMATCH');
  if(!old){manifest.files.push(entry);atomicJson(inside(home,'raw-manifest.json'),manifest)}
  return {status:'PRIVATE_RAW_STORED',themeId:QUANTUM_ID,entry,providerCalls:0,d1Writes:0,schedulerWrites:0};
 }finally{fs.unlinkSync(lock)}
}
function savedBars(home,manifest,symbol){
 const files=manifest.files.filter(f=>typeof f.path==='string'&&f.path.startsWith('raw/'+symbol+'_'));
 if(!files.length)fail('RAW_SYMBOL_MISSING_'+symbol);
 const bars=new Map();
 for(const f of files){
  if(!new RegExp('^raw/'+symbol+'_[a-f0-9]{64}\\.jsonl$').test(f.path)||!/^\w{64}$/.test(f.sha256)||f.priceMode!==QUANTUM_MODE||!Number.isFinite(Date.parse(f.collectedAt))||!/^https:\/\//.test(f.source))fail('MANIFEST_ENTRY_INVALID');
  const bytes=fs.readFileSync(inside(home,f.path));if(sha(bytes)!==f.sha256)fail('RAW_HASH_MISMATCH');
  for(const b of readBars(bytes,symbol)){
   const old=bars.get(b.timestamp);
   if(old&&JSON.stringify(old)!==JSON.stringify(b))fail('SOURCE_REVISION_CONFLICT');
   bars.set(b.timestamp,b);
  }
 }
 return [...bars.values()].sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
}
export async function prepareQuantum({dataRoot,selector,scorer}={}){
 const home=dataHome(dataRoot),manifest=readManifest(home);
 const selected={};
 for(const symbol of QUANTUM_SYMBOLS){
  const bars=savedBars(home,manifest,symbol).filter(b=>b.is_gap!==true);
  const rows=selector?selector(bars):null;
  if(!rows)fail('APPROVED_SESSION_CALENDAR_SELECTOR_REQUIRED');
  if(!Array.isArray(rows)||rows.some((r,i)=>!date(r?.date)||!Number.isFinite(r?.close)||r.close<=0||(i>0&&r.date<=rows[i-1].date)))fail('DAILY_PRICE_INVALID');
  selected[symbol]=rows;
 }
 if(selected.QTUM.length!==selected.SPY.length||selected.QTUM.some((r,i)=>r.date!==selected.SPY[i].date))fail('SESSION_ALIGNMENT');
 if(selected.QTUM.length<628)fail('FULL_252_R158_HISTORY_MISSING');
 const dates=selected.QTUM.slice(-628).map(r=>r.date);
 const own=selected.QTUM.slice(-628).map(r=>r.close),spy=selected.SPY.slice(-628).map(r=>r.close);
 if(typeof scorer!=='function')fail('APPROVED_252_SCORER_REQUIRED');
 const scores=scorer(own,spy);
 if(!Array.isArray(scores)||scores.length!==252||scores.some(s=>!Number.isFinite(s)||s<0||s>100))fail('SCORE_CONTRACT');
 const legacy=r158ScorePrices(own,spy);
 for(let j=0;j<3;j++)if(Math.abs(scores.at(-1-j)-legacy[own.length-1-j])>1e-9)fail('R158_TAIL_PARITY');
 const history=dates.slice(-252).map((date,i)=>({date,score:Number(scores[i].toFixed(5))}));
 const result={status:'PRIVATE_CANDIDATE_NOT_LICENSED_NOT_PRICE_RECONCILED',version:'QUANTUM_STAGE_R1',
  themeId:QUANTUM_ID,theme:'양자컴퓨터',etfs:['QTUM'],benchmark:'SPY',methodologyVersion:'ETF_ONLY_T40_R20_V40_SINGLE_QTUM_R158',
  sourcePriceMode:QUANTUM_MODE,sourceFiles:manifest.files.map(f=>({path:f.path,sha256:f.sha256,collectedAt:f.collectedAt,source:f.source})),
  observationDate:history.at(-1).date,history,
  score:history.at(-1).score,sourceCommercialRightsVerified:false,sourcePriceReconciled:false,publicationAuthorized:false,
  providerCalls:0,d1Writes:0,schedulerWrites:0};
 const dir=inside(home,'derived');fs.mkdirSync(dir,{recursive:true});
 const content=Buffer.from(JSON.stringify(result));const filename='quantum-private-'+sha(content)+'.json';
 const output=inside(dir,filename);
 if(!fs.existsSync(output))fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 return {status:result.status,output:'themes/'+QUANTUM_ID+'/derived/'+filename,observationDate:result.observationDate,score:result.score,publicWrites:0};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,...args]=process.argv.slice(2),root=process.env.ZGMINI_DATA_ROOT;
 try{
  if(mode==='--ingest'&&args.length===4)console.log(JSON.stringify(ingestQuantum({dataRoot:root,symbol:args[0],inputFile:args[1],source:args[2],collectedAt:args[3]})));
  else if(mode==='--prepare'&&args.length===0){
   // R188 is the already-recovered historical scorer. Its hard-coded early-close
   // dates are NOT a verified future exchange calendar; publication stays barred.
   const {scoreAll252,regularHour15Rows}=await import('./theme-optional-score-r188.mjs');
   console.log(JSON.stringify(await prepareQuantum({dataRoot:root,selector:regularHour15Rows,scorer:scoreAll252})));
  }
  else {console.error('PRIVATE_MODES: --ingest QTUM|SPY input.jsonl https://provider.example ISO_UTC OR --prepare; no network/publish/task commands.');process.exitCode=2}
 }catch(e){console.error(String(e.message).replace(/[^A-Z0-9_]/g,'_'));process.exitCode=1}
}
