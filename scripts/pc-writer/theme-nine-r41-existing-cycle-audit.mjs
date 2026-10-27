// R41: inspect existing PC collector wiring and stored file inventory only.
// No provider calls, DB writes, task modifications or source execution.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT='E:\\ZGmini\\data';
const ROSTER_SHA='e2ea97ce0ed0bf15cb083237d63d3cf520e090d8bd229a837bad393c3f8b0c6c';
const TASKS=['ZGMINI-PC-GetMarketHistory-ETF','ZGMINI-PC-MarketParquet-ETF'];
const SOURCE_FILES=['r181-primary-cycle.mjs','r179-publish-core.mjs','r171-publish.mjs'];
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=code=>{throw Object.assign(new Error(code),{code});};

export function inspectNineR41Source({roster,files=[],sourceTexts={}}={}){
 if(roster?.counts?.themes!==9||roster?.counts?.positions!==64||
  roster?.counts?.uniqueTickers!==63||!Array.isArray(roster.groups))fail('R41_ROSTER');
 const approved=[...new Set(roster.groups.flatMap(g=>g.tickers.map(t=>t.ticker)))].sort();
 if(approved.length!==63)fail('R41_ROSTER_TICKERS');
 const names=files.filter(n=>typeof n==='string'&&
  /^etf_daily_\d{4}-\d{2}-\d{2}\.parquet$/.test(n)).sort();
 const dates=names.map(n=>n.slice(10,20));
 const sourceAudit=Object.fromEntries(SOURCE_FILES.map(name=>{
  const content=sourceTexts[name];
  if(typeof content!=='string')return [name,{present:false}];
  const mentions=approved.filter(s=>new RegExp('(^|[^A-Z0-9])'+s+'([^A-Z0-9]|$)')
   .test(content.toUpperCase()));
  return [name,{present:true,sha256:sha(Buffer.from(content)),
   staticTickerMentions:mentions.length,staticMentionedTickers:mentions,
   qualification:'STATIC_TEXT_ONLY_NOT_RUNTIME_COLLECTION_PROOF'}];
 }));
 return {contract:'THEME_NINE_R41_EXISTING_CYCLE_READONLY_V1',
  etfDailyFileCount:dates.length,earliestEtfDailyDate:dates[0]??null,
  latestEtfDailyDate:dates.at(-1)??null,
  approvedUniqueEtfs:approved.length,sourceAudit,
  resultInterpretation:'FILES_AND_STATIC_MENTIONS_NOT_ACTUAL_63_COLLECTION_COVERAGE',
  providerCalls:0,dbWrites:0,d1Writes:0,schedulerWrites:0};
}

function taskAudit(name){
 // Never include unredacted task XML, command line, user, SID or credentials in TXT.
 if(process.platform!=='win32')return {status:'WINDOWS_ONLY'};
 const child=spawnSync('schtasks',['/Query','/TN',name,'/XML'],
  {encoding:'utf8',timeout:15000,maxBuffer:2*1024*1024,windowsHide:true});
 if(child.error)return {status:'QUERY_ERROR',errorCode:child.error.code??'UNKNOWN'};
 if(child.status!==0)return {status:'NOT_AVAILABLE_OR_DENIED',exitCode:child.status};
 const xml=child.stdout;
 // XML is used in memory only; only whitelisted boolean and task identity flags survive.
 const c=xml.match(/<(?:\w+:)?Command>([\s\S]*?)<\/(?:\w+:)?Command>/i)?.[1]??'';
 const a=xml.match(/<(?:\w+:)?Arguments>([\s\S]*?)<\/(?:\w+:)?Arguments>/i)?.[1]??'';
 const enabled=xml.match(/<(?:\w+:)?Enabled>(true|false)<\/(?:\w+:)?Enabled>/i)?.[1]??null;
 return {status:'XML_READ',enabled:enabled===null?null:enabled==='true',
  referencesKnownCollector:a.includes('r181-primary-cycle.mjs')||c.includes('r181-primary-cycle.mjs'),
  referencesKnownPublisher:a.includes('r179-publish-core.mjs')||c.includes('r179-publish-core.mjs'),
  referenceToExistingRoot:(a+c).toLowerCase().includes('zgmini'),
  actionSha256:sha(Buffer.from(c+'\n'+a))};
}

export function inspectNineR41SavedPC({dataRoot=ROOT}={}){
 const candidates=[path.join(HERE,'theme-nine-r20-approved-candidates.json'),
  path.join(HERE,'..','..','config','theme-nine-r20-approved-candidates.json')];
 const rosterFile=candidates.find(f=>fs.existsSync(f));
 if(!rosterFile)fail('R41_ROSTER_MISSING');
 const raw=fs.readFileSync(rosterFile);
 if(sha(raw)!==ROSTER_SHA)fail('R41_ROSTER_SHA_DRIFT');
 const roster=JSON.parse(raw.toString('utf8'));
 const root=path.join(dataRoot,'theme-market-history-r131');
 const inventoryDir=path.join(root,'marketparquet-r165');
 const sourceDir=path.join(root,'marketparquet-r167');
 if(!fs.existsSync(inventoryDir)||!fs.existsSync(sourceDir))fail('R41_EXISTING_DIR_MISSING');
 const files=fs.readdirSync(inventoryDir);
 const sourceTexts={};
 for(const name of SOURCE_FILES){
  const full=path.join(sourceDir,name);
  if(fs.existsSync(full)&&fs.statSync(full).isFile())
   sourceTexts[name]=fs.readFileSync(full,'utf8');
 }
 return {...inspectNineR41Source({roster,files,sourceTexts}),
  tasks:Object.fromEntries(TASKS.map(name=>[name,taskAudit(name)])),
  rosterSha256:ROSTER_SHA,status:'R41_READONLY_SOURCE_AND_TASK_INVENTORY_COMPLETE',
  note:'NO_SOURCE_EXECUTION_NO_DATA_RECALCULATION_NO_PUBLICATION'};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let output;
 try{
  if(process.argv.length!==3||process.argv[2]!=='--inspect')fail('R41_USAGE');
  output=inspectNineR41SavedPC({dataRoot:process.env.ZGMINI_DATA_ROOT||ROOT});
 }catch(e){
  output={status:'STOP_R41_READONLY_AUDIT',error:e.code??'R41_UNEXPECTED',
   detail:e.code?undefined:String(e.message).slice(0,180),
   providerCalls:0,dbWrites:0,d1Writes:0,schedulerWrites:0};
  process.exitCode=1;
 }
 try{
  const name='THEME_NINE_R41_EXISTING_CYCLE_RESULT_'+
   new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14)+'_'+process.pid+'.txt';
  const target=path.join(HERE,name);
  fs.writeFileSync(target,'REPORT=THEME_NINE_R41_EXISTING_CYCLE\r\n'+
   Object.entries(output).map(([k,v])=>k.toUpperCase()+'='+
    (typeof v==='object'&&v!==null?JSON.stringify(v):v)).join('\r\n')+'\r\n',
   {encoding:'utf8',flag:'wx'});
  process.stdout.write(JSON.stringify({status:output.status,reportFile:target})+'\n');
 }catch(e){process.stderr.write('R41_REPORT_WRITE_FAILED '+String(e.message)+'\n');
  process.exitCode=1;}
}
