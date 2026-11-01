// R50: verify the exact R49-observed scheduled wrapper and resolve the
// Node entrypoint from its literal Shell.Run command. Read-only.
// Raw command strings, paths and wrapper source never appear in diagnostics.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

export const R50_APPROVED_WRAPPER_SHA256='f05deb73cbadf831d7d3a9875bfbd13356d4ab21803fe9b7944a3f2ae6a5499d';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const isWin=p=>/^[a-z]:[\\/]/i.test(p);
const fullPath=p=>isWin(p)?path.win32.resolve(p):path.resolve(p);
const pmod=p=>isWin(p)?path.win32:path;
const normalized=p=>pmod(p).normalize(p).replaceAll('\\','/').toLowerCase();
const taskArg=xml=>{
 if(typeof xml!=='string'||xml.length<40||xml.length>262144)return null;
 const m=[...xml.matchAll(/<Arguments(?:\s+[^>]*)?>([\s\S]*?)<\/Arguments>/gi)];
 if(m.length!==1)return null;
 return m[0][1].replace(/&quot;|&#34;/gi,'"').replace(/&amp;/gi,'&');
};
const readBounded=file=>{
 try{
  const stat=fs.statSync(file);
  if(!stat.isFile()||stat.size<1||stat.size>65536)return null;
  return fs.readFileSync(file);
 }catch{return null;}
};
const entryOutline=source=>{
 const words=new Map();let next=0;
 const keywords=new Set(['import','from','export','const','let','var','async','await','function',
  'if','else','try','catch','return','new','throw','process','env','path','fs','url','join',
  'resolve','dirname','fileurltopath','readfilesync','execfilesync','spawn','exec',
  'true','false','null','undefined','default']);
 return source.split(/\r?\n/).filter(line=>line.trim()).slice(0,32).map(line=>{
  const tokens=[];
  for(const m of line.matchAll(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`|[A-Za-z_$][A-Za-z0-9_$]*|\d+|\S/g)){
   const t=m[0];
   if(t[0]==='"'||t[0]==="'"||t[0]==='`')tokens.push('STRING');
   else if(/^[A-Za-z_$]/.test(t)){
    const k=t.toLowerCase();
    if(keywords.has(k))tokens.push(k.toUpperCase());
    else{if(!words.has(k))words.set(k,'ID'+(++next));tokens.push(words.get(k));}
   }else if(/^\d/.test(t))tokens.push('N');
   else if(/^[.(),:=+\-\[\]{};]$/.test(t))tokens.push(t);
   else tokens.push('SYMBOL');
   if(tokens.length===36)break;
  }
  return tokens.join(' ').slice(0,145);
 });
};

// VBScript doubles literal quotation marks. The R49 wrapper has two
// single-line Run calls with literal argument 1, not composed expressions.
export function extractR50RunLiterals(source){
 if(typeof source!=='string')return [];
 const active=source.split(/\r?\n/).filter(l=>!/^\s*(?:'|Rem\b)/i.test(l));
 const runs=[];
 for(const line of active){
  if(!/\.\s*Run\s*\(/i.test(line))continue;
  const match=line.match(/\.\s*Run\s*\(\s*("(?:""|[^"])*")\s*,\s*\d+\s*,\s*True\s*\)/i);
  if(!match)return [];
  runs.push(match[1].slice(1,-1).replaceAll('""','"'));
 }
 return runs;
}

// Only plain direct Node commands are supported. No shell, interpolation,
// redirects or metacharacters; never invoke either scheduled command.
export function tokenizeR50Command(value){
 if(typeof value!=='string'||!value||value.length>4096||/[\r\n;&|<>%!^]/.test(value))return null;
 const out=[];let token='',quoted=false,active=false;
 for(const ch of value){
  if(ch==='"'){quoted=!quoted;active=true;continue;}
  if(/\s/.test(ch)&&!quoted){
   if(active){out.push(token);token='';active=false;}
  }else{token+=ch;active=true;}
 }
 if(quoted)return null;
 if(active)out.push(token);
 return out;
}

export function resolveR50CoreOrigin(xml,{
 readFile=readBounded,expectedWrapperSha256=R50_APPROVED_WRAPPER_SHA256,
}={}){
 const result={status:'R50_ORIGIN_UNVERIFIED',mode:null,root:null,
  wrapperHashMatched:false,rootWorktreeId:null,scheduledEntryName:null,
  entryEvidence:null};
 const argumentsString=taskArg(xml);
 if(!argumentsString){result.status='R50_TASK_ARGUMENT_UNVERIFIED';return result;}
 const wrappers=[...argumentsString.matchAll(/"([^"\r\n]+\.vbs)"/gi)];
 if(wrappers.length!==1){result.status='R50_WRAPPER_AMBIGUOUS';return result;}
 const wrapperPath=fullPath(wrappers[0][1]);
 const sourceBytes=readFile(wrapperPath);
 if(!Buffer.isBuffer(sourceBytes)||sourceBytes.length>65536){
  result.status='R50_WRAPPER_UNREADABLE';return result;
 }
 if(sha(sourceBytes)!==expectedWrapperSha256){
  result.status='R50_WRAPPER_HASH_CHANGED';return result;
 }
 result.wrapperHashMatched=true;
 const runs=extractR50RunLiterals(sourceBytes.toString('utf8'));
 if(runs.length!==2||!/\.vbs\b/i.test(runs[0])||!/\.mjs\b/i.test(runs[1])){
  result.status='R50_WRAPPER_RUN_SHAPE_CHANGED';return result;
 }
 const args=tokenizeR50Command(runs[1]);
 if(!args||args.length<2||!/(?:^|[\\/])node\.exe$/i.test(args[0])){
  result.status='R50_DIRECT_NODE_COMMAND_UNVERIFIED';return result;
 }
 const scripts=args.slice(1).filter(v=>/\.mjs$/i.test(v));
 if(scripts.length!==1||scripts[0]!==args[1]){
  result.status='R50_NODE_SCRIPT_AMBIGUOUS';return result;
 }
 const entry=scripts[0];
 if(!/^(?:[a-z]:[\\/]|\/)/i.test(entry)){
  result.status='R50_NODE_SCRIPT_ORIGIN_UNVERIFIED';return result;
 }
 const scriptFile=fullPath(entry);
 result.scheduledEntryName=pmod(scriptFile).basename(scriptFile);
 let realFile=scriptFile;
 try{
  const stat=fs.statSync(scriptFile);
  if(!stat.isFile()||stat.size<1||stat.size>5242880)throw Error('INVALID_SCRIPT_FILE');
  realFile=fs.realpathSync(scriptFile);
 }catch{result.status='R50_SCHEDULED_SCRIPT_UNREADABLE';return result;}
 const mod=pmod(realFile);
 const directProjectEntry=/[\\/]scripts[\\/]pc-writer[\\/][a-z0-9._-]+\.mjs$/i.test(realFile);
 if(!directProjectEntry){
  const body=fs.readFileSync(scriptFile,'utf8');
  const mjsRefs=[...body.matchAll(/(?:[A-Za-z]:[\\/]|\/)[^"'`\r\n]*?[\\/]scripts[\\/]pc-writer[\\/][a-z0-9._-]+\.mjs/gi)];
  result.entryEvidence={
   directNodeCommand:true,entryExists:true,entryRealpathDiffers:normalized(realFile)!==normalized(scriptFile),
   entryUnderPcWriter:/[\\/]pc-writer[\\/]/i.test(realFile),
   entryUnderDataPcWriter:/[\\/]data[\\/]pc-writer[\\/]/i.test(realFile),
   referencedProjectScripts:mjsRefs.length,
   hasGitOperation:/\bgit\b/i.test(body),hasConfigReference:/\bconfig\.json\b|\bconfig\b/i.test(body),
   hasProjectReference:/\bprojects?[\\/]|\bprojects?\b/i.test(body),
   hasImport:/\bimport\b/i.test(body),hasSpawn:/\bspawn\b|\bexecFile\b/i.test(body),
   entrySha256:sha(Buffer.from(body)),codeOutline:entryOutline(body)};
  result.status='R50_NODE_ENTRY_OUTSIDE_REPO_SCRIPTS';return result;
 }
 const root=mod.resolve(realFile,'..','..','..');
 result.status='R50_SCHEDULED_ORIGIN_RESOLVED';
 result.mode='EXACT_WRAPPER_LITERAL_DIRECT_NODE';
 result.root=root;
 result.rootWorktreeId=sha(normalized(root)).slice(0,12);
 return result;
}
