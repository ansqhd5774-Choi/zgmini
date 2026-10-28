// Single-file, SHA-pinned PC repair for the R47 NY closed-session cutoff.
// Replaces only the already-installed R47 private bundle; keeps an exact
// recoverable backup and preserves all data, formulas and scheduled tasks.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const oldBundleSha='2133e5d4e625762340e715ecd21e809f274713c030e904e3e3f314dc3b6a0729';
const oldPlannerSha='d856e435648656450a4f2c946dea0d88d6d2ff915f8952916763bc959a29bf98';
const sha=b=>createHash('sha256').update(b).digest('hex');
const planner=fs.readFileSync(path.join(here,'theme-nine-r47-recurring-private-refresh.mjs'));
const newBundle=fs.readFileSync(path.join(here,'THEME_NINE_R47_RECURRING_PRIVATE_UPDATE.cmd'));
const newBundleSha=sha(newBundle),newPlannerSha=sha(planner);
const original=fs.readFileSync(path.join(here,'THEME_NINE_R49_ONE_CLICK_PRIVATE_AUTO_INSTALL.cmd'),'ascii');
if(!original.includes(`R47|THEME_NINE_R47_RECURRING_PRIVATE_UPDATE.cmd|${oldBundleSha}`))
  throw Error('R49_APPROVED_R47_SHA_CHANGED');
if(newBundleSha===oldBundleSha||!newBundle.toString('ascii').includes(newPlannerSha))
  throw Error('R47_NEW_BUNDLE_NOT_REGENERATED');

const js=[
  "const fs=require('node:fs')",
  "const cr=require('node:crypto')",
  "const h=b=>cr.createHash('sha256').update(b).digest('hex')",
  "const p=process.env.R57_TARGET",
  "const src=fs.readFileSync(process.env.R57_SELF,'ascii')",
  "const marker='::R57_PLANNER_BEGIN'",
  "const s=src.lastIndexOf(marker)",
  "const e=src.indexOf('::R57_PLANNER_END',s+marker.length)",
  "if(s<0||e<0)throw Error('R57_EMBEDDED_PLANNER_MISSING')",
  "const newPlanner=Buffer.from(src.slice(s+marker.length,e).replace(/[^A-Za-z0-9+/=]/g,''),'base64')",
  `if(h(newPlanner)!=='${newPlannerSha}')throw Error('R57_PLANNER_SHA_MISMATCH')`,
  "if(!fs.existsSync(p)||!fs.statSync(p).isFile())throw Error('R57_INSTALLED_R47_NOT_FOUND')",
  "const current=fs.readFileSync(p)",
  `if(h(current)==='${newBundleSha}'){console.log('R57_ALREADY_INSTALLED_SHA_VERIFIED');process.exit(0)}`,
  `if(h(current)!=='${oldBundleSha}')throw Error('R57_UNKNOWN_INSTALLED_R47_SHA_STOP')`,
  "if(fs.existsSync('E:/ZGmini/data/themes/legacy-nine-r35-delta/state/delta.lock'))throw Error('R57_R47_COLLECTION_LOCK_ACTIVE')",
  "const old=current.toString('ascii')",
  "const a='::R47_PLANNER_BEGIN\\r\\n'",
  "const z='\\r\\n::R47_PLANNER_END'",
  "const i=old.indexOf(a)",
  "const j=old.indexOf(z,i+a.length)",
  "if(i<0||j<0)throw Error('R57_OLD_SEGMENT_MISSING')",
  "const b64=newPlanner.toString('base64').match(/.{1,128}/g).map(v=>'::'+v).join('\\r\\n')",
  "let next=old.slice(0,i+a.length)+b64+old.slice(j)",
  `if(next.split('${oldPlannerSha}').length!==2)throw Error('R57_OLD_PLANNER_HASH_NOT_UNIQUE')`,
  `next=next.replace('${oldPlannerSha}','${newPlannerSha}')`,
  "const bytes=Buffer.from(next,'ascii')",
  `if(h(bytes)!=='${newBundleSha}')throw Error('R57_NEW_BUNDLE_RECONSTRUCTION_SHA')`,
  "const backup=p+'.R57_BACKUP'",
  "const staged=p+'.R57_NEW'",
  "if(fs.existsSync(backup)||fs.existsSync(staged))throw Error('R57_PREVIOUS_REPAIR_ARTIFACT_EXISTS')",
  "fs.writeFileSync(staged,bytes,{flag:'wx'})",
  "if(h(fs.readFileSync(staged))!==h(bytes))throw Error('R57_STAGE_READBACK')",
  "fs.renameSync(p,backup)",
  "try{fs.renameSync(staged,p);if(h(fs.readFileSync(p))!==h(bytes))throw Error('R57_REPLACEMENT_READBACK')}catch(error){if(!fs.existsSync(p))fs.renameSync(backup,p);throw error}",
  "console.log('RESULT=R57_R47_PLANNER_UPGRADED_SHA_VERIFIED')",
  "console.log('BACKUP_FILE='+backup)",
  "console.log('NEW_R47_SHA256='+h(fs.readFileSync(p)))"
].join(';');
if(js.includes('"')||js.length>=7500)throw Error('R57_JS_TOO_LONG');
const lines=[
 '@echo off',
 'setlocal EnableExtensions DisableDelayedExpansion',
 'rem R57: repair only R47 private NY closed-session cutoff. No new formula.',
 'rem Preserve a complete R47 backup; do not change any scheduled task or D1.',
 'set "R57_SELF=%~f0"',
 'set "R57_NODE=E:\\ZGmini\\runtime\\node.exe"',
 'set "R57_TARGET=E:\\ZGmini\\data\\pc-writer\\theme-nine-r48\\THEME_NINE_R47_RECURRING_PRIVATE_UPDATE.cmd"',
 'set "R57_REPORT=%~dp0THEME_NINE_R57_CLOSED_NY_FIX_RESULT_%RANDOM%_%RANDOM%.txt"',
 'if exist "%R57_REPORT%" goto :collision',
 '>"%R57_REPORT%" echo REPORT=THEME_NINE_R57_CLOSED_NY_REPAIR',
 '>>"%R57_REPORT%" echo FORMULA_ROSTER_DB_TASK_WRITES=0',
 'if not exist "%R57_NODE%" goto :missing',
 'if not exist "%R57_TARGET%" goto :missing',
 `"%R57_NODE%" -e "${js}" >>"%R57_REPORT%" 2>&1`,
 'if errorlevel 1 goto :stop',
 '>>"%R57_REPORT%" echo STATUS=INSTALLED_AWAIT_REAL_DATA_AND_EXISTING_R48_R54_CYCLE',
 'set "R57_EXIT=0"',
 'goto :done',
 ':missing',
 '>>"%R57_REPORT%" echo RESULT=STOP_APPROVED_PC_PATH_MISSING',
 'set "R57_EXIT=2"',
 'goto :done',
 ':stop',
 '>>"%R57_REPORT%" echo RESULT=STOP_REPAIR_GATE_CHECK_DETAILS',
 'set "R57_EXIT=3"',
 'goto :done',
 ':collision',
 'echo RESULT=STOP_LOG_NAME_COLLISION',
 'pause',
 'exit /b 4',
 ':done',
 'type "%R57_REPORT%"',
 'echo RESULT_FILE=%R57_REPORT%',
 'pause',
 'exit /b %R57_EXIT%',
 '::R57_PLANNER_BEGIN',
 ...planner.toString('base64').match(/.{1,128}/g).map(line=>'::'+line),
 '::R57_PLANNER_END'
];
const output=lines.join('\r\n')+'\r\n';
if(/[^\x00-\x7f]/.test(output)||/(?<!\r)\n/.test(output))throw Error('R57_CMD_ASCII_CRLF');
const target=path.join(here,'THEME_NINE_R57_CLOSED_NY_FIX.cmd');
fs.writeFileSync(target,output);
console.log(JSON.stringify({file:path.basename(target),bytes:Buffer.byteLength(output),
  oldBundleSha,newBundleSha,oldPlannerSha,newPlannerSha,jsLength:js.length,
  formulaChanged:false,scheduleChanged:false,d1Writes:0}));
