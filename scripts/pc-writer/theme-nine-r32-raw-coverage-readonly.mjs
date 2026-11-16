// W03 R32: metadata-only, read-only evidence for the fixed 63-ETF + SPY
// GetMarketHistory R23/R35 stored lineage. Not a collector, scorer, or publisher.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const R20_SHA='e2ea97ce0ed0bf15cb083237d63d3cf520e090d8bd229a837bad393c3f8b0c6c';
const SOURCE='https://getmarkethistory.com';
const MODE='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE';
const HEX=/^[a-f0-9]{64}$/;
const DAY=/^\d{4}-\d\d-\d\d$/;
const SYMBOL=/^[A-Z][A-Z0-9.]{0,11}$/;
const MAX_MANIFEST=4*1024*1024,MAX_RAW=32*1024*1024,MAX_STATE=2*1024*1024;
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=code=>{throw Object.assign(new Error(code),{code:'R32_COVERAGE_'+code});};
const validDay=v=>typeof v==='string'&&DAY.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const ny=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'});
const nyDay=date=>{const p=Object.fromEntries(ny.formatToParts(date).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`;};
const inside=(root,file)=>{const r=path.relative(root,file);return r!==''&&r!=='..'&&!r.startsWith('..'+path.sep)&&!path.isAbsolute(r);};
function safePath(root,parts,{directory=false,optional=false}={}){
 let current=root;
 for(const part of parts){
  if(!/^[a-zA-Z0-9._-]+$/.test(part)||part==='..'||part==='.')fail('INVALID_COMPONENT');
  current=path.join(current,part);
  let st;try{st=fs.lstatSync(current);}catch(e){if(optional&&e.code==='ENOENT')return null;fail('UNREADABLE_PATH');}
  if(st.isSymbolicLink()||!inside(root,current))fail('UNSAFE_PATH');
  const isLast=current===path.join(root,...parts);
  if(!isLast&&!st.isDirectory())fail('INVALID_DIRECTORY');
  if(isLast&&!(directory?st.isDirectory():st.isFile()))fail('INVALID_TYPE');
  if(!inside(root,fs.realpathSync.native(current)))fail('REDIRECTED_PATH');
 }
 return current;
}
function readBounded(root,parts,max,{optional=false}={}){
 const file=safePath(root,parts,{optional});if(file===null)return null;
 const st=fs.statSync(file);if(st.size<2||st.size>max)fail('FILE_SIZE');
 const buf=fs.readFileSync(file),after=fs.lstatSync(file);
 if(buf.length!==st.size||after.size!==st.size||after.mtimeMs!==st.mtimeMs||after.isSymbolicLink())fail('FILE_CHANGED');
 return buf;
}
function loadJson(root,parts,max,optional=false){
 const bytes=readBounded(root,parts,max,{optional});if(bytes===null)return null;
 let parsed;try{parsed=JSON.parse(bytes.toString('utf8'));}catch{fail('INVALID_JSON');}
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))fail('INVALID_JSON_OBJECT');
 return {bytes,parsed};
}
function rawDays(buffer,symbol,entry){
 const lines=buffer.toString('utf8').split(/\r?\n/).filter(Boolean);
 if(!lines.length||lines.length>5000)fail('RAW_ROW_COUNT');
 let first=null,last=null,lastTime=-Infinity,valid=0,gaps=0,lastNYDay=null;
 const days=new Set();
 for(const line of lines){
  if(line.length>65536)fail('RAW_ROW_SIZE');
  let r;try{r=JSON.parse(line);}catch{fail('RAW_JSONL');}
  const stamp=r?.timestamp,time=typeof stamp==='string'?Date.parse(stamp):NaN;
  if(r?.symbol!==symbol||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(stamp??'')||
     !Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==stamp.slice(0,10)||time<=lastTime)
   fail('RAW_TIMESTAMP_SYMBOL');
  if(first===null)first=stamp;last=stamp;lastTime=time;
  if(r.is_gap===true){gaps++;continue;}
  if(['open','high','low','close'].some(k=>!Number.isFinite(r[k])||r[k]<=0)||
   r.high<r.low||r.open<r.low||r.open>r.high||r.close<r.low||r.close>r.high||
   !Number.isFinite(r.volume)||r.volume<0)fail('RAW_OHLCV');
  valid++;lastNYDay=nyDay(new Date(time));days.add(lastNYDay);
 }
 if(entry.rows!==lines.length||entry.nonGapRows!==valid||entry.gapRows!==gaps||
   entry.firstTimestampUTC!==first||entry.lastTimestampUTC!==last||
   (entry.lastVerifiedNYDay!==undefined&&entry.lastVerifiedNYDay!==lastNYDay))fail('PAGE_METADATA_DRIFT');
 return days;
}
function readManifest(root,folder,rosterSha,symbols){
 const m=loadJson(root,['themes',folder,'raw-manifest.json'],MAX_MANIFEST);
 if(m.parsed.version!==1||m.parsed.project!==folder||m.parsed.rosterSha256!==rosterSha||
    m.parsed.source!==SOURCE||m.parsed.licenseStatus!=='PRIVATE_RESEARCH_ONLY_PUBLICATION_NOT_APPROVED'||
    !Array.isArray(m.parsed.files)||m.parsed.files.length>2048)fail('MANIFEST_IDENTITY');
 const pages=m.parsed.files,unique=new Set(),byPath=new Map();
 const allDays=new Map(symbols.map(s=>[s,new Set()]));
 for(const e of pages){
  if(!symbols.includes(e?.symbol)||!HEX.test(e?.sha256??'')||e.priceMode!==MODE||
     e.schemaVersion!==(folder==='legacy-nine-r23'?'GMH_1H_OHLCV_NDJSON_R23':'GMH_1H_OHLCV_NDJSON_R35')||
     e.path!==`raw/${e.symbol}_${e.sha256}.jsonl`||unique.has(e.path))fail('PAGE_IDENTITY');
  let u;try{u=new URL(e.requestedUrl);}catch{fail('PAGE_SOURCE_URL');}
  if(u.origin!==SOURCE||u.pathname!==`/api/v1/bars/stocks/${e.symbol}/1h`||u.searchParams.get('format')!=='jsonl')
   fail('PAGE_SOURCE_URL');
  unique.add(e.path);byPath.set(e.path,e);
  const bytes=readBounded(root,['themes',folder,'raw',`${e.symbol}_${e.sha256}.jsonl`],MAX_RAW);
  if(sha(bytes)!==e.sha256)fail('RAW_SHA_DRIFT');
  for(const day of rawDays(bytes,e.symbol,e))allDays.get(e.symbol).add(day);
 }
 return {hash:sha(m.bytes),pages:pages.length,byPath,allDays};
}
function readStates(root,folder,rosterSha,symbols,byPath){
 const directory=safePath(root,['themes',folder,'state'],{directory:true});
 const names=fs.readdirSync(directory).filter(n=>new RegExp(`^${folder==='legacy-nine-r23'?'collection':'delta'}-[a-f0-9]{20}\\.json$`).test(n));
 if(names.length<1||names.length>128)fail('CHECKPOINT_COUNT');
 let incomplete=0,failed=0;const observed=new Set(),report=[];
 for(const name of names.sort()){
  const stored=loadJson(root,['themes',folder,'state',name],MAX_STATE),record=stored.parsed;
  const prefix=folder==='legacy-nine-r23'?'collection':'delta';
  if(record.version!==1||record.project!==folder||record.rosterSha256!==rosterSha||
   !validDay(record.start)||!validDay(record.end)||record.end<record.start||
   name!==`${prefix}-${sha(JSON.stringify({roster:rosterSha,start:record.start,end:record.end})).slice(0,20)}.json`||
   !record.symbols||Object.keys(record.symbols).length!==symbols.length)fail('CHECKPOINT_IDENTITY');
  let complete=true;
  for(const symbol of symbols){
   const s=record.symbols[symbol];
   if(!s||typeof s.complete!=='boolean'||!Array.isArray(s.files))fail('CHECKPOINT_SYMBOL');
   if(!s.complete)complete=false;
   if(s.complete&&!s.files.length&&!s.noBars)fail('CHECKPOINT_EMPTY_COMPLETE');
   for(const ref of s.files){const e=byPath.get(ref.path);
    if(!e||e.sha256!==ref.sha256||e.symbol!==symbol)fail('CHECKPOINT_PAGE_REFERENCE');
    observed.add(ref.path);
   }
  }
  if(!complete)incomplete++;if(record.failedAt)failed++;
  report.push({start:record.start,end:record.end,complete,failed:Boolean(record.failedAt),sha256:sha(stored.bytes)});
 }
 if([...byPath.keys()].some(p=>!observed.has(p)))fail('UNREFERENCED_PAGE');
 return {count:names.length,incomplete,failed,windows:report.slice(-16),windowsTruncated:report.length>16};
}
export function auditR32StoredRawWithSpec({dataRoot,rosterSha,symbols}={}){
 const base={schema:'ZGMINI_THEME_R32_RAW_COVERAGE_READONLY_V1',status:'BLOCKED',
  providerCalls:0,sqliteOpened:false,operationalWrites:0,d1Writes:0,
  publicationAuthorized:false,currentnessVerified:false,source:'GMH_1H_PRIVATE_SAVED_ONLY'};
 let lastPass='ARGUMENTS';
 try{
  if(typeof dataRoot!=='string'||!path.isAbsolute(dataRoot)||!HEX.test(rosterSha??'')||
    !Array.isArray(symbols)||symbols.length<2||symbols.length>64||
    !symbols.includes('SPY')||symbols.some(s=>!SYMBOL.test(s))||new Set(symbols).size!==symbols.length)
   fail('ARGUMENTS');
  const root=fs.realpathSync.native(dataRoot);if(!fs.statSync(root).isDirectory())fail('ROOT_UNAVAILABLE');
  const result={...base,rosterSha256:rosterSha,requiredSymbolCount:symbols.length};
  const r23=readManifest(root,'legacy-nine-r23',rosterSha,symbols);lastPass='R23_RAW_SHA_ROWS';
  const cp23=readStates(root,'legacy-nine-r23',rosterSha,symbols,r23.byPath);lastPass='R23_CHECKPOINT_REFERENCES';
  let r35=null,cp35=null;
  if(safePath(root,['themes','legacy-nine-r35-delta'],{directory:true,optional:true})!==null){
   r35=readManifest(root,'legacy-nine-r35-delta',rosterSha,symbols);lastPass='R35_RAW_SHA_ROWS';
   cp35=readStates(root,'legacy-nine-r35-delta',rosterSha,symbols,r35.byPath);lastPass='R35_CHECKPOINT_REFERENCES';
  }
  const days=new Map(symbols.map(symbol=>[symbol,new Set([
   ...r23.allDays.get(symbol),...(r35?.allDays.get(symbol)??[])] )]));
  const spyDays=[...days.get('SPY')].sort(),spy252=new Set(spyDays.slice(-252));
  const shared=spyDays.filter(day=>symbols.every(s=>days.get(s).has(day)));
  const perSymbol=symbols.map(symbol=>{const x=[...days.get(symbol)].sort();const earliest=x[0]??null;
   const candidateDates=earliest===null?null:
    spyDays.filter(d=>d>=earliest&&!days.get(symbol).has(d));
   return {symbol,coverageStatus:earliest===null?'NO_VERIFIED_BARS':'VERIFIED_BARS',
    firstNYDay:earliest,lastNYDay:x.at(-1)??null,verifiedNYDays:x.length,
    verifiedSpyWindowDays:x.filter(d=>spy252.has(d)).length,
    absentOnObservedSPYDaysAfterFirst:candidateDates?.length??null,
    firstAbsentObservedSPYNYDay:candidateDates?.[0]??null,
    lastAbsentObservedSPYNYDay:candidateDates?.at(-1)??null,
    recentAbsentObservedSPYNYDays:candidateDates?.slice(-4)??null,
    absentObservedSPYSampleTruncated:candidateDates===null?null:candidateDates.length>4};
  });
  const partial=cp23.incomplete||cp23.failed||cp35?.incomplete||cp35?.failed;
  return {...result,status:partial?'PARTIAL':'PASS',code:partial?'R32_CHECKPOINT_INCOMPLETE_OR_FAILED':'R32_SAVED_RAW_SHA_CHECKPOINT_VERIFIED_NOT_CURRENT',
   lastPass,firstFail:null,manifests:{r23:{sha256:r23.hash,pageCount:r23.pages},
    r35:r35?{sha256:r35.hash,pageCount:r35.pages}:null},
   checkpoints:{r23:cp23,r35:cp35},verifiedRawPages:r23.pages+(r35?.pages??0),
   latestVerifiedSPYDay:spyDays.at(-1)??null,common63EtfSpyDays:shared.length,
   latestCommonNYDay:shared.at(-1)??null,
   symbolsWithoutValidBars:perSymbol.filter(x=>x.coverageStatus==='NO_VERIFIED_BARS').length,
   symbols:perSymbol};
 }catch(error){return {...base,code:/^R32_COVERAGE_[A-Z0-9_]+$/.test(error?.code??'')?error.code:'R32_COVERAGE_UNEXPECTED',lastPass,firstFail:'SAVED_RAW_COVERAGE_AUDIT'};}
}
// Production adapter uses the fixed, approved R20 roster. Job payload never
// selects paths, tickers, dates, sources, or commands.
export function inspectNineR32RawCoverage(dataRoot='E:/ZGmini/data'){
 const rosterFile=new URL('../../config/theme-nine-r20-approved-candidates.json',import.meta.url);
 const bytes=fs.readFileSync(rosterFile);
 if(sha(bytes)!==R20_SHA)return {status:'BLOCKED',code:'R32_COVERAGE_ROSTER_SHA_DRIFT',providerCalls:0,d1Writes:0,operationalWrites:0};
 const roster=JSON.parse(bytes.toString('utf8'));
 const positions=roster.groups?.flatMap(g=>g.tickers?.map(t=>t.ticker)??[]);
 const tickers=[...new Set(positions)];
 if(roster.schema!=='zgmini.theme-nine.r20-approved-three-gate-candidates.v1'||
   positions.length!==64||tickers.length!==63||tickers.includes('SPY')||
   tickers.some(s=>!SYMBOL.test(s)))return {status:'BLOCKED',code:'R32_COVERAGE_ROSTER_IDENTITY',providerCalls:0,d1Writes:0,operationalWrites:0};
 return auditR32StoredRawWithSpec({dataRoot,rosterSha:R20_SHA,symbols:['SPY',...tickers.sort()]});
}
