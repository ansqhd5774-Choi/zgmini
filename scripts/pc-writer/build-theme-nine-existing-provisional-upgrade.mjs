// One-click, SHA-pinned upgrade of ONLY four existing R54 source files.
// No task, formula, ETF roster, price source, raw history or D1 change here.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..');
const out=path.join(here,'THEME_NINE_EXISTING_PROVISIONAL_UPGRADE.cmd');
const old=[
 ['scripts/pc-writer/theme-nine-r54-public-connect.mjs',
  '14e82239e8d825f512901ba4aa50cf59ccaefe72924fcb61cf8ea1ee9a184040'],
 ['scripts/pc-writer/theme-nine-r51-stage-current.mjs',
  '270cd12e7fece5ade0f069bcc0d6ae8550d354e82f943e182e1df14920b978c0'],
 ['scripts/pc-writer/theme-nine-r51-provisional-overlay.mjs',
  '0aa430e4bd2c37ea140e20237122df559a83481f7af18b3318f9f1fda5ca6c79'],
 ['worker/theme-nine-r37-public.mjs',
  '1a5ceb5a8cd580bd9f63a5a21950412778e16b3b52b019c6c7ef87abcaf1cc8a'],
];
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const files=old.map(([rel,was],i)=>{
 const bytes=fs.readFileSync(path.join(root,rel));
 return {key:'F'+String(i+1).padStart(2,'0'),rel,was,bytes,now:digest(bytes)};
});
if(files.some(f=>f.was===f.now))throw Error('R54_UPGRADE_EXPECTED_CHANGE_MISSING');

const js=[
 "const fs=require('node:fs')",
 "const p=require('node:path')",
 "const cr=require('node:crypto')",
 "const h=b=>cr.createHash('sha256').update(b).digest('hex')",
 "const root=fs.realpathSync(process.env.R61_INSTALL)",
 "const src=fs.readFileSync(process.env.R61_SELF,'ascii')",
 `const specs=[${files.map(f=>`'${f.key}|${f.rel}|${f.was}|${f.now}'`).join(',')}]`,
 "const parts=specs.map(spec=>{const [key,rel,oldSha,newSha]=spec.split('|'),begin='::R61_'+key+'_BEGIN',end='::R61_'+key+'_END',i=src.lastIndexOf(begin),j=src.indexOf(end,i+begin.length);if(i<0||j<0)throw Error('R61_EMBEDDED_FILE_MISSING_'+rel);const bytes=Buffer.from(src.slice(i+begin.length,j).replace(/[^A-Za-z0-9+/=]/g,''),'base64');if(h(bytes)!==newSha)throw Error('R61_BUNDLE_SHA_'+rel);const file=p.resolve(root,rel);if(!file.startsWith(root+p.sep))throw Error('R61_PATH_ESCAPE_'+rel);if(!fs.existsSync(file)||!fs.statSync(file).isFile()||fs.lstatSync(file).isSymbolicLink())throw Error('R61_INSTALLED_FILE_MISSING_'+rel);const actual=h(fs.readFileSync(file));if(actual!==oldSha&&actual!==newSha)throw Error('R61_UNKNOWN_INSTALLED_SHA_'+rel);const bak=file+'.R61_BACKUP',tmp=file+'.R61_STAGED';if(fs.existsSync(bak)&&h(fs.readFileSync(bak))!==oldSha)throw Error('R61_BACKUP_SHA_CONFLICT_'+rel);if(fs.existsSync(tmp))throw Error('R61_STAGED_FILE_EXISTS_'+rel);if(actual===oldSha&&fs.existsSync(bak))throw Error('R61_BACKUP_EXISTS_BUT_OLD_SOURCE_'+rel);return {rel,file,bak,tmp,oldSha,newSha,bytes,actual}})",
 "for(const a of parts.filter(x=>x.actual===x.oldSha)){fs.writeFileSync(a.tmp,a.bytes,{flag:'wx'});if(h(fs.readFileSync(a.tmp))!==a.newSha)throw Error('R61_STAGING_SHA_'+a.rel)}",
 "for(const a of parts.filter(x=>x.actual===x.oldSha)){fs.renameSync(a.file,a.bak);try{fs.renameSync(a.tmp,a.file);if(h(fs.readFileSync(a.file))!==a.newSha)throw Error('R61_READBACK_SHA_'+a.rel)}catch(e){if(!fs.existsSync(a.file))fs.renameSync(a.bak,a.file);throw e}}",
 "for(const a of parts){if(h(fs.readFileSync(a.file))!==a.newSha)throw Error('R61_FINAL_SHA_'+a.rel);console.log('SOURCE_UPGRADED='+a.rel)}",
 "console.log('RESULT=R61_INSTALLED_FOUR_FILES_SHA_VERIFIED')",
 "console.log('SCORE_FORMULA_ROSTER_PROVISIONAL_VALUES_SCHEDULES_UNCHANGED=YES')",
].join(';');
if(js.includes('"')||js.length>=7500)throw Error('R61_JS_CMD_LENGTH_OR_QUOTES');
const lines=[
 '@echo off',
 'setlocal EnableExtensions DisableDelayedExpansion',
 'rem R61: exact SHA checked upgrade of existing approved nine-theme R54 sources.',
 'rem Original legacy provisional values/dates are read-only; no new formula.',
 'rem Preserve one .R61_BACKUP per changed file. No scheduled task changes.',
 'set "R61_SELF=%~f0"',
 'set "R61_INSTALL=E:\\ZGmini\\data\\pc-writer\\theme-nine-r54"',
 'set "R61_NODE=E:\\ZGmini\\runtime\\node.exe"',
 'set "R61_RUNNER=%R61_INSTALL%\\scripts\\pc-writer\\THEME_NINE_R54_PUBLIC_CYCLE.cmd"',
 'set "R61_LOGDIR=%R61_INSTALL%\\logs"',
 'set "R61_REPORT=%~dp0THEME_NINE_EXISTING_PROVISIONAL_UPGRADE_RESULT_%RANDOM%_%RANDOM%.txt"',
 'if exist "%R61_REPORT%" goto :collision',
 '>"%R61_REPORT%" echo REPORT=R61_EXISTING_PROVISIONAL_PASSTHROUGH_AND_R54_PUBLICATION',
 '>>"%R61_REPORT%" echo STARTED=%DATE% %TIME%',
 '>>"%R61_REPORT%" echo FORMULA_ROSTER_PRICE_SOURCE_SCHEDULE_BRANCH_CHANGES=0',
 'if not exist "%R61_NODE%" goto :missing',
 'if not exist "%R61_RUNNER%" goto :missing',
 `"%R61_NODE%" -e "${js}" >>"%R61_REPORT%" 2>&1`,
 'if errorlevel 1 goto :upgrade_failed',
 '>>"%R61_REPORT%" echo STAGE=EXISTING_R54_PUBLICATION',
 'call "%R61_RUNNER%" >>"%R61_REPORT%" 2>&1',
 'set "R61_R54_EXIT=%ERRORLEVEL%"',
 '>>"%R61_REPORT%" echo R54_EXIT=%R61_R54_EXIT%',
 '>>"%R61_REPORT%" echo STAGE=EXISTING_R54_LATEST_LOG',
 'set "R61_LAST="',
 'if exist "%R61_LOGDIR%\\" for /f "delims=" %%F in (\'dir /b /a:-d /o:-d "%R61_LOGDIR%\\THEME_NINE_R54_CYCLE_*.txt" 2^>nul\') do if not defined R61_LAST set "R61_LAST=%%F"',
 'if defined R61_LAST (type "%R61_LOGDIR%\\%R61_LAST%" >>"%R61_REPORT%" 2>&1) else (>>"%R61_REPORT%" echo R54_LOG_NOT_FOUND)',
 '>>"%R61_REPORT%" echo STAGE=PUBLIC_API_READBACK',
 '"%R61_NODE%" -e "fetch(\'https://zgmini.kr/api/theme-fear-greed/?r61=\'+Date.now(),{headers:{\'cache-control\':\'no-cache\'},signal:AbortSignal.timeout(20000)}).then(async r=>{if(!r.ok)throw Error(\'HTTP_\'+r.status);const j=await r.json();const ok=j.status===\'READY\'&&j.modelRevision===\'THEME_LEGACY_NINE_R37_PUBLIC_V1\'&&j.themes?.length===10&&j.provisionalMethodologyVersion===\'ETF_ONLY_T40_R20_V40_PAIR50\';console.log(JSON.stringify({status:j.status,modelRevision:j.modelRevision??null,confirmedObservationDate:j.confirmedObservationDate,provisionalDates:j.provisional?.points?.map(p=>p.date),provisionalMethodologyVersion:j.provisionalMethodologyVersion??null,publicR32Verified:ok}));if(!ok)process.exitCode=5}).catch(e=>{console.error(\'PUBLIC_API_CHECK_ERROR=\'+e.message);process.exitCode=6})" >>"%R61_REPORT%" 2>&1',
 'set "R61_PUBLIC_EXIT=%ERRORLEVEL%"',
 '>>"%R61_REPORT%" echo PUBLIC_API_CHECK_EXIT=%R61_PUBLIC_EXIT%',
 'if not "%R61_PUBLIC_EXIT%"=="0" goto :not_published',
 '>>"%R61_REPORT%" echo RESULT=PUBLIC_R32_CONFIRMED_AND_EXISTING_PROVISIONAL_VERIFIED',
 'set "R61_EXIT=0"',
 'goto :done',
 ':not_published',
 '>>"%R61_REPORT%" echo RESULT=NOT_YET_PUBLIC_CHECK_R54_GATE_LOG',
 'set "R61_EXIT=5"',
 'goto :done',
 ':missing',
 '>>"%R61_REPORT%" echo RESULT=STOP_EXISTING_R54_OR_NODE_MISSING',
 'set "R61_EXIT=2"',
 'goto :done',
 ':upgrade_failed',
 '>>"%R61_REPORT%" echo RESULT=STOP_SOURCE_UPGRADE_SHA_OR_BACKUP_GATE',
 'set "R61_EXIT=3"',
 'goto :done',
 ':collision',
 'echo RESULT=STOP_LOG_FILENAME_COLLISION',
 'pause',
 'exit /b 4',
 ':done',
 'echo RESULT_FILE=%R61_REPORT%',
 'type "%R61_REPORT%"',
 'pause',
 'exit /b %R61_EXIT%',
];
for(const f of files){
 lines.push(`::R61_${f.key}_BEGIN`);
 lines.push(...f.bytes.toString('base64').match(/.{1,128}/g).map(x=>'::'+x));
 lines.push(`::R61_${f.key}_END`);
}
const cmd=lines.join('\r\n')+'\r\n';
if(/[^\x00-\x7f]/.test(cmd)||/(?<!\r)\n/.test(cmd))
 throw Error('R61_CMD_NOT_ASCII_CRLF');
fs.writeFileSync(out,cmd);
console.log(JSON.stringify({file:out,size:Buffer.byteLength(cmd),sourceFiles:files.length,
 sha256:digest(Buffer.from(cmd)),extractorChars:js.length}));
