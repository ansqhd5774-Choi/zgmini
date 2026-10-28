// R44: inspect ONLY the installed MarketParquet-ETF task action and its local
// JS module references. No execution of either source or provider/API requests.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {redactSourceStructure} from './theme-nine-r43-source-shape.mjs';

const TASK='ZGMINI-PC-MarketParquet-ETF';
const DATA_ROOT='E:\\ZGmini\\data\\theme-market-history-r131';
const R41_ACTION_SHA='34e1822ad9ac91972a9b6eabad42202cac6d488ebed99410763625697f900e56';
const MAX_FILES=8,MAX_BYTES_PER_SOURCE=65536;
const sha=b=>createHash('sha256').update(b).digest('hex');
const stop=(code)=>{throw Object.assign(new Error('R44_'+code),{code:'R44_'+code});};

function xmlValue(xml,name){
 return xml.match(new RegExp('<(?:[\\w-]+:)?'+name+'>([\\s\\S]*?)<\\/(?:[\\w-]+:)?'+name+'>','i'))?.[1]??'';
}
function decodeXml(v){
 return v.replace(/&quot;/gi,'"').replace(/&apos;/gi,"'")
  .replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&amp;/gi,'&');
}

// Returns basenames and local paths in memory ONLY. Never writes action text.
export function parseR44TaskAction(xml,{sourceRoot=DATA_ROOT}={}){
 const command=xmlValue(xml,'Command'),args=xmlValue(xml,'Arguments');
 if(!command&&!args)stop('TASK_ACTION_NOT_FOUND');
 const actionSha256=sha(Buffer.from(command+'\n'+args));
 // Parse fields separately. A Node executable in <Command> must never absorb
 // the script path from <Arguments> when both are unquoted drive paths.
 const candidates=[command,args].flatMap(field=>
  [...decodeXml(field).matchAll(/([A-Za-z]:\\[^\s"'<>]*?\.(?:mjs|js|cmd))/gi)]
   .map(match=>match[1].trim()));
 const normalizedRoot=path.win32.normalize(sourceRoot).toLowerCase();
 const inRoot=[...new Set(candidates.filter(v=>{
  const relative=path.win32.relative(normalizedRoot,path.win32.normalize(v).toLowerCase());
  return relative&&relative!=='..'&&!relative.startsWith('..\\')&&!path.win32.isAbsolute(relative);
 }))];
 return {actionSha256,sourcePaths:inRoot,containsAnySourceReference:candidates.length>0,
  sourceLocationVerified:inRoot.length>0};
}

function inspectFile(abs,rootReal){
 const real=fs.realpathSync(abs),relative=path.relative(rootReal,real);
 if(!relative||relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))stop('SOURCE_OUTSIDE_ROOT');
 const stat=fs.lstatSync(abs);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>MAX_BYTES_PER_SOURCE)stop('SOURCE_UNSAFE');
 const base=path.basename(real);
 if(!/^[A-Za-z0-9._-]+\.(?:mjs|js|cmd)$/i.test(base))stop('SOURCE_FILENAME');
 const bytes=fs.readFileSync(abs);
 if(bytes.byteLength!==stat.size)stop('SOURCE_SIZE_DRIFT');
 const source=bytes.toString('utf8');
 // Only exact explicit relative module imports are followed, never dynamic paths.
 const references=base.toLowerCase().endsWith('.cmd')?[]:
  [...source.matchAll(/(?:\bfrom\s*|\bimport\s*\(|\brequire\s*\()\s*['"](\.\.?\/[^'"]+\.(?:mjs|js))['"]/g)]
   .map(match=>match[1]);
 return {file:base,sha256:sha(bytes),bytes:bytes.byteLength,
  relativeImports:references.map(v=>path.basename(v)),
  references:references.map(v=>path.resolve(path.dirname(real),v)),
  // Batch wrappers may contain secrets/comments; report only their identity.
  redactedShape:base.toLowerCase().endsWith('.cmd')?null:redactSourceStructure(source)};
}

export function inspectR44Source({sourcePaths,sourceRoot=DATA_ROOT}={}){
 if(process.platform!=='win32')stop('WINDOWS_REQUIRED');
 const rootReal=fs.realpathSync(sourceRoot);
 const queue=[...sourcePaths],done=new Set(),output=[];
 while(queue.length&&output.length<MAX_FILES){
  const file=queue.shift(),candidate=path.resolve(file);
  if(done.has(candidate.toLowerCase()))continue;
  const entry=inspectFile(candidate,rootReal);
  done.add(candidate.toLowerCase());
  output.push(entry);
  for(const ref of entry.references)if(!done.has(ref.toLowerCase()))queue.push(ref);
 }
 return {files:output,truncated:queue.length>0};
}

function queryTaskXML(){
 if(process.platform!=='win32')stop('WINDOWS_REQUIRED');
 const r=spawnSync('schtasks',['/Query','/TN',TASK,'/XML'],
  {encoding:'utf8',timeout:15000,maxBuffer:2*1024*1024,windowsHide:true});
 if(r.error||r.status!==0||!r.stdout)stop('TASK_READ_UNAVAILABLE');
 return r.stdout;
}

function main(){
 let output={status:'STOP_R44_UNKNOWN'};
 try{
  if(process.argv.length!==3||process.argv[2]!=='--inspect')stop('USAGE');
  const task=parseR44TaskAction(queryTaskXML());
  if(task.actionSha256!==R41_ACTION_SHA)stop('ACTION_SHA_DRIFT');
  if(!task.sourceLocationVerified)stop('MARKETPARQUET_ACTION_SOURCE_NOT_LOCATED');
  const inspected=inspectR44Source({sourcePaths:task.sourcePaths});
  output={status:'R44_MARKETPARQUET_TASK_SOURCE_SHAPE_RECORDED',
   r41ActionShaMatched:true,task:TASK,sourceFiles:inspected.files.map(f=>({
    name:f.file,sha256:f.sha256,bytes:f.bytes,relativeImports:f.relativeImports})),
   truncated:inspected.truncated,sourceShapes:inspected.files
    .filter(f=>f.redactedShape!==null).map(f=>({file:f.file,shape:f.redactedShape}))};
 }catch(e){output={status:'STOP_R44_SOURCE_SHAPE',error:typeof e.code==='string'&&e.code.startsWith('R44_')?e.code:'R44_IO_OR_PARSE_ERROR'};process.exitCode=1;}
 const report=[
  'REPORT=THEME_NINE_R44_MARKETPARQUET_TASK',
  'CONTRACT=R44_APPROVED_TASK_ACTION_TO_SOURCE_SHAPE_V1',
  'STATUS='+output.status,
  'R41_ACTION_SHA_MATCHED='+String(output.r41ActionShaMatched??false),
  'TASK_NAME='+TASK,
  'SOURCE_FILES='+JSON.stringify(output.sourceFiles??[]),
  'SOURCE_GRAPH_TRUNCATED='+String(output.truncated??false),
  'ERROR='+String(output.error??'NONE'),
  'SOURCE_ORIGINAL_CONTENT_EXPORTED=NO',
  'TASK_XML_COMMAND_ARGUMENTS_EXPORTED=NO',
  'PROVIDER_CALLS=0',
  'DB_D1_SCHEDULER_PUBLICATION_WRITES=0',
  'MASKED_STRUCTURE_NOT_EXECUTABLE_CODE=YES',
 ];
 for(const x of output.sourceShapes??[]){report.push('BEGIN_MASKED='+x.file,x.shape,'END_MASKED='+x.file);}
 const outfile=path.join(path.dirname(fileURLToPath(import.meta.url)),
  'THEME_NINE_R44_MARKETPARQUET_TASK_RESULT_'+new Date().toISOString().replace(/\D/g,'').slice(0,14)+'_'+process.pid+'.txt');
 try{fs.writeFileSync(outfile,report.join('\r\n')+'\r\n',{flag:'wx',encoding:'utf8'});}
 catch{process.stderr.write('STOP_R44_REPORT_WRITE_FAILED\n');process.exitCode=1;return;}
 process.stdout.write('STATUS='+output.status+'\nRESULT_FILE='+path.basename(outfile)+'\n');
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
