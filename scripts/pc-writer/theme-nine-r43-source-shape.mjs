// R43: offline, read-only PC source shape export for the already-audited 13-ETF path.
// IMPORTANT: never copy raw PC source, comments, literal values or environment keys.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const SOURCE_DIR = 'E:\\ZGmini\\data\\theme-market-history-r131\\marketparquet-r167';
export const APPROVED_FILES = Object.freeze([
  {name:'r181-primary.mjs',sha256:'da433fe2febea455343b66424b2b6e9d6680575f21f2552fc0be8d3bd95aa5c9',bytes:4328},
  {name:'r171-core.mjs',sha256:'9133c68549eb2a235a28dba2ccd4ba832968c1a6819f86dd05a183072b1f7480',bytes:7796},
]);
const STOP_CODES = new Set(['R43_NODE_USAGE','R43_SOURCE_ROOT','R43_SOURCE_FILE','R43_SOURCE_IDENTITY','R43_SOURCE_SIZE','R43_SOURCE_SHA','R43_OUTPUT_WRITE']);
const PRIVATE_IDENTIFIER=/(?:api.?key|secret|token|password|passwd|credential|authorization|bearer|private.?key|client.?id|client.?secret|session.?id|account.?id|user.?id|email|webhook|auth.?url)/i;
const IDENT_START=/[A-Za-z_$]/;
const IDENT_REST=/[A-Za-z0-9_$]/;

function isRegexOpening(pre,previousWord){
  return pre===''||/[=(:,[!&|?{};]/.test(pre)||
    ['return','throw','case','yield','await','delete','typeof','void','in','of','instanceof'].includes(previousWord);
}

// Conservative JS lexer. It removes literal values, comments and regex bodies;
// masked output is for understanding function boundaries, NOT executable source.
export function redactSourceStructure(source){
  let result='',i=0,previousSignificant='',previousWord='';
  const length=source.length;
  const preserveNewlines=(part)=>part.replace(/[^\r\n]/g,'');
  while(i<length){
    const c=source[i],next=source[i+1];
    if(c==='/'&&next==='/'){
      const start=i; i+=2; while(i<length&&source[i]!=='\n')i++;
      result+=preserveNewlines(source.slice(start,i));continue;
    }
    if(c==='/'&&next==='*'){
      const start=i;i+=2;
      while(i<length&&!(source[i]==='*'&&source[i+1]==='/'))i++;
      i=Math.min(length,i+2);
      result+=preserveNewlines(source.slice(start,i));continue;
    }
    if(c==='\''||c==='"'||c==='`'){
      const start=i,quote=c;i++;
      while(i<length){
        if(source[i]==='\\'){i=Math.min(i+2,length);continue;}
        if(source[i]===quote){i++;break;}
        i++;
      }
      result+="'[LITERAL_REDACTED]'"+preserveNewlines(source.slice(start,i));
      previousSignificant='v';previousWord='';continue;
    }
    if(c==='/'&&isRegexOpening(previousSignificant,previousWord)){
      let end=i+1,inClass=false,closed=false;
      while(end<length&&source[end]!=='\r'&&source[end]!=='\n'){
        const x=source[end];
        if(x==='\\'){end+=2;continue;}
        if(x==='[')inClass=true;
        else if(x===']')inClass=false;
        else if(x==='/'&&!inClass){closed=true;end++;break;}
        end++;
      }
      if(closed){
        while(end<length&&/[a-z]/i.test(source[end]))end++;
        result+='/[REGEXP_REDACTED]/';i=end;previousSignificant='v';previousWord='';continue;
      }
    }
    if(IDENT_START.test(c)){
      const start=i;i++;while(i<length&&IDENT_REST.test(source[i]))i++;
      const token=source.slice(start,i);
      result+=PRIVATE_IDENTIFIER.test(token)?'REDACTED_IDENTIFIER':token;
      previousSignificant='v';previousWord=token;continue;
    }
    if(/[0-9]/.test(c)){
      const part=source.slice(i).match(/^(?:0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d[\d_]*)?n?)/);
      if(part){result+='0';i+=part[0].length;previousSignificant='v';previousWord='';continue;}
    }
    result+=c;i++;
    if(!/\s/.test(c)){
      previousSignificant=c;
      if(!/[.]/.test(c))previousWord='';
    }
  }
  return result
    .replace(/\bprocess\s*\.\s*env\s*\.\s*[A-Za-z_$][\w$]*/g,'process.env.REDACTED_IDENTIFIER')
    .split(/\r?\n/)
    .map((line,index)=>line.trim()?`L${String(index+1).padStart(4,'0')} ${line}`:null)
    .filter(Boolean).join('\n');
}

export function buildReport({files,readFile=fs.readFileSync,lstat=fs.lstatSync,realpath=fs.realpathSync,root=SOURCE_DIR}){
  const resolvedRoot=realpath(root);
  const records=[];
  for(const file of files){
    if(!APPROVED_FILES.some(x=>x.name===file.name&&x.sha256===file.sha256))throw Object.assign(new Error('R43_SOURCE_IDENTITY'),{code:'R43_SOURCE_IDENTITY'});
    const sourcePath=path.join(root,file.name);
    const stat=lstat(sourcePath);
    if(!stat.isFile()||stat.isSymbolicLink())throw Object.assign(new Error('R43_SOURCE_FILE'),{code:'R43_SOURCE_FILE'});
    const resolved=realpath(sourcePath);
    if(path.dirname(resolved).toLowerCase()!==resolvedRoot.toLowerCase())throw Object.assign(new Error('R43_SOURCE_ROOT'),{code:'R43_SOURCE_ROOT'});
    if(stat.size!==file.bytes||stat.size>32768)throw Object.assign(new Error('R43_SOURCE_SIZE'),{code:'R43_SOURCE_SIZE'});
    const data=readFile(sourcePath);
    const actual=crypto.createHash('sha256').update(data).digest('hex');
    if(actual!==file.sha256)throw Object.assign(new Error('R43_SOURCE_SHA'),{code:'R43_SOURCE_SHA'});
    records.push({file:file.name,bytes:data.byteLength,sha256:actual,shape:redactSourceStructure(data.toString('utf8'))});
  }
  return records;
}

function main(){
  let status='REDACTED_SOURCE_SHAPE_CREATED_MANUAL_REVIEW_REQUIRED';
  let records=[];
  try{
    if(process.argv.length!==3||process.argv[2]!=='--inspect')throw Object.assign(new Error('R43_NODE_USAGE'),{code:'R43_NODE_USAGE'});
    records=buildReport({files:APPROVED_FILES});
  }catch(e){status=`STOP_${STOP_CODES.has(e.code)?e.code:'R43_SOURCE_FILE'}`;}
  const body=[
    'REPORT=THEME_NINE_R43_SOURCE_SHAPE',
    'CONTRACT=R43_PC_SOURCE_STRUCTURAL_REDACTION_V1',
    `STATUS=${status}`,
    'RAW_SOURCE_CONTENT_EXPORTED=NO',
    'COMMENT_ORIGINAL_EXPORTED=NO',
    'STRING_OR_NUMBER_LITERAL_VALUES_EXPORTED=NO',
    'RUNTIME_OR_API_CALLS=0',
    'PC_SOURCE_DB_D1_SCHEDULER_WRITES=0',
    'NOTICE=MASKED_TEXT_IS_NOT_EXECUTABLE_CODE_AND_MUST_BE_REVIEWED_BEFORE_SHARING',
  ];
  for(const record of records){
    body.push(`BEGIN_REDACTED_MODULE=${record.file}`);
    body.push(`MODULE_SHA256=${record.sha256}`);
    body.push(`MODULE_BYTES=${record.bytes}`);
    body.push(record.shape);
    body.push(`END_REDACTED_MODULE=${record.file}`);
  }
  const output=`THEME_NINE_R43_SOURCE_SHAPE_RESULT_${new Date().toISOString().replace(/\D/g,'').slice(0,14)}_${process.pid}.txt`;
  try{fs.writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)),output),body.join('\r\n')+'\r\n',{flag:'wx',encoding:'utf8'});}
  catch(e){process.stderr.write('STOP_R43_OUTPUT_WRITE\n');process.exitCode=1;return;}
  process.stdout.write(`STATUS=${status}\nRESULT_FILE=${output}\n`);
  if(status.startsWith('STOP_'))process.exitCode=1;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
