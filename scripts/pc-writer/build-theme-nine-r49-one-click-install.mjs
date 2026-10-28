// Build a self-contained SHA-checked Windows installer for the existing
// nine-theme R47 collection -> R48 private candidate recurring pipeline.
// The generated CMD never starts a provider collection or publishes to D1.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const dest=path.join(here,'THEME_NINE_R49_ONE_CLICK_PRIVATE_AUTO_INSTALL.cmd');
const sources=[
  ['R47','THEME_NINE_R47_RECURRING_PRIVATE_UPDATE.cmd',here],
  ['CYCLE','THEME_NINE_R48_PRIVATE_CYCLE.cmd',here],
  ['BRIDGE','theme-nine-r48-r47-bridge.mjs',here],
  ['STAGE','theme-nine-r48-stage-current.mjs',here],
  ['SCHEDULE','theme-nine-r48-private-schedule.mjs',here],
  ['ROSTER','theme-nine-r20-approved-candidates.json',path.resolve(here,'../../config')],
  ['AUM','theme-nine-r26-official-aum-evidence.json',path.resolve(here,'../../config')]
];
const hash=b=>createHash('sha256').update(b).digest('hex');
const bundled=sources.map(([key,name,dir])=>({key,name,bytes:fs.readFileSync(
  path.join(dir,name))})).map(v=>({...v,sha256:hash(v.bytes)}));

// All seven blocks are checked before any target is created. Existing bytes
// must match exactly; no overwrite, removal or migration of user files.
const instructions=[
  "const fs=require('node:fs')",
  "const p=require('node:path')",
  "const cr=require('node:crypto')",
  "const s=fs.readFileSync(process.env.R49_SELF,'ascii')",
  "const root=process.env.R49_INSTALL",
  "const sha=b=>cr.createHash('sha256').update(b).digest('hex')",
  `const specs=[${bundled.map(v=>`'${v.key}|${v.name}|${v.sha256}'`).join(',')}]`,
  "const parsed=specs.map(v=>{const [k,n,h]=v.split('|');const a='::R49_'+k+'_BEGIN',z='::R49_'+k+'_END';const i=s.lastIndexOf(a),j=s.indexOf(z,i+a.length);if(i<0||j<0)throw Error('BUNDLE_SECTION_MISSING_'+k);const b=Buffer.from(s.slice(i+a.length,j).replace(/[^A-Za-z0-9+/=]/g,''),'base64');if(sha(b)!==h)throw Error('BUNDLE_SHA_MISMATCH_'+k);return {n,b,h}})",
  "for(const v of parsed){const target=p.join(root,v.n);if(fs.existsSync(target)){if(!fs.statSync(target).isFile()||sha(fs.readFileSync(target))!==v.h)throw Error('EXISTING_FILE_CONFLICT_'+v.n)}}",
  "for(const v of parsed){const target=p.join(root,v.n);if(!fs.existsSync(target))fs.writeFileSync(target,v.b,{flag:'wx'})}",
  "console.log('BUNDLE_SHA_VERIFIED=YES')",
  "console.log('FILES_INSTALLED_OR_VERIFIED='+parsed.length+'/'+parsed.length)"
];
const extractor=instructions.join(';');
if(extractor.includes('"')||extractor.length>=7500)
  throw Error('R49_EXTRACTOR_TOO_LONG_OR_UNSAFE');

const lines=[
  '@echo off',
  'setlocal EnableExtensions DisableDelayedExpansion',
  'rem Existing nine themes: install R47 + R48 PRIVATE automation only.',
  'rem One-time install; no forced 64-GET run; no D1/publication writes.',
  'rem Preserves all existing scheduled tasks; no forced task overwrite.',
  'set "R49_SELF=%~f0"',
  'set "R49_INSTALL=E:\\ZGmini\\data\\pc-writer\\theme-nine-r48"',
  'set "R49_NODE=E:\\ZGmini\\runtime\\node.exe"',
  'set "R49_REPORT=%~dp0THEME_NINE_R49_INSTALL_RESULT_%RANDOM%_%RANDOM%.txt"',
  'if exist "%R49_REPORT%" goto :collision',
  '>"%R49_REPORT%" echo REPORT=THEME_NINE_R49_ONE_CLICK_PRIVATE_AUTO_INSTALL',
  '>>"%R49_REPORT%" echo SOURCE=R47_RECURRING_TO_R48_PRIVATE_STAGE',
  '>>"%R49_REPORT%" echo INSTALL_PATH=%R49_INSTALL%',
  '>>"%R49_REPORT%" echo D1_WRITES=0',
  '>>"%R49_REPORT%" echo PUBLICATION_WRITES=0',
  '>>"%R49_REPORT%" echo EXISTING_OPERATING_TASKS_CHANGED=0',
  '>>"%R49_REPORT%" echo FULL_PROVIDER_COLLECTION_DURING_INSTALL=NO',
  'if not exist "E:\\ZGmini\\data\\" goto :missing_data',
  'if not exist "%R49_NODE%" goto :missing_node',
  '"%R49_NODE%" --version >>"%R49_REPORT%" 2>&1',
  'if errorlevel 1 goto :missing_node',
  'if not exist "%R49_INSTALL%\\" mkdir "%R49_INSTALL%" >>"%R49_REPORT%" 2>&1',
  'if errorlevel 1 goto :mkdir_error',
  `"%R49_NODE%" -e "${extractor}" >>"%R49_REPORT%" 2>&1`,
  'if errorlevel 1 goto :extract_error',
  '>>"%R49_REPORT%" echo TASK_INSTALL_ATTEMPT=YES',
  '"%R49_NODE%" "%R49_INSTALL%\\theme-nine-r48-private-schedule.mjs" --install >>"%R49_REPORT%" 2>&1',
  'if errorlevel 1 goto :schedule_error',
  '>>"%R49_REPORT%" echo TASK_INSTALL_COMMAND=SUCCESS_CHECK_TASK_STATUS_ABOVE',
  '>>"%R49_REPORT%" echo R48_STAGE_EXISTING_ATTEMPT=YES',
  'set "ZGMINI_R48_CONFIG_DIR=%R49_INSTALL%"',
  '"%R49_NODE%" "%R49_INSTALL%\\theme-nine-r48-stage-current.mjs" --stage-private >>"%R49_REPORT%" 2>&1',
  'if errorlevel 1 goto :stage_pending',
  '>>"%R49_REPORT%" echo R48_STAGE_EXISTING_STATUS=SUCCESS_PRIVATE_ONLY',
  '>>"%R49_REPORT%" echo STATUS=INSTALL_COMPLETED_TASK_COMMAND_SUCCESS_STAGE_SUCCESS',
  'set "R49_EXIT=0"',
  'goto :done',
  ':stage_pending',
  '>>"%R49_REPORT%" echo R48_STAGE_EXISTING_STATUS=PENDING_REVIEW',
  '>>"%R49_REPORT%" echo STATUS=INSTALL_COMPLETED_TASK_COMMAND_SUCCESS_STAGE_PENDING',
  'set "R49_EXIT=0"',
  'goto :done',
  ':missing_data',
  '>>"%R49_REPORT%" echo STATUS=STOP_EXPECTED_E_DATA_ROOT_MISSING',
  'set "R49_EXIT=2"',
  'goto :done',
  ':missing_node',
  '>>"%R49_REPORT%" echo STATUS=STOP_EXPECTED_PC_NODE_MISSING',
  'set "R49_EXIT=2"',
  'goto :done',
  ':mkdir_error',
  '>>"%R49_REPORT%" echo STATUS=STOP_INSTALL_DIRECTORY_CREATE_FAILED',
  'set "R49_EXIT=3"',
  'goto :done',
  ':extract_error',
  '>>"%R49_REPORT%" echo STATUS=STOP_BUNDLE_SHA_OR_TARGET_CONFLICT',
  'set "R49_EXIT=4"',
  'goto :done',
  ':schedule_error',
  '>>"%R49_REPORT%" echo STATUS=STOP_SCHEDULE_COMMAND_FAILED',
  'set "R49_EXIT=5"',
  'goto :done',
  ':collision',
  'echo STATUS=STOP_R49_REPORT_FILE_COLLISION_RETRY',
  'exit /b 2',
  ':done',
  'type "%R49_REPORT%"',
  'echo RESULT_FILE=%R49_REPORT%',
  'exit /b %R49_EXIT%'
];

for(const v of bundled){
  lines.push(`::R49_${v.key}_BEGIN`);
  lines.push(...v.bytes.toString('base64').match(/.{1,128}/g).map(line=>'::'+line));
  lines.push(`::R49_${v.key}_END`);
}
const contents=lines.join('\r\n')+'\r\n';
if(/[^\x00-\x7f]/.test(contents)||/(?<!\r)\n/.test(contents))
  throw Error('R49_INSTALLER_NOT_ASCII_CRLF');
fs.writeFileSync(dest,contents);
process.stdout.write(JSON.stringify({file:dest,bytes:Buffer.byteLength(contents),
  extractorCharacters:extractor.length,files:bundled.map(v=>({
    name:v.name,sha256:v.sha256})),providerGetsDuringInstall:0,
  publicWrites:0,existingTaskOverwrites:0})+'\n');
