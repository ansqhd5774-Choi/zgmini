// R48: resolve current Core checkout from the *scheduled* WScript action.
// Supports both legacy R38 origin wrappers and direct modern VBS/script wrappers.
// No guesswork from E: project folders and no filesystem mutation.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {r46CoreRootFromTask} from './market-calendar-r46-pc-apply.mjs';

const digest=value=>createHash('sha256').update(value).digest('hex');
const windows=p=>/^[a-z]:[\\/]/i.test(p);
const abs=p=>windows(p)?path.win32.resolve(p):path.resolve(p);
const rooted=p=>(windows(p)?path.win32:path).resolve(p,'..','..','..');
const normalized=p=>path.normalize(p).replaceAll('\\','/').toLowerCase();
const decode=v=>v.replace(/&quot;|&#34;/gi,'"').replace(/&amp;/gi,'&');
const readBounded=file=>{
 try{
  const stat=fs.statSync(file);
  if(!stat.isFile()||stat.size<1||stat.size>65536)return null;
  return fs.readFileSync(file,'utf8');
 }catch{return null;}
};
const scriptPaths=text=>{
 const re=/((?:[a-z]:[\\/]|\/)[^"'\r\n<>]*?[\\/]scripts[\\/]pc-writer[\\/](?:quota-runner|local-cycle|run-local|collect-local)\.mjs)/gi;
 return [...new Map([...text.matchAll(re)].map(m=>{
  const full=abs(m[1].trim());return [normalized(full),full];
 })).values()];
};
const cmdPaths=text=>{
 const re=/"((?:[a-z]:[\\/]|\/)[^"\r\n]*\.cmd)"/gi;
 return [...new Map([...text.matchAll(re)].map(m=>{
  const full=abs(m[1]);return [normalized(full),full];
 })).values()];
};

export function resolveR48CoreOrigin(xml,{readFile=readBounded,legacyResolver=r46CoreRootFromTask}={}){
 const output={status:'R48_ORIGIN_NOT_RESOLVED',mode:null,root:null,
  wrapperCount:0,wrapperReadable:false,wrapperScriptReferences:0,
  originFileCandidates:0,originScriptReferences:0,rootWorktreeId:null};
 if(typeof xml!=='string'||xml.length<40||xml.length>262144){
  output.status='R48_TASK_XML_INVALID';return output;
 }
 try{
  const legacy=legacyResolver(xml);
  if(legacy){
   output.status='R48_SCHEDULED_ORIGIN_RESOLVED';output.mode='LEGACY_R38';output.root=legacy;
   output.rootWorktreeId=digest(normalized(legacy)).slice(0,12);
   return output;
  }
 }catch{/* Continue with a bounded modern wrapper check. */}
 const fields=[...xml.matchAll(/<Arguments(?:\s+[^>]*)?>([\s\S]*?)<\/Arguments>/gi)];
 if(fields.length!==1){output.status='R48_TASK_ARGUMENT_AMBIGUOUS';return output;}
 const args=decode(fields[0][1]);
 const wrappers=[...args.matchAll(/"([^"\r\n]+\.vbs)"/gi)]
  .map(m=>abs(m[1]));
 output.wrapperCount=wrappers.length;
 if(wrappers.length!==1){output.status='R48_WRAPPER_AMBIGUOUS';return output;}
 const wrapper=readFile(wrappers[0]);
 if(typeof wrapper!=='string'){output.status='R48_WRAPPER_UNREADABLE';return output;}
 output.wrapperReadable=true;
 // VBS instructions must invoke a shell; a mere documentation comment is not
 // a sufficient basis for treating an embedded path as the active executable.
 if(!/\.\s*(?:Run|Exec)\b/i.test(wrapper)){
  output.status='R48_WRAPPER_EXECUTION_UNVERIFIED';return output;
 }
 const activeWrapper=wrapper.split(/\r?\n/).filter(line=>!/^\s*(?:'|Rem\b)/i.test(line)).join('\n');
 const direct=scriptPaths(activeWrapper);
 output.wrapperScriptReferences=direct.length;
 let targets=direct;
 if(targets.length===0){
  const origins=cmdPaths(wrapper);
  output.originFileCandidates=origins.length;
  if(origins.length!==1){output.status='R48_ORIGIN_CHAIN_UNVERIFIED';return output;}
  const origin=readFile(origins[0]);
  if(typeof origin!=='string'){output.status='R48_ORIGIN_FILE_UNREADABLE';return output;}
  const activeOrigin=origin.split(/\r?\n/).filter(line=>!/^\s*(?:Rem\b|::)/i.test(line)).join('\n');
  targets=scriptPaths(activeOrigin);
  output.originScriptReferences=targets.length;
 }
 if(targets.length!==1){output.status='R48_SCRIPT_REFERENCE_AMBIGUOUS';return output;}
 const target=targets[0];
 try{if(!fs.statSync(target).isFile())throw Error('NOT_A_FILE');}
 catch{output.status='R48_REFERENCED_SCRIPT_MISSING';return output;}
 const root=rooted(target);
 output.status='R48_SCHEDULED_ORIGIN_RESOLVED';
 output.mode=direct.length?'DIRECT_VBS':'VBS_TO_CMD';output.root=root;
 output.rootWorktreeId=digest(normalized(root)).slice(0,12);
 return output;
}
