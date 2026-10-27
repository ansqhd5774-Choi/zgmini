// R42 offline analysis of existing PC-owned collector source references.
// Reports only bounded filenames, hashes, ticker mentions and counts; no source text.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT='E:\\ZGmini\\data';
const ROSTER_SHA='e2ea97ce0ed0bf15cb083237d63d3cf520e090d8bd229a837bad393c3f8b0c6c';
const START=['r181-primary-cycle.mjs','r179-publish-core.mjs','r171-publish.mjs'];
const MAX_FILES=30,MAX_SIZE=1024*1024;
const sha=b=>createHash('sha256').update(b).digest('hex');
const stop=c=>{throw Object.assign(new Error(c),{code:c});};
const extensions=new Set(['.mjs','.js','.cjs','.json']);

export function literalRefs(source){
 const refs=new Set();
 // Only static, quoted, relative references are followed. No code is executed.
 const re=/["'](\.\.?[\\/][A-Za-z0-9_./\\-]+\.(?:mjs|cjs|js|json))["']/g;
 for(const match of source.matchAll(re))refs.add(match[1].replaceAll('\\','/'));
 return [...refs].sort();
}

export function inspectNineR42Modules({sourceRoot,roster,readFile=fs.readFileSync,
 statFile=fs.statSync,realPath=fs.realpathSync}={}){
 if(roster?.counts?.themes!==9||roster?.counts?.positions!==64||
  roster?.counts?.uniqueTickers!==63||!Array.isArray(roster.groups))stop('R42_ROSTER');
 const symbols=[...new Set(roster.groups.flatMap(g=>g.tickers.map(t=>t.ticker)))].sort();
 if(symbols.length!==63)stop('R42_ROSTER_SYMBOLS');
 const realRoot=realPath(sourceRoot);
 const visited=new Set(),pending=[...START],modules=[];
 while(pending.length&&modules.length<MAX_FILES){
  const relative=pending.shift();
  if(visited.has(relative))continue;
  visited.add(relative);
  const full=path.resolve(realRoot,relative);
  if(path.relative(realRoot,full).startsWith('..')||
   !extensions.has(path.extname(full)))continue;
  let actual,size,source;
  try{
   actual=realPath(full);
   if(actual!==realRoot&&!actual.startsWith(realRoot+path.sep))continue;
   size=statFile(actual).size;
   if(size>MAX_SIZE){modules.push({file:relative,status:'SKIP_TOO_LARGE',bytes:size});continue;}
   source=readFile(actual,'utf8');
  }catch{modules.push({file:relative,status:'NOT_AVAILABLE'});continue;}
  const literal=literalRefs(source);
  const resolved=[];
  for(const ref of literal){
   const sub=path.relative(realRoot,path.resolve(path.dirname(actual),ref));
   if(sub==='..'||sub.startsWith('..'+path.sep)||path.isAbsolute(sub))continue;
   if(!extensions.has(path.extname(sub)))continue;
   resolved.push(sub);
   if(!visited.has(sub)&&!pending.includes(sub))pending.push(sub);
  }
  const mentions=symbols.filter(t=>new RegExp('(^|[^A-Z0-9])'+t+'([^A-Z0-9]|$)')
   .test(source.toUpperCase()));
  modules.push({file:relative,status:'STATIC_READ_ONLY',bytes:size,
   sha256:sha(Buffer.from(source)),staticTickerMentions:mentions.length,
   matchedApprovedTickers:mentions,relativeReferences:resolved.sort(),
   dynamicImportHints:(source.match(/\bimport\s*\(/g)||[]).length,
   fileReadHints:(source.match(/\b(?:readFileSync|readFile)\s*\(/g)||[]).length});
 }
 return {contract:'THEME_NINE_R42_STATIC_DEPENDENCY_AUDIT_V1',
  status:'SOURCE_DEPENDENCY_AUDITED_RUNTIME_COVERAGE_UNKNOWN',
  inspectedFiles:modules.length,unresolvedQueueCount:pending.length,
  modules,interpretation:'STATIC_REFERENCE_AND_TEXT_ONLY_NOT_RUNTIME_COLLECTION_PROOF',
  providerCalls:0,dbWrites:0,d1Writes:0,schedulerWrites:0};
}

function inspectPC(dataRoot){
 const candidates=[path.join(HERE,'theme-nine-r20-approved-candidates.json'),
  path.join(HERE,'..','..','config','theme-nine-r20-approved-candidates.json')];
 const file=candidates.find(x=>fs.existsSync(x));
 if(!file)stop('R42_ROSTER_MISSING');
 const b=fs.readFileSync(file);
 if(sha(b)!==ROSTER_SHA)stop('R42_ROSTER_SHA_DRIFT');
 const sourceRoot=path.join(dataRoot,'theme-market-history-r131','marketparquet-r167');
 if(!fs.existsSync(sourceRoot))stop('R42_SOURCE_DIR_MISSING');
 return {...inspectNineR42Modules({sourceRoot,roster:JSON.parse(b.toString('utf8'))}),
  rosterSha256:ROSTER_SHA};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let out;
 try{
  if(process.argv.length!==3||process.argv[2]!=='--inspect')stop('R42_USAGE');
  out=inspectPC(process.env.ZGMINI_DATA_ROOT||ROOT);
 }catch(e){
  out={status:'STOP_R42_READONLY_AUDIT',error:e.code??'R42_UNEXPECTED',
   detail:e.code?undefined:String(e.message).slice(0,180),
   providerCalls:0,dbWrites:0,d1Writes:0,schedulerWrites:0};
  process.exitCode=1;
 }
 try{
  const n='THEME_NINE_R42_SOURCE_DEPENDENCY_RESULT_'+
   new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14)+'_'+process.pid+'.txt';
  const target=path.join(HERE,n);
  fs.writeFileSync(target,'REPORT=THEME_NINE_R42_SOURCE_DEPENDENCY\r\n'+
   Object.entries(out).map(([k,v])=>k.toUpperCase()+'='+
    (v!==null&&typeof v==='object'?JSON.stringify(v):v)).join('\r\n')+'\r\n',
   {encoding:'utf8',flag:'wx'});
  process.stdout.write(JSON.stringify({status:out.status,reportFile:target})+'\n');
 }catch(e){process.stderr.write('R42_REPORT_WRITE_FAILED '+String(e.message)+'\n');
  process.exitCode=1;}
}
