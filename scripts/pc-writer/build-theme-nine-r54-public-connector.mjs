// Produce one self-contained ASCII/CRLF CMD with SHA-checked source files.
// Only a NEW R54 task can be created, after main Cloudflare production check
// and explicit publisher consent. No R47/R48 task or existing source changed.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const out=path.join(root,'scripts/pc-writer/THEME_NINE_R54_PUBLIC_CONNECT.cmd');
const files=[
 'scripts/pc-writer/THEME_NINE_R54_PUBLIC_CYCLE.cmd',
 'scripts/pc-writer/theme-nine-r54-public-connect.mjs',
 'scripts/pc-writer/theme-nine-r54-public-record.mjs',
 'scripts/pc-writer/theme-nine-r54-d1-client.mjs',
 'scripts/pc-writer/theme-nine-r54-deployment-gate.mjs',
 'scripts/pc-writer/theme-nine-r48-stage-current.mjs',
 'scripts/pc-writer/theme-nine-r51-stage-current.mjs',
 'scripts/pc-writer/theme-nine-r48-r47-bridge.mjs',
 'scripts/pc-writer/theme-nine-r51-provisional-overlay.mjs',
 'scripts/pc-writer/theme-nine-r48-d1-publication.mjs',
 'scripts/pc-writer/theme-biotech-auth-r7.mjs',
 'worker/theme-nine-r37-public.mjs',
 'worker/theme-nine-r88-provisional.mjs',
 'worker/public-display-freshness.mjs',
 'config/theme-nine-r20-approved-candidates.json',
 'config/theme-nine-r26-official-aum-evidence.json',
 ];
const hash=b=>createHash('sha256').update(b).digest('hex');
const bundle=files.map((rel,i)=>({key:'F'+String(i+1).padStart(2,'0'),
 rel,bytes:rel.endsWith('.cmd')?fs.readFileSync(path.join(root,rel)):
  Buffer.from(fs.readFileSync(path.join(root,rel),'utf8').replace(/\r\n/g,'\n'))})).map(item=>({
 ...item,sha256:hash(item.bytes)}));

// Fail the build if a new local relative import was omitted from the pinned
// standalone source graph (node:* imports never require bundling).
for(const item of bundle.filter(x=>x.rel.endsWith('.mjs'))){
 const source=item.bytes.toString('utf8');
 for(const m of source.matchAll(/\bfrom\s*['"](\.{1,2}\/[^'"]+)['"]/g)){
  const imported=path.posix.normalize(path.posix.join(path.posix.dirname(item.rel),m[1]));
  if(!files.includes(imported))throw Error('R54_UNBUNDLED_IMPORT_'+item.rel+'_'+imported);
 }
}

const commands=[
 "const fs=require('node:fs')",
 "const p=require('node:path')",
 "const cr=require('node:crypto')",
 "const src=fs.readFileSync(process.env.R54_SELF,'ascii')",
 "const home=process.env.R54_INSTALL",
 "const sha=b=>cr.createHash('sha256').update(b).digest('hex')",
 `const specs=[${bundle.map(x=>`'${x.key}|${x.rel}|${x.sha256}'`).join(',')}]`,
 "const assets=specs.map(s=>{const [k,n,h]=s.split('|'),a='::R54_'+k+'_BEGIN',z='::R54_'+k+'_END',i=src.lastIndexOf(a),j=src.indexOf(z,i+a.length);if(i<0||j<0)throw Error('MISSING_BUNDLE_'+k);const b=Buffer.from(src.slice(i+a.length,j).replace(/[^A-Za-z0-9+/=]/g,''),'base64');if(sha(b)!==h)throw Error('BUNDLE_SHA_'+k);return {n,h,b}})",
 "for(const x of assets){const f=p.join(home,x.n);if(!f.startsWith(home+p.sep))throw Error('PATH_ESCAPE');if(fs.existsSync(f)&&(!fs.statSync(f).isFile()||sha(fs.readFileSync(f))!==x.h))throw Error('EXISTING_SOURCE_CONFLICT_'+x.n)}",
 "for(const x of assets){const f=p.join(home,x.n);fs.mkdirSync(p.dirname(f),{recursive:true});if(!fs.existsSync(f))fs.writeFileSync(f,x.b,{flag:'wx'});if(sha(fs.readFileSync(f))!==x.h)throw Error('INSTALL_SHA_'+x.n)}",
 "console.log('BUNDLE_SHA_VERIFIED='+assets.length+'/'+assets.length)",
 "console.log('EXISTING_R47_R48_TASKS_CHANGED=NO')",
];
const extractor=commands.join(';');
if(extractor.length>7500||extractor.includes('"'))throw Error('R54_EXTRACTOR_LIMIT');
const lines=[
 '@echo off',
 'setlocal EnableExtensions DisableDelayedExpansion',
 'rem R54: existing nine-theme R32 score + provisional public connector.',
 'rem Explicit risk consent; pinned bundle, Cloudflare main production gate.',
 'rem No raw provider GET, no score formula, no change to existing tasks.',
 'set "R54_SELF=%~f0"',
 'set "R54_INSTALL=E:\\ZGmini\\data\\pc-writer\\theme-nine-r54"',
 'set "R54_NODE=E:\\ZGmini\\runtime\\node.exe"',
 'set "ZGMINI_DATA_ROOT=E:\\ZGmini\\data"',
 'set "R54_RUNNER=%R54_INSTALL%\\scripts\\pc-writer\\THEME_NINE_R54_PUBLIC_CYCLE.cmd"',
 'set "R54_CONSENT=%R54_INSTALL%\\PUBLISHER_CONSENT_R54.txt"',
 'set "R54_TASK=ZGMINI-PC-Theme-Nine-R54-Public"',
 'set "R54_REPORT=%~dp0THEME_NINE_R54_PUBLIC_CONNECT_RESULT_%RANDOM%_%RANDOM%.txt"',
 'if exist "%R54_REPORT%" goto :collision',
 '>"%R54_REPORT%" echo REPORT=THEME_NINE_R54_PUBLIC_CONNECT',
 '>>"%R54_REPORT%" echo STARTED=%DATE% %TIME%',
 '>>"%R54_REPORT%" echo EXISTING_R47_R48_TASKS_CHANGED=NO',
 '>>"%R54_REPORT%" echo NEW_FORMULA=NO',
 '>>"%R54_REPORT%" echo PROVIDER_GETS=0',
 'if not exist "%ZGMINI_DATA_ROOT%\\" goto :missing',
 'if not exist "%R54_NODE%" goto :missing',
 'if not exist "%R54_INSTALL%\\" mkdir "%R54_INSTALL%" >>"%R54_REPORT%" 2>&1',
 'if errorlevel 1 goto :install_failed',
 `"%R54_NODE%" -e "${extractor}" >>"%R54_REPORT%" 2>&1`,
 'if errorlevel 1 goto :install_failed',
 '>>"%R54_REPORT%" echo MAIN_DEPLOYMENT_GATE_ATTEMPT=YES',
 '"%R54_NODE%" "%R54_INSTALL%\\scripts\\pc-writer\\theme-nine-r54-deployment-gate.mjs" --once >>"%R54_REPORT%" 2>&1',
 'if errorlevel 1 goto :deployment_pending',
 'echo.',
 'echo WARNING: Anonymous GetMarketHistory licensing scope is unconfirmed.',
 'echo You authorize derived nine-theme scores, NEVER raw 1h bars.',
 'echo Official terms require an account in good standing for derived works.',
 'echo Enter ACCEPT to authorize public D1 and the dedicated daily R54 task.',
 'set "R54_ACCEPT="',
 'set /p R54_ACCEPT=Type ACCEPT to publish: ',
 'if /i not "%R54_ACCEPT%"=="ACCEPT" goto :no_consent',
 'if exist "%R54_CONSENT%" goto :consent_exists',
 '>"%R54_CONSENT%" echo ACCEPT_R54_ANONYMOUS_DERIVED_RISK_20261028',
 ':consent_exists',
 'findstr /X /C:"ACCEPT_R54_ANONYMOUS_DERIVED_RISK_20261028" "%R54_CONSENT%" >nul 2>&1',
 'if errorlevel 1 goto :no_consent',
 '>>"%R54_REPORT%" echo EXPLICIT_PUBLISHER_CONSENT=ACCEPT',
 '>>"%R54_REPORT%" echo ONE_TIME_PUBLISH_ATTEMPT=YES',
 '"%R54_NODE%" "%R54_INSTALL%\\scripts\\pc-writer\\theme-nine-r54-public-connect.mjs" --once --publish --accept-anonymous-license-risk >>"%R54_REPORT%" 2>&1',
 'set "R54_ONCE_EXIT=%ERRORLEVEL%"',
 '>>"%R54_REPORT%" echo ONE_TIME_EXIT=%R54_ONCE_EXIT%',
 'schtasks /Query /TN "%R54_TASK%" /XML >nul 2>&1',
 'if not errorlevel 1 goto :already_scheduled',
 'schtasks /Create /SC DAILY /ST 13:30 /TN "%R54_TASK%" /TR "%R54_RUNNER%" /RL LIMITED /IT >>"%R54_REPORT%" 2>&1',
 'if errorlevel 1 goto :schedule_failed',
 '>>"%R54_REPORT%" echo NEW_R54_TASK_CREATED=YES',
 'goto :schedule_verified',
 ':already_scheduled',
 'schtasks /Query /TN "%R54_TASK%" /XML 2>nul | findstr /I /C:"THEME_NINE_R54_PUBLIC_CYCLE.cmd" >nul',
 'if errorlevel 1 goto :schedule_failed',
 '>>"%R54_REPORT%" echo EXISTING_R54_TASK_PRESERVED=YES',
 ':schedule_verified',
 'schtasks /Query /TN "%R54_TASK%" /XML >>"%R54_REPORT%" 2>&1',
 'if errorlevel 1 goto :schedule_failed',
 '>>"%R54_REPORT%" echo RESULT=R54_INSTALLED_SCHEDULED_CHECK_ONE_TIME_STATUS',
 'set "R54_EXIT=0"',
 'goto :done',
 ':deployment_pending',
 '>>"%R54_REPORT%" echo RESULT=WAIT_MAIN_PRODUCTION_SOURCE_DEPLOYMENT_NO_D1_NO_TASK',
 'set "R54_EXIT=3"',
 'goto :done',
 ':no_consent',
 '>>"%R54_REPORT%" echo RESULT=STOP_NO_PUBLISHER_CONSENT',
 'set "R54_EXIT=4"',
 'goto :done',
 ':missing',
 '>>"%R54_REPORT%" echo RESULT=STOP_PC_NODE_OR_DATA_MISSING',
 'set "R54_EXIT=2"',
 'goto :done',
 ':install_failed',
 '>>"%R54_REPORT%" echo RESULT=STOP_BUNDLE_INSTALL_HASH_OR_CONFLICT',
 'set "R54_EXIT=5"',
 'goto :done',
 ':schedule_failed',
 '>>"%R54_REPORT%" echo RESULT=STOP_R54_SCHEDULE_CONFLICT_OR_CREATE_FAIL',
 'set "R54_EXIT=6"',
 'goto :done',
 ':collision',
 'echo RESULT=STOP_R54_LOG_COLLISION',
 'exit /b 3',
 ':done',
 'type "%R54_REPORT%"',
 'echo RESULT_FILE=%R54_REPORT%',
 'pause',
 'exit /b %R54_EXIT%',
];
for(const item of bundle){
 lines.push(`::R54_${item.key}_BEGIN`);
 lines.push(...item.bytes.toString('base64').match(/.{1,128}/g).map(s=>'::'+s));
 lines.push(`::R54_${item.key}_END`);
}
const contents=lines.join('\r\n')+'\r\n';
if(/[^\x00-\x7f]/.test(contents)||/(?<!\r)\n/.test(contents))
 throw Error('R54_SCRIPT_NOT_ASCII_CRLF');
fs.writeFileSync(out,contents);
console.log(JSON.stringify({file:out,bytes:Buffer.byteLength(contents),
 bundleFiles:bundle.length,extractorChars:extractor.length,
 sha256:hash(Buffer.from(contents))}));
