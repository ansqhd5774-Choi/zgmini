// R51: follow the FIRST (Core) VBS Run of the R49/R50 scheduled wrapper.
// The SECOND command invokes a separate archive-run.mjs postprocessor.
// Only read approved task-referenced files; never execute scheduled commands.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {extractR50RunLiterals,tokenizeR50Command,R50_APPROVED_WRAPPER_SHA256} from './market-calendar-r50-core-origin.mjs';
import {resolveR48CoreOrigin} from './market-calendar-r48-core-origin.mjs';
import {anonymizeR49Vbs} from './market-calendar-r49-wrapper-shape.mjs';

const sha=x=>createHash('sha256').update(x).digest('hex');
const win=p=>/^[a-z]:[\\/]/i.test(p);
const abs=p=>win(p)?path.win32.resolve(p):path.resolve(p);
const norm=p=>(win(p)?path.win32:path).normalize(p).replaceAll('\\','/').toLowerCase();
const moduleFor=p=>win(p)?path.win32:path;
const readLimited=(file,limit=65536)=>{
 try{const s=fs.statSync(file);if(!s.isFile()||s.size<1||s.size>limit)return null;
  return fs.readFileSync(file);
 }catch{return null;}
};
const argument=xml=>{
 if(typeof xml!=='string'||xml.length<40||xml.length>262144)return null;
 const items=[...xml.matchAll(/<Arguments(?:\s+[^>]*)?>([\s\S]*?)<\/Arguments>/gi)];
 if(items.length!==1)return null;
 return items[0][1].replace(/&quot;|&#34;/gi,'"').replace(/&amp;/gi,'&');
};
const vbsPathFromCommand=command=>{
 const t=tokenizeR50Command(command);
 if(!t||!t.length)return null;
 const host=/(?:^|[\\/])(?:wscript|cscript)\.exe$/i.test(t[0]);
 const direct=/\.vbs$/i.test(t[0]);
 if(!host&&!direct)return null;
 const scripts=(host?t.slice(1):t).filter(v=>/\.vbs$/i.test(v));
 if(scripts.length!==1||!/^(?:[a-z]:[\\/]|\/)/i.test(scripts[0]))return null;
 return abs(scripts[0]);
};
const xmlFor=p=>`<Task><Actions><Exec><Command>wscript.exe</Command><Arguments>"${p.replaceAll('&','&amp;').replaceAll('"','&quot;')}"</Arguments></Exec></Actions></Task>`;
const nodeOriginFromRun=(source)=>{
 const literals=extractR50RunLiterals(source);
 const node=literals.map(x=>tokenizeR50Command(x)).filter(a=>a&&a.length>=2&&/(?:^|[\\/])node\.exe$/i.test(a[0]));
 if(node.length!==1)return null;
 const scripts=node[0].slice(1).filter(x=>/\.mjs$/i.test(x));
 if(scripts.length!==1||scripts[0]!==node[0][1])return null;
 const script=scripts[0];
 if(!/^(?:[a-z]:[\\/]|\/)/i.test(script)||
  !/[\\/]scripts[\\/]pc-writer[\\/][a-z0-9._-]+\.mjs$/i.test(script))return null;
 const target=abs(script);
 if(!readLimited(target,5242880))return null;
 const mod=moduleFor(target);
 return mod.resolve(target,'..','..','..');
};

export function resolveR51CoreOrigin(xml,{
 readFile=readLimited,expectedOuterHash=R50_APPROVED_WRAPPER_SHA256,
 legacyOrModern=resolveR48CoreOrigin,maxDepth=3,
}={}){
 const out={status:'R51_UNVERIFIED_ORIGIN',root:null,rootWorktreeId:null,
  outerHashMatched:false,coreVbsCount:0,coreChain:[],
  archiveEntrypointRecognized:false,mode:null};
 const args=argument(xml);
 if(!args){out.status='R51_TASK_ARGUMENT_UNVERIFIED';return out;}
 const wrappers=[...args.matchAll(/"([^"\r\n]+\.vbs)"/gi)];
 if(wrappers.length!==1){out.status='R51_TASK_WRAPPER_AMBIGUOUS';return out;}
 const outer=abs(wrappers[0][1]);
 const bytes=readFile(outer);
 if(!Buffer.isBuffer(bytes)||sha(bytes)!==expectedOuterHash){
  out.status='R51_OUTER_WRAPPER_CHANGED';return out;
 }
 out.outerHashMatched=true;
 const calls=extractR50RunLiterals(bytes.toString('utf8'));
 if(calls.length!==2||!/\.vbs\b/i.test(calls[0])||!/archive-run\.mjs\b/i.test(calls[1])){
  out.status='R51_TASK_CORE_ARCHIVE_ORDER_UNVERIFIED';return out;
 }
 out.archiveEntrypointRecognized=true;
 let active=vbsPathFromCommand(calls[0]);
 if(!active){out.status='R51_FIRST_VBS_COMMAND_UNVERIFIED';return out;}
 const visited=new Set([norm(outer)]);
 for(let level=1;level<=maxDepth;level++){
  if(visited.has(norm(active))){out.status='R51_CORE_VBS_CYCLE_STOP';return out;}
  visited.add(norm(active));
  const child=readFile(active);
  if(!Buffer.isBuffer(child)){
   out.status='R51_NESTED_VBS_UNREADABLE';return out;
  }
  const source=child.toString('utf8');
  const shaped=anonymizeR49Vbs(source);
  out.coreChain.push({depth:level,kind:'VBS',sha256:sha(child),
   fileName:moduleFor(active).basename(active),lines:shaped.lines,
   hasRun:shaped.hints.hasRun,hasScriptsPart:shaped.hints.hasScriptsPart,
   hasPcWriterPart:shaped.hints.hasPcWriterPart});
  out.coreVbsCount++;
  const result=legacyOrModern(xmlFor(active));
  let root=result?.status==='R48_SCHEDULED_ORIGIN_RESOLVED'?result.root:null;
  let mode=result?.mode?'R48_'+result.mode:null;
  if(!root){root=nodeOriginFromRun(source);if(root)mode='NESTED_VBS_DIRECT_NODE';}
  if(root){
   out.root=root;out.rootWorktreeId=sha(norm(root)).slice(0,12);
   out.status='R51_SCHEDULED_CORE_ORIGIN_RESOLVED';out.mode=mode;
   return out;
  }
  const nestedCalls=extractR50RunLiterals(source);
  const vbs=nestedCalls.map(vbsPathFromCommand).filter(Boolean);
  if(vbs.length!==1){out.status='R51_NESTED_CORE_ORIGIN_UNVERIFIED';return out;}
  active=vbs[0];
 }
 out.status='R51_NESTED_CORE_DEPTH_LIMIT';return out;
}
