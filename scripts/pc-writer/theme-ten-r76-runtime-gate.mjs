// R76: read-only inspection of the approved PC task and publisher gates.
// Never emit task action arguments, file contents, personal paths or secrets.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT='E:/ZGmini/data';
const TASKS=['ZGMINI-PC-Theme-Nine-R47-Private',
 'ZGMINI-PC-Theme-Nine-R54-Public','ZGMINI-PC-Theme-Biotech',
 'ZGMINI-PC-Theme-Data-Center-Power'];
const REPORT='R76_APPROVED_TEN_THEME_RUNTIME_GATE_READ_ONLY';

export function taskXmlSummary(xml){
 const settings=xml.match(/<Settings\b[^>]*>([\s\S]*?)<\/Settings>/i)?.[1]??'';
 const enabled=settings.match(/<Enabled>\s*(true|false)\s*<\/Enabled>/i)?.[1];
 const triggers=(xml.match(/<CalendarTrigger\b[^>]*>[\s\S]*?<\/CalendarTrigger>/gi)??[])
  .map(block=>({enabled:block.match(/<Enabled>\s*(true|false)\s*<\/Enabled>/i)?.[1]??'UNSPECIFIED'}));
 const hasAction=/<Exec\b[^>]*>/i.test(xml);
 return {settingsEnabled:enabled??'UNSPECIFIED',triggers,
  hasExec:hasAction,xmlParsed:!!settings&&hasAction};
}

function tasks(spawn=spawnSync){
 return TASKS.map(name=>{
  const r=spawn('schtasks',['/Query','/TN',name,'/XML'],
   {encoding:null,windowsHide:true,timeout:12000,maxBuffer:1024*1024});
  if(r.status!==0)return {name,query:'NOT_VERIFIED',exit:r.status??null};
  const b=Buffer.from(r.stdout??'');
  const xml=b[0]===255&&b[1]===254?b.subarray(2).toString('utf16le'):
   b[0]===254&&b[1]===255?'UNSUPPORTED_UTF16BE':b.toString('utf8');
  return {name,query:'FOUND',...taskXmlSummary(xml)};
 });
}

const fields=/^(?:REPORT|RESULT|STATUS|BLOCKED|ERROR|CMD_EXIT_CODE|INSTALL_EXIT|PRIVATE_CYCLE_EXIT|AUDIT_EXIT)\s*[=:]\s*([^\r\n]*)/i;
const safeValue=value=>/^[A-Z0-9_.: -]{1,100}$/i.test(value)?value:'REDACTED';
function fileEvidence(file){
 if(!fs.existsSync(file)||!fs.statSync(file).isFile())return {exists:false};
 const stat=fs.statSync(file);
 const bytes=fs.readFileSync(file).subarray(-128*1024);
 const text=bytes.toString('utf8');
 const signals=[];
 for(const line of text.split(/\r?\n/)){
  const found=line.trim().match(fields);
  if(found)signals.push({key:line.split(/[=:]/)[0].trim().slice(0,32),
   value:safeValue(found[1].trim())});
 }
 const errors=[...text.matchAll(/"(?:error|reason|status)"\s*:\s*"([A-Z0-9_]{4,100})"/gi)]
  .map(x=>x[1]).slice(-8);
 return {exists:true,modifiedAt:stat.mtime.toISOString(),bytes:stat.size,
  signals:signals.slice(-18),codes:errors};
}

function latestLogs(dir,pattern,count=3){
 if(!fs.existsSync(dir)||!fs.statSync(dir).isDirectory())return {status:'DIRECTORY_MISSING'};
 const matched=fs.readdirSync(dir).filter(name=>pattern.test(name))
  .map(name=>({name,file:path.join(dir,name)}))
  .filter(x=>fs.statSync(x.file).isFile())
  .sort((a,b)=>fs.statSync(b.file).mtimeMs-fs.statSync(a.file).mtimeMs).slice(0,count);
 return {status:matched.length?'FOUND':'NO_MATCH',files:matched.map(x=>({
  name:x.name,...fileEvidence(x.file)}))};
}

export function inspectR76({root=ROOT,desktop=path.join(process.env.USERPROFILE??'','Desktop'),
 spawn=spawnSync,platform=process.platform,now=Date.now()}={}){
 if(platform!=='win32'&&process.env.R76_TEST_MODE!=='1')throw Error('WINDOWS_REQUIRED');
 const pub=path.join(root,'pc-writer','theme-nine-r54');
 const consent=path.join(pub,'PUBLISHER_CONSENT_R54.txt');
 const consentGood=fs.existsSync(consent)&&fs.readFileSync(consent,'utf8')
  .split(/\r?\n/).includes('ACCEPT_R54_ANONYMOUS_DERIVED_RISK_20261028');
 return {report:REPORT,inspectedAt:new Date(now).toISOString(),
  taskStates:tasks(spawn),
  publicR54:{runnerExists:fs.existsSync(path.join(pub,'scripts','pc-writer',
   'THEME_NINE_R54_PUBLIC_CYCLE.cmd')),
   consentExact:consentGood,
   recentLogs:latestLogs(path.join(pub,'logs'),/^THEME_NINE_R54_CYCLE_.*\.txt$/)},
  optionalTasks:{
   biotechR8Last:fileEvidence(path.join(desktop,'BIOTECH_R8_LAST_RUN.txt')),
   biotechR7Last:fileEvidence(path.join(desktop,'BIOTECH_R7_LAST_RUN.txt')),
   dataCenterR2Last:fileEvidence(path.join(desktop,'DATA_CENTER_POWER_R2_RESULT.txt')),
   dataCenterR5Last:fileEvidence(path.join(desktop,'DATA_CENTER_POWER_R5_RESULT.txt')),
   spaceR14Last:fileEvidence(path.join(desktop,'SPACE_SATELLITE_R14_MISSING_ONLY_RESULT.txt'))},
  taskWrites:0,d1Writes:0,collectionWrites:0,scoreWrites:0,
  next:'CORRELATE_WITH_R75_D1_AND_RAW_BEFORE_ANY_TASK_CHANGE'};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==3||process.argv[2]!=='--read-only')throw Error('USAGE');
  console.log(JSON.stringify(inspectR76(),null,2));
 }catch(error){console.log(JSON.stringify({report:REPORT,status:'BLOCKED',
  reason:error?.message??'UNEXPECTED',taskWrites:0,d1Writes:0}));process.exitCode=1;}
}
