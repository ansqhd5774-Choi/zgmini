// Build a SHA-checked single-file Windows CMD for the previously approved
// nine-theme private R23+R35 -> existing R25 -> existing R32 execution path.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const dest=path.join(here,'THEME_NINE_R47_RECURRING_PRIVATE_UPDATE.cmd');
const files=[
  ['ENTRY','theme-nine-r47-recurring-private-update.mjs'],
  ['PLANNER','theme-nine-r47-recurring-private-refresh.mjs'],
  ['SCORER','theme-nine-r47-private-score.mjs'],
  ['MIX','theme-nine-r47-private-theme-aggregate.mjs'],
  ['R35','theme-nine-r35-delta-collect.mjs'],
  ['R34','theme-nine-r34-refresh-preflight.mjs'],
  ['R24','theme-nine-r24-session-audit.mjs'],
  ['R25','theme-nine-r25-individual-score.mjs'],
  ['SELECT','theme-nine-r25-approved-selector.mjs'],
  ['R2','theme-optional-adaptive-r2.mjs'],
  ['R32','theme-nine-r32-private-aggregate.mjs'],
  ['R32PRE','theme-nine-r32-readonly-preflight.mjs'],
  ['PAIR','theme-optional-pair-weight-r3.mjs'],
  ['ROSTER','theme-nine-r20-approved-candidates.json'],
  ['AUM','theme-nine-r26-official-aum-evidence.json'],
  ['APPROVAL','theme-nine-r32-dated-aum-approval.json']
];
const sha=b=>createHash('sha256').update(b).digest('hex');
const segments=files.map(([key,name])=>({key,name,bytes:fs.readFileSync(
  ['ROSTER','AUM','APPROVAL'].includes(key)?path.resolve(here,'../../config',name):
    path.join(here,name))})).map(x=>({...x,hash:sha(x.bytes)}));
const js=[
  "const fs=require('node:fs')",
  "const cr=require('node:crypto')",
  "const p=require('node:path')",
  "const s=fs.readFileSync(process.env.R47_SELF,'ascii')",
  "const h=b=>cr.createHash('sha256').update(b).digest('hex')",
  "const section=n=>{const a='::R47_'+n+'_BEGIN',z='::R47_'+n+'_END';const i=s.lastIndexOf(a),j=s.indexOf(z,i+a.length);if(i<0||j<0)throw Error('BUNDLE_SECTION_MISSING_'+n);return Buffer.from(s.slice(i+a.length,j).replace(/[^A-Za-z0-9+/=]/g,''),'base64')}"
];
for(const x of segments)js.push(`{const b=section('${x.key}');if(h(b)!=='${x.hash}')throw Error('BUNDLE_SHA_MISMATCH_${x.key}');fs.writeFileSync(p.join(process.env.R47_STAGE,'${x.name}'),b,{flag:'wx'})}`);
js.push("console.log('BUNDLE_SHA_VERIFIED=YES')");
const extractor=js.join(';');
if(extractor.includes('"')||extractor.length>=7500)throw Error('R47_EXTRACTOR_TOO_LONG');

const lines=[
  '@echo off',
  'setlocal EnableExtensions DisableDelayedExpansion',
  'rem R47: private existing nine-theme daily 1h update, R23 immutable.',
  'rem Reuses approved R2 individual and R32 weights. No D1, no publication.',
  'rem Does not create, edit or trigger Windows scheduled tasks.',
  'set "R47_SELF=%~f0"',
  'set "R47_STAGE=%~dp0R47_STAGE_%RANDOM%_%RANDOM%"',
  'set "R47_LOG=%~dp0THEME_NINE_R47_RECURRING_PRIVATE_UPDATE_%RANDOM%_%RANDOM%.txt"',
  'set "R47_JSON=%~dp0THEME_NINE_R47_RECURRING_PRIVATE_UPDATE_%RANDOM%_%RANDOM%.json"',
  'set "R47_NODE=node"',
  'if exist "E:\\ZGmini\\runtime\\node.exe" set "R47_NODE=E:\\ZGmini\\runtime\\node.exe"',
  'if exist "%R47_STAGE%" goto :collision',
  'if exist "%R47_LOG%" goto :collision',
  'if exist "%R47_JSON%" goto :collision',
  'mkdir "%R47_STAGE%"',
  'if errorlevel 1 goto :mkdir_failed',
  '>"%R47_LOG%" echo REPORT=THEME_NINE_R47_RECURRING_PRIVATE_UPDATE',
  '>>"%R47_LOG%" echo R23_D1_EXISTING_TASK_PUBLICATION_WRITES=0',
  '"%R47_NODE%" --version >>"%R47_LOG%" 2>&1',
  'if errorlevel 1 goto :node_failed',
  `"%R47_NODE%" -e "${extractor}" >>"%R47_LOG%" 2>&1`,
  'if errorlevel 1 goto :extract_failed',
  '"%R47_NODE%" "%R47_STAGE%\\theme-nine-r47-recurring-private-update.mjs" --update-private >"%R47_JSON%" 2>>"%R47_LOG%"',
  'set "R47_RC=%ERRORLEVEL%"',
  'if exist "%R47_JSON%" type "%R47_JSON%" >>"%R47_LOG%"',
  'goto :cleanup',
  ':node_failed',
  '>>"%R47_LOG%" echo STATUS=NODE_UNAVAILABLE',
  'set "R47_RC=1"',
  'goto :cleanup',
  ':extract_failed',
  '>>"%R47_LOG%" echo STATUS=EMBEDDED_SHA_OR_EXTRACTION_FAILED',
  'set "R47_RC=1"',
  'goto :cleanup',
  ':mkdir_failed',
  '>"%R47_LOG%" echo STATUS=R47_STAGE_CREATE_FAILED',
  'set "R47_RC=1"',
  'goto :cleanup',
  ':collision',
  'echo STATUS=R47_RESULT_OR_STAGE_NAME_COLLISION',
  'exit /b 2',
  ':cleanup'
];
for(const x of segments)lines.push(`if exist "%R47_STAGE%\\${x.name}" del /q "%R47_STAGE%\\${x.name}"`);
lines.push('if exist "%R47_STAGE%" rmdir "%R47_STAGE%"',
  'type "%R47_LOG%"','exit /b %R47_RC%');
for(const x of segments){
  lines.push(`::R47_${x.key}_BEGIN`);
  lines.push(...x.bytes.toString('base64').match(/.{1,128}/g).map(s=>'::'+s));
  lines.push(`::R47_${x.key}_END`);
}
const contents=lines.join('\r\n')+'\r\n';
if(/[^\x00-\x7F]/.test(contents)||/(?<!\r)\n/.test(contents))
  throw Error('R47_CMD_NOT_ASCII_CRLF');
fs.writeFileSync(dest,contents);
process.stdout.write(JSON.stringify({file:path.basename(dest),bytes:Buffer.byteLength(contents),
  extractorCharacters:extractor.length,
  sources:segments.map(x=>({key:x.key,sha256:x.hash})),
  privateOnly:true,publicWrites:0,taskWrites:0})+'\n');
