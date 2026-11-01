// R49: syntax-only readout of an existing Core VBS launcher.
// No raw paths, quoted values, variable names, secrets or source code lines.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const sha=v=>createHash('sha256').update(v).digest('hex');
const win=p=>/^[a-z]:[\\/]/i.test(p);
const abs=p=>win(p)?path.win32.resolve(p):path.resolve(p);
const task=()=>{
 const b=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],
  {windowsHide:true,timeout:12000,maxBuffer:262144,stdio:['ignore','pipe','ignore']});
 return ((b[0]===255&&b[1]===254||b.includes(0))?b.toString('utf16le'):
  b.toString('utf8')).replace(/^\ufeff/,'');
};
const keywords=new Set(['set','dim','const','if','then','else','end','on','error','resume','next',
 'createobject','wscript','shell','run','exec','quit','chr','replace','environ','getobject',
 'call','true','false','not','and','or','exit','function','sub','byval','byref']);
const stringType=value=>{
 const s=value.toLowerCase().replaceAll('""','"');
 if(/\.mjs(?:\b|$)/.test(s))return 'STRING_MJS';
 if(/\.cmd(?:\b|$)/.test(s))return 'STRING_CMD';
 if(/\.vbs(?:\b|$)/.test(s))return 'STRING_VBS';
 if(/\.exe(?:\b|$)/.test(s))return 'STRING_EXE';
 if(/[a-z]:[\\/]|[\\/]{2}/i.test(s))return 'STRING_PATH';
 if(/scripts/i.test(s))return 'STRING_SCRIPTS_PART';
 if(/pc-writer/i.test(s))return 'STRING_PCWRITER_PART';
 return 'STRING_LITERAL';
};

export function anonymizeR49Vbs(source){
 if(typeof source!=='string')throw Error('R49_VBS_REQUIRED');
 const names=new Map();let nextVar=0;
 const lines=source.split(/\r?\n/).filter(x=>x.trim().length).slice(0,48);
 const shaped=lines.map(line=>{
  const tokens=[];
  const lex=/"(?:""|[^"])*"|[A-Za-z_][A-Za-z0-9_]*|\d+(?:\.\d+)?|\S/g;
  for(const m of line.matchAll(lex)){
   const v=m[0];
   if(v.startsWith('"'))tokens.push(stringType(v.slice(1,-1)));
   else if(/^[A-Za-z_]/.test(v)){
    const lower=v.toLowerCase();
    if(lower==='rem'&&tokens.length===0){tokens.push('COMMENT');break;}
    tokens.push(keywords.has(lower)?lower.toUpperCase():
     (names.get(lower)??(()=>{const value='VAR'+(++nextVar);names.set(lower,value);return value;})()));
   }else if(/^\d/.test(v))tokens.push('N');
   else if(v==="'"){tokens.push('COMMENT');break;}
   else if(/[=():.,&+\-\\/]/.test(v))tokens.push(v);
   else tokens.push('SYMBOL');
   if(tokens.length>=65){tokens.push('TRUNCATED');break;}
  }
  return tokens.join(' ').slice(0,250);
 });
 return {lines:shaped,linesShown:shaped.length,variableCount:names.size,sourceLines:source.split(/\r?\n/).length,
  sourceSha256:sha(source),
  hints:{hasRun:/\.\s*Run\b/i.test(source),hasExec:/\.\s*Exec\b/i.test(source),
   hasScriptsPart:/scripts/i.test(source),hasPcWriterPart:/pc-writer/i.test(source),
   hasQuotaRunner:/quota-runner/i.test(source),hasLocalCycle:/local-cycle/i.test(source),
   hasCollectLocal:/collect-local/i.test(source),hasNodeExe:/node\.exe/i.test(source),
   hasOriginKey:/\borigin\b/i.test(source),hasChr:/\bChr\s*\(/i.test(source),
   hasEnviron:/\bEnviron\s*\(/i.test(source),hasConcat:source.includes('&')}};
}

export function diagnoseR49WrapperShape({getTaskXml=task,readWrapper=fs.readFileSync}={}){
 const output={audit:'MARKET_CALENDAR_R49_CORE_WRAPPER_SHAPE_READ_ONLY',at:new Date().toISOString(),
  decision:'R49_SHAPE_UNAVAILABLE',noSourceWrites:true,providerCalls:0,dbWrites:0,
  schedulerChanges:0,gitChanges:0,published:false};
 try{
  const xml=getTaskXml();
  if(typeof xml!=='string'||xml.length>262144)throw Error('TASK_XML_INVALID');
  const fields=[...xml.matchAll(/<Arguments(?:\s+[^>]*)?>([\s\S]*?)<\/Arguments>/gi)];
  if(fields.length!==1){output.decision='R49_TASK_ARGUMENT_AMBIGUOUS';return output;}
  const args=fields[0][1].replace(/&quot;|&#34;/gi,'"').replace(/&amp;/gi,'&');
  const wrappers=[...args.matchAll(/"([^"\r\n]+\.vbs)"/gi)];
  if(wrappers.length!==1){output.decision='R49_WRAPPER_AMBIGUOUS';return output;}
  const file=abs(wrappers[0][1]);
  const stat=fs.statSync(file);
  if(!stat.isFile()||stat.size<1||stat.size>65536){output.decision='R49_WRAPPER_SIZE_INVALID';return output;}
  const body=readWrapper(file,'utf8');
  if(typeof body!=='string')throw Error('INVALID_BODY');
  Object.assign(output,anonymizeR49Vbs(body));
  output.decision='R49_ANONYMIZED_WRAPPER_SHAPE_READY';
  return output;
 }catch{output.decision='R49_WRAPPER_READ_FAILED';return output;}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=diagnoseR49WrapperShape();console.log(JSON.stringify(result));
 if(result.decision!=='R49_ANONYMIZED_WRAPPER_SHAPE_READY')process.exitCode=2;
}
