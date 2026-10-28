// Build one-file R52 Windows repair/extension for the already installed
// private R49/R50 task. The existing task, R47 collector and formula stay put.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const dest=path.join(here,'THEME_NINE_R52_PROVISIONAL_CONNECT.cmd');
const previousR49StageSha='d3a5afad2adee9c9e14382384b7ba8c87f88e016a8880571d975b7d64010f2ea';
const files=[
 ['STAGE','theme-nine-r48-stage-current.mjs'],
 ['R51','theme-nine-r51-provisional-overlay.mjs'],
 ['R51STAGE','theme-nine-r51-stage-current.mjs']
].map(([key,name])=>({key,name,bytes:fs.readFileSync(path.join(here,name))}));
const hash=b=>createHash('sha256').update(b).digest('hex');
const pieces=files.map(x=>({...x,sha256:hash(x.bytes)}));
const stage=pieces[0];
const instructions=[
  "const fs=require('node:fs')",
  "const p=require('node:path')",
  "const crypto=require('node:crypto')",
  "const s=fs.readFileSync(process.env.R52_SELF,'ascii')",
  "const root=process.env.R52_INSTALL",
  "const sha=b=>crypto.createHash('sha256').update(b).digest('hex')",
  `const specs=[${pieces.map(x=>`'${x.key}|${x.name}|${x.sha256}'`).join(',')}]`,
  "const blocks=specs.map(v=>{const [k,n,h]=v.split('|'),a='::R52_'+k+'_BEGIN',z='::R52_'+k+'_END',i=s.lastIndexOf(a),j=s.indexOf(z,i+a.length);if(i<0||j<0)throw Error('MISSING_SECTION_'+k);const b=Buffer.from(s.slice(i+a.length,j).replace(/[^A-Za-z0-9+/=]/g,''),'base64');if(sha(b)!==h)throw Error('BAD_SHA_'+k);return {n,h,b}})",
  `const old='${previousR49StageSha}',desired='${stage.sha256}'`,
  "const target=p.join(root,blocks[0].n),backup=target+'.R49.BAK'",
  "if(!fs.existsSync(target)||!fs.statSync(target).isFile())throw Error('R49_STAGE_MISSING')",
  "const current=sha(fs.readFileSync(target))",
  "if(current!==old&&current!==desired)throw Error('STAGE_USER_MODIFIED_STOP')",
  "for(const x of blocks.slice(1)){const f=p.join(root,x.n);if(fs.existsSync(f)&&(!fs.statSync(f).isFile()||sha(fs.readFileSync(f))!==x.h))throw Error('R51_EXISTING_FILE_CONFLICT_'+x.n)}",
  "if(fs.existsSync(backup)&&sha(fs.readFileSync(backup))!==old)throw Error('R49_BACKUP_CONFLICT')",
  "if(current===desired&&!fs.existsSync(backup))throw Error('R49_BACKUP_MISSING')",
  "for(const x of blocks.slice(1)){const f=p.join(root,x.n);if(!fs.existsSync(f))fs.writeFileSync(f,x.b,{flag:'wx'})}",
  "if(current===old){if(!fs.existsSync(backup))fs.copyFileSync(target,backup,fs.constants.COPYFILE_EXCL);const temp=target+'.R52_PENDING';if(fs.existsSync(temp))throw Error('R52_TEMP_ALREADY_EXISTS');fs.writeFileSync(temp,blocks[0].b,{flag:'wx'});if(sha(fs.readFileSync(target))!==old)throw Error('R49_STAGE_CHANGED_DURING_INSTALL');fs.renameSync(temp,target)}",
  "if(sha(fs.readFileSync(target))!==desired)throw Error('R52_INSTALL_READBACK_MISMATCH')",
  "console.log('R52_BUNDLE_SHA_VERIFIED=3/3')",
  "console.log('R49_ORIGINAL_STAGE_BACKUP_PRESERVED=YES')",
  "console.log('R51_PROVISIONAL_MODULES_INSTALLED=YES')",
  "console.log('EXISTING_SCHEDULED_TASK_CHANGED=NO')"
];
const extractor=instructions.join(';');
if(extractor.length>=7500||extractor.includes('"'))throw Error('R52_EXTRACTOR_UNSAFE');
const lines=[
 '@echo off',
 'setlocal EnableExtensions DisableDelayedExpansion',
 'rem R52: add R51 provisional score sidecar to the existing R48 daily job.',
 'rem Keep existing task, R47 1h collection, confirmed history, formula and D1 untouched.',
 'set "R52_SELF=%~f0"',
 'set "R52_INSTALL=E:\\ZGmini\\data\\pc-writer\\theme-nine-r48"',
 'set "R52_NODE=E:\\ZGmini\\runtime\\node.exe"',
 'set "R52_LOG=%~dp0THEME_NINE_R52_PROVISIONAL_CONNECT_RESULT_%RANDOM%_%RANDOM%.txt"',
 'if exist "%R52_LOG%" goto :collision',
 '>"%R52_LOG%" echo REPORT=THEME_NINE_R52_PROVISIONAL_CONNECT',
 '>>"%R52_LOG%" echo TASK_CHANGED=NO',
 '>>"%R52_LOG%" echo R47_FORMULA_CHANGED=NO',
 '>>"%R52_LOG%" echo D1_WRITES=0',
 '>>"%R52_LOG%" echo PUBLICATION_WRITES=0',
 '>>"%R52_LOG%" echo RAW_PROVIDER_GETS=0',
 'if not exist "%R52_INSTALL%\\" goto :missing',
 'if not exist "%R52_NODE%" goto :missing',
 'if not exist "%R52_INSTALL%\\THEME_NINE_R48_PRIVATE_CYCLE.cmd" goto :missing',
 `"%R52_NODE%" -e "${extractor}" >>"%R52_LOG%" 2>&1`,
 'if errorlevel 1 goto :install_failed',
 '>>"%R52_LOG%" echo R51_FIRST_STAGING_ATTEMPT=YES',
 'set "ZGMINI_R48_CONFIG_DIR=%R52_INSTALL%"',
 '"%R52_NODE%" "%R52_INSTALL%\\theme-nine-r48-stage-current.mjs" --stage-private >>"%R52_LOG%" 2>&1',
 'if errorlevel 1 goto :stage_failed',
 '>>"%R52_LOG%" echo STATUS=R52_PRIVATE_PROVISIONAL_CONNECTION_INSTALLED_CHECK_R51_SUBSTATUS',
 'set "R52_EXIT=0"',
 'goto :done',
 ':missing',
 '>>"%R52_LOG%" echo STATUS=STOP_R49_OPERATING_FILES_OR_NODE_MISSING',
 'set "R52_EXIT=2"',
 'goto :done',
 ':install_failed',
 '>>"%R52_LOG%" echo STATUS=STOP_R52_SHA_CONFLICT_OR_FILE_INSTALL_ERROR',
 'set "R52_EXIT=3"',
 'goto :done',
 ':stage_failed',
 '>>"%R52_LOG%" echo STATUS=R52_INSTALLED_R48_PRIVATE_STAGE_FAILED',
 'set "R52_EXIT=4"',
 'goto :done',
 ':collision',
 'echo STATUS=STOP_R52_RESULT_COLLISION_RETRY',
 'exit /b 2',
 ':done',
 'type "%R52_LOG%"',
 'echo RESULT_FILE=%R52_LOG%',
 'exit /b %R52_EXIT%'
];
for(const x of pieces){
 lines.push(`::R52_${x.key}_BEGIN`);
 lines.push(...x.bytes.toString('base64').match(/.{1,128}/g).map(s=>'::'+s));
 lines.push(`::R52_${x.key}_END`);
}
const contents=lines.join('\r\n')+'\r\n';
if(/[^\x00-\x7F]/.test(contents)||/(?<!\r)\n/.test(contents))
 throw Error('R52_NOT_ASCII_CRLF');
fs.writeFileSync(dest,contents);
console.log(JSON.stringify({file:dest,bytes:Buffer.byteLength(contents),
 extractorCharacters:extractor.length,previousR49StageSha,
 newR48StageSha:stage.sha256,sidecars:pieces.slice(1).map(x=>x.sha256),
 providerGets:0,d1Writes:0,taskWrites:0}));
