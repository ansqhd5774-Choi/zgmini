// R18: read-only validation of the first BLS collection/publication after R17.
// No provider collection, DB writes, task modification, Git mutation or D1 mutation.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {parseScheduledLauncher} from './market-calendar-r13-runtime-lineage.mjs';
import {extractStaticEntrypoints} from './market-calendar-r14-targeted-runtime.mjs';
import {extractLiteralAssignment,pathIdentity} from './market-calendar-r16-origin-lineage.mjs';
import {parseReleaseCalendar} from '../../staging/market-calendar/r11-bls/lib/release-calendar.mjs';

const PREVIOUS='7ac573fcf977c5fab97f2aea44c12555fd86dd9f';
const INSTALLED='e778f58d056e45c515fac95b4ed48295f6a3ed1a';
const PARSER_HASH='54c737218a40fec6482b469f7962fe5e8cd7c040705d58072396cffcdcb74c08';
const WORKTREE='d0a4b3cb8b95';
const BACKUP='r17-20261027091413755-d53cc8ff';
const hex=value=>typeof value==='string'&&/^[a-f0-9]{40}$/i.test(value)?value.toLowerCase():null;
const digest=value=>createHash('sha256').update(value).digest('hex');
const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:25000}).trim();
const readJson=file=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}};
const timestamp=value=>{const n=typeof value==='number'?value:Date.parse(value);return Number.isFinite(n)&&n>0?n:null;};
const eventKey=item=>JSON.stringify([item?.source,item?.id,item?.date]);
const semanticKey=item=>JSON.stringify([item?.source,item?.date,String(item?.title??'').normalize('NFKC').trim().toLowerCase()]);
const canonical=events=>digest(events.map(item=>JSON.stringify([item.source,item.id,item.date,item.title,item.sourceUrl])).sort().join('\n'));
const rowsBySource=events=>Object.fromEntries(['bls','bea','fed','census'].map(source=>[source,events.filter(e=>e.source===source).length]));
const winAbs=value=>/^[a-z]:[\\/]/i.test(value);
const rooted=entry=>(winAbs(entry)?path.win32:path).resolve(entry,'..','..','..');
const taskXml=()=>{try{const raw=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],{windowsHide:true,stdio:['ignore','pipe','ignore'],timeout:10000});return (raw[0]===255&&raw[1]===254||raw.includes(0)?raw.toString('utf16le'):raw.toString('utf8')).replace(/^\ufeff/,'');}catch{return null;}};
const remoteRead=async()=>{
 try{const response=await fetch('https://zgmini.kr/api/release-calendar',{headers:{accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!response.ok)return {state:'HTTP_FAILED',httpStatus:response.status};
  const size=Number(response.headers.get('content-length'));
  if(size>1800000)return {state:'TOO_LARGE'};
  const text=await response.text();if(Buffer.byteLength(text)>1800000)return {state:'TOO_LARGE'};
  const body=JSON.parse(text);return {state:'FOUND',body};
 }catch{return {state:'UNAVAILABLE'};}
};

function inspectSQLite(file){
 if(!fs.existsSync(file))return {state:'DB_MISSING'};
 let db;
 try{
  db=new DatabaseSync(file,{readOnly:true});
  const row=(kind,key)=>db.prepare("SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind=? AND feed_key=? AND snapshot_key='current'").get(kind,key);
  const output=row('output','release-calendar'),bls=row('input','release-calendar:bls'),attempt=row('attempt','release-calendar');
  return {state:'FOUND',output:output?{storedAt:output.stored_at,body:JSON.parse(output.body)}:null,
   bls:bls?{storedAt:bls.stored_at,body:JSON.parse(bls.body)}:null,attemptAt:attempt?.stored_at??null};
 }catch{return {state:'READ_FAILED'};}
 finally{try{db?.close();}catch{}}
}

export function evaluateR18({installedAt,collection,writer,ledger,db,remote,baselineEvents=[],expandedEvents=[]}){
 const base={collection:{at:collection?.at??null,calendarStatus:collection?.releaseCalendar?.status??null,providerRequests:collection?.releaseCalendar?.providerRequests??null},
  writer:{at:writer?.at??null,status:writer?.status??null,mode:writer?.mode??null,source:hex(writer?.source)},
  ledger:{at:timestamp(ledger?.at)?new Date(timestamp(ledger.at)).toISOString():null,status:ledger?.status??null,source:hex(ledger?.source)},
  sqlite:{state:db?.state??'UNKNOWN',outputAt:timestamp(db?.output?.storedAt)?new Date(timestamp(db.output.storedAt)).toISOString():null,
   blsInputAt:timestamp(db?.bls?.storedAt)?new Date(timestamp(db.bls.storedAt)).toISOString():null,
   attemptAt:timestamp(db?.attemptAt)?new Date(timestamp(db.attemptAt)).toISOString():null},
  remote:{state:remote?.state??'UNKNOWN'},
  comparison:{legacyBlsCount:baselineEvents.length,expandedBlsCount:expandedEvents.length}};
 const withDecision=decision=>({...base,decision});
 if(db?.state!=='FOUND'||!db.output||!db.bls)return withDecision('LOCAL_CALENDAR_SNAPSHOT_MISSING_STOP');
 if(!Array.isArray(db.output.body?.events)||!db.bls.body||typeof db.bls.body.text!=='string')return withDecision('LOCAL_CALENDAR_FORMAT_INVALID_STOP');
 const inputAt=timestamp(db.bls.storedAt),outputAt=timestamp(db.output.storedAt),attemptAt=timestamp(db.attemptAt);
 const collectAt=timestamp(collection?.at);
 const source=db.output.body.sources?.bls;
 base.sqlite.status=db.output.body.status??null;
 base.sqlite.blsSourceStatus=source?.status??null;
 base.sqlite.bySource=rowsBySource(db.output.body.events);
 base.sqlite.duplicates=db.output.body.events.length-new Set(db.output.body.events.map(eventKey)).size;
 base.sqlite.invalidEvents=db.output.body.events.filter(e=>!/^\d{4}-\d{2}-\d{2}$/.test(e.date??'')||typeof e.sourceUrl!=='string'||!e.sourceUrl.startsWith('https://')).length;
 if(collectAt>installedAt&&collection?.lane==='core'&&attemptAt>installedAt&&
    (source?.status==='SOURCE_FAILED'||collection?.releaseCalendar?.status==='FAILED_PRESERVE_EXISTING')){
  return withDecision('BLS_SOURCE_FAILED_PREVIOUS_DATA_PRESERVED');
 }
 if(!installedAt||!inputAt||!outputAt||inputAt<=installedAt||outputAt<=installedAt||!collectAt||collectAt<=installedAt){
  return withDecision('WAIT_FIRST_REGULAR_BLS_COLLECTION');
 }
 if(attemptAt&&attemptAt<=installedAt)return withDecision('BLS_ATTEMPT_TIMESTAMP_NOT_ADVANCED_STOP');
 if(source?.status!=='READY'||!['READY','PARTIAL'].includes(db.output.body.status))return withDecision('BLS_COLLECTION_NOT_READY_STOP');
 if(!expandedEvents.length||expandedEvents.some(e=>e.source!=='bls'))return withDecision('EXPANDED_BLS_PARSE_INVALID_STOP');
 const oldSemantics=new Set(baselineEvents.map(semanticKey)),newSemantics=new Set(expandedEvents.map(semanticKey));
 base.comparison.missingLegacyTitles=[...oldSemantics].filter(key=>!newSemantics.has(key)).length;
 base.comparison.duplicateExpanded=expandedEvents.length-new Set(expandedEvents.map(eventKey)).size;
 const savedBls=db.output.body.events.filter(e=>e.source==='bls');
 base.comparison.savedBlsCount=savedBls.length;
 base.comparison.savedBlsMatchesExpanded=canonical(savedBls)===canonical(expandedEvents);
 if(base.comparison.missingLegacyTitles||base.comparison.duplicateExpanded||base.sqlite.duplicates||base.sqlite.invalidEvents||!base.comparison.savedBlsMatchesExpanded){
  return withDecision('BLS_PARSER_OR_STORED_EVENT_MISMATCH_STOP');
 }
 if(writer?.status==='FAILED'||ledger?.status==='FAILED')return withDecision('PUBLICATION_FAILED_EXISTING_DATA_PRESERVED');
 if(writer?.status!=='VERIFIED'||writer?.mode!=='PUBLISH'||hex(writer?.source)!==INSTALLED||timestamp(writer.at)<=installedAt||ledger?.status!=='VERIFIED'||hex(ledger?.source)!==INSTALLED||timestamp(ledger.at)<=installedAt){
  return withDecision('WAIT_NEW_SOURCE_VERIFIED_PUBLICATION');
 }
 if(remote?.state!=='FOUND'||!Array.isArray(remote.body?.events))return withDecision('WAIT_REMOTE_HTTP_READBACK');
 base.remote={state:'FOUND',updatedAt:remote.body.updatedAt??null,bySource:rowsBySource(remote.body.events),
  parity:canonical(remote.body.events)===canonical(db.output.body.events),status:remote.body.status??null};
 if(!base.remote.parity)return withDecision('WAIT_REMOTE_EXACT_EVENT_READBACK');
 return withDecision('BLS_VERIFIED_PUBLIC_READBACK_PASS');
}

export async function runR18({dataRoot=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`,
 getTaskXml=taskXml,gitCall=git,remote=remoteRead,dbRead=inspectSQLite}={}){
 const report={audit:'MARKET_CALENDAR_R18_VERIFIED_CYCLE',at:new Date().toISOString(),
  policy:'READ_ONLY_NO_PROVIDER_COLLECTION_NO_DB_WRITE_NO_PUBLICATION_NO_TASK_CHANGE_NO_GIT_MUTATION',
  expectedSource:INSTALLED,expectedParent:PREVIOUS,expectedParserSha256:PARSER_HASH,decision:'INSPECTION_INCOMPLETE_STOP'};
 try{
  const wrapper=parseScheduledLauncher(getTaskXml());
  const origin=wrapper?extractLiteralAssignment(fs.readFileSync(wrapper,'utf8'),'origin'):null;
  const candidates=origin?extractStaticEntrypoints(fs.readFileSync(origin,'utf8')):[];
  if(candidates.length!==1){report.decision='EXACT_CORE_ORIGIN_UNRESOLVED_STOP';return report;}
  const root=rooted(candidates[0]);
  report.worktreeId=pathIdentity(root);
  if(report.worktreeId!==WORKTREE){report.decision='APPROVED_RUNTIME_WORKTREE_CHANGED_STOP';return report;}
  const current=hex(gitCall(root,['rev-parse','HEAD']));
  const parent=hex(gitCall(root,['rev-parse','HEAD^']));
  report.actualSource=current;report.parent=parent;
  const config=readJson(path.join(dataRoot,'config.json'));
  const parser=fs.readFileSync(path.join(root,'lib','release-calendar.mjs'));
  const diff=gitCall(root,['diff','--name-only','HEAD','--','lib','worker','scripts/pc-writer','package.json','package-lock.json']);
  report.parserSha256=digest(parser);
  if(current!==INSTALLED||parent!==PREVIOUS||config?.source!==INSTALLED||config.enabled!==true||config.collectionTarget!=='pc'||report.parserSha256!==PARSER_HASH||diff){
   report.decision='INSTALLED_SOURCE_OR_CONFIG_DRIFT_STOP';return report;
  }
  const changed=gitCall(root,['diff','--name-only',PREVIOUS,INSTALLED,'--']).replaceAll('\\','/').trim();
  if(changed!=='lib/release-calendar.mjs'){report.decision='BLS_SINGLE_FILE_COMMIT_NOT_FOUND_STOP';return report;}
  const installedAt=timestamp(gitCall(root,['show','-s','--format=%cI',INSTALLED]));
  if(!installedAt){report.decision='INSTALL_COMMIT_TIME_UNKNOWN_STOP';return report;}
  report.installedAt=new Date(installedAt).toISOString();
  const db=dbRead(path.join(dataRoot,'storage','core.sqlite'));
  let baselineEvents=[],expandedEvents=[];
  if(db?.state==='FOUND'&&typeof db.bls?.body?.text==='string'){
   const backup=path.join(dataRoot,'market-calendar-r17-backups',BACKUP,'release-calendar.mjs');
   if(!fs.existsSync(backup)){report.decision='R17_BASELINE_BACKUP_MISSING_STOP';return report;}
   const original=await import(pathToFileURL(backup).href);
   baselineEvents=original.parseReleaseCalendar(db.bls.body.text,'bls');
   expandedEvents=parseReleaseCalendar(db.bls.body.text,'bls');
  }
  const verdict=evaluateR18({installedAt,collection:readJson(path.join(dataRoot,'local-collection-last-run.json')),
   writer:readJson(path.join(dataRoot,'local-writer-last-run.json')),
   ledger:readJson(path.join(dataRoot,'local-publication-ledger.json')),db,remote:await remote(),baselineEvents,expandedEvents});
  return {...report,...verdict};
 }catch{report.decision='R18_LOCAL_READ_OR_PARSE_FAILED_STOP';return report;}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const file=process.argv[2];if(!file){console.error('MISSING_REPORT_PATH');process.exitCode=2;}
 else{const report=await runR18();fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n','utf8');console.log('MARKET_CALENDAR_R18_RESULT_WRITTEN');}
}
