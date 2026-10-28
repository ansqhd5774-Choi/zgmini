// Upgrade only the R51 private provisional-date sidecars already installed by
// R52. Keep R47/R48 collector, R50 scheduler, formula and D1 untouched.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const dest=path.join(here,'THEME_NINE_R53_PROVISIONAL_HISTORY_CONNECT.cmd');
const hash=b=>createHash('sha256').update(b).digest('hex');
const previous={
  R51:'4a0bb3f61fcc6e106e283ba4469d4281d2931b5668a6e228b7a9db7ea7aab3c1',
  R51STAGE:'582c876d04f6ed91d7a935d5f70408ba5255036f00102a30a52622a9671eec73',
};
const stageR52='1305b1c3e84891b3cde287645eefc45a57f483905171a609ebb4721321faeaba';
const sources=[
  ['R51','theme-nine-r51-provisional-overlay.mjs'],
  ['R51STAGE','theme-nine-r51-stage-current.mjs'],
].map(([key,name])=>({key,name,bytes:fs.readFileSync(path.join(here,name))}));
const bundle=sources.map(v=>({...v,sha256:hash(v.bytes)}));
const statements=[
  "const fs=require('node:fs')",
  "const p=require('node:path')",
  "const cr=require('node:crypto')",
  "const self=fs.readFileSync(process.env.R53_SELF,'ascii')",
  "const root=process.env.R53_INSTALL",
  "const sha=b=>cr.createHash('sha256').update(b).digest('hex')",
  `const specs=[${bundle.map(v=>`'${v.key}|${v.name}|${previous[v.key]}|${v.sha256}'`).join(',')}]`,
  "const blocks=specs.map(spec=>{const [k,n,old,h]=spec.split('|');const a='::R53_'+k+'_BEGIN',z='::R53_'+k+'_END',i=self.lastIndexOf(a),j=self.indexOf(z,i+a.length);if(i<0||j<0)throw Error('R53_SECTION_MISSING_'+k);const b=Buffer.from(self.slice(i+a.length,j).replace(/[^A-Za-z0-9+/=]/g,''),'base64');if(sha(b)!==h)throw Error('R53_BUNDLE_SHA_'+k);return {k,n,old,h,b}})",
  `const r48=p.join(root,'theme-nine-r48-stage-current.mjs');if(!fs.existsSync(r48)||sha(fs.readFileSync(r48))!=='${stageR52}')throw Error('R52_STAGE_NOT_APPROVED')`,
  "for(const x of blocks){const f=p.join(root,x.n),backup=f+'.R52.BAK';if(!fs.existsSync(f)||!fs.statSync(f).isFile())throw Error('R51_NOT_INSTALLED_'+x.k);const current=sha(fs.readFileSync(f));if(current!==x.old&&current!==x.h)throw Error('R51_USER_CHANGED_STOP_'+x.k);if(fs.existsSync(backup)&&sha(fs.readFileSync(backup))!==x.old)throw Error('R52_BACKUP_CONFLICT_'+x.k);if(current===x.h&&!fs.existsSync(backup))throw Error('R52_BACKUP_MISSING_'+x.k)}",
  "for(const x of blocks){const f=p.join(root,x.n),backup=f+'.R52.BAK';if(sha(fs.readFileSync(f))===x.h)continue;if(!fs.existsSync(backup))fs.copyFileSync(f,backup,fs.constants.COPYFILE_EXCL);const temp=f+'.R53_PENDING';if(fs.existsSync(temp))throw Error('R53_TEMP_ALREADY_EXISTS_'+x.k);fs.writeFileSync(temp,x.b,{flag:'wx'});if(sha(fs.readFileSync(f))!==x.old)throw Error('R51_CHANGED_DURING_INSTALL_'+x.k);fs.renameSync(temp,f)}",
  "for(const x of blocks){if(sha(fs.readFileSync(p.join(root,x.n)))!==x.h)throw Error('R53_READBACK_SHA_'+x.k)}",
  "console.log('R53_BUNDLE_SHA_VERIFIED=2/2')",
  "console.log('R52_SIDECAR_BACKUPS_PRESERVED=YES')",
  "console.log('LATER_R48_HISTORICAL_SCORE_REUSE=YES')",
  "console.log('TASK_R47_R48_FORMULA_D1_CHANGED=NO')",
];
const extractor=statements.join(';');
if(extractor.includes('"')||extractor.length>=7500)throw Error('R53_EXTRACTOR_UNSAFE');

const lines=[
  '@echo off',
  'setlocal EnableExtensions DisableDelayedExpansion',
  'rem R53: use existing later R48 252-session score for a public provisional date.',
  'rem No new score calculation, provider GET, task write, D1 write or publication.',
  'set "R53_SELF=%~f0"',
  'set "R53_INSTALL=E:\\ZGmini\\data\\pc-writer\\theme-nine-r48"',
  'set "R53_NODE=E:\\ZGmini\\runtime\\node.exe"',
  'set "R53_LOG=%~dp0THEME_NINE_R53_PROVISIONAL_HISTORY_CONNECT_RESULT_%RANDOM%_%RANDOM%.txt"',
  'if exist "%R53_LOG%" goto :collision',
  '>"%R53_LOG%" echo REPORT=THEME_NINE_R53_PROVISIONAL_HISTORY_CONNECT',
  '>>"%R53_LOG%" echo EXISTING_TASK_CHANGED=NO',
  '>>"%R53_LOG%" echo EXISTING_FORMULA_CHANGED=NO',
  '>>"%R53_LOG%" echo D1_WRITES=0',
  '>>"%R53_LOG%" echo PUBLICATION_WRITES=0',
  '>>"%R53_LOG%" echo RAW_PROVIDER_GETS=0',
  'if not exist "%R53_INSTALL%\\" goto :missing',
  'if not exist "%R53_NODE%" goto :missing',
  `"%R53_NODE%" -e "${extractor}" >>"%R53_LOG%" 2>&1`,
  'if errorlevel 1 goto :install_failed',
  '>>"%R53_LOG%" echo R51_STAGING_ATTEMPT=YES',
  'set "ZGMINI_R48_CONFIG_DIR=%R53_INSTALL%"',
  '"%R53_NODE%" "%R53_INSTALL%\\theme-nine-r48-stage-current.mjs" --stage-private >>"%R53_LOG%" 2>&1',
  'if errorlevel 1 goto :stage_failed',
  '>>"%R53_LOG%" echo STATUS=R53_INSTALLED_INSPECT_PROVISIONAL_SUBSTATUS',
  'set "R53_EXIT=0"',
  'goto :done',
  ':missing',
  '>>"%R53_LOG%" echo STATUS=STOP_EXPECTED_R52_PC_NODE_OR_FOLDER_MISSING',
  'set "R53_EXIT=2"',
  'goto :done',
  ':install_failed',
  '>>"%R53_LOG%" echo STATUS=STOP_R53_SHA_OR_USER_FILE_CONFLICT',
  'set "R53_EXIT=3"',
  'goto :done',
  ':stage_failed',
  '>>"%R53_LOG%" echo STATUS=R53_INSTALLED_R48_PRIVATE_STAGE_PENDING',
  'set "R53_EXIT=4"',
  'goto :done',
  ':collision',
  'echo STATUS=STOP_R53_RESULT_FILE_COLLISION_RETRY',
  'exit /b 2',
  ':done',
  'type "%R53_LOG%"',
  'echo RESULT_FILE=%R53_LOG%',
  'exit /b %R53_EXIT%',
];
for(const v of bundle){
  lines.push(`::R53_${v.key}_BEGIN`);
  lines.push(...v.bytes.toString('base64').match(/.{1,128}/g).map(s=>'::'+s));
  lines.push(`::R53_${v.key}_END`);
}
const contents=lines.join('\r\n')+'\r\n';
if(/[^\x00-\x7f]/.test(contents)||/(?<!\r)\n/.test(contents))
  throw Error('R53_NOT_ASCII_CRLF');
fs.writeFileSync(dest,contents);
process.stdout.write(JSON.stringify({file:dest,bytes:Buffer.byteLength(contents),
  extractorCharacters:extractor.length,bundle:bundle.map(x=>({name:x.name,sha256:x.sha256})),
  providerGets:0,d1Writes:0,taskWrites:0})+'\n');
