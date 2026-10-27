// Stage 5 R32 offline CMD: SHA-bundle 3 approved-source/pure modules and
// exact dated issuer evidence. No API or writes outside the CMD folder.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const bundled=[
 ['R32A_CODE','theme-nine-r32-private-aggregate.mjs','theme-nine-r32-private-aggregate.mjs'],
 ['R32A_PREFLIGHT','theme-nine-r32-readonly-preflight.mjs','theme-nine-r32-readonly-preflight.mjs'],
 ['R32A_PAIR','theme-optional-pair-weight-r3.mjs','theme-optional-pair-weight-r3.mjs'],
 ['R32A_ROSTER','theme-nine-r20-approved-candidates.json','../../config/theme-nine-r20-approved-candidates.json'],
 ['R32A_AUM','theme-nine-r26-official-aum-evidence.json','../../config/theme-nine-r26-official-aum-evidence.json'],
 ['R32A_APPROVAL','theme-nine-r32-dated-aum-approval.json','../../config/theme-nine-r32-dated-aum-approval.json']
].map(([label,filename,rel])=>({label,filename,bytes:fs.readFileSync(path.resolve(here,rel))}));
const lines=b=>b.toString('base64').match(/.{1,128}/g).map(s=>'::'+s);
const unpack=[
 "const fs=require('node:fs')",
 "const cr=require('node:crypto')",
 "const p=require('node:path')",
 "const s=fs.readFileSync(process.env.R32_SELF,'ascii')",
 "const h=b=>cr.createHash('sha256').update(b).digest('hex')",
 "function part(n){const a='::'+n+'_BEGIN',b='::'+n+'_END';const i=s.lastIndexOf(a);if(i<0)throw Error('NO_START_'+n);const j=s.indexOf(b,i+a.length);if(j<0)throw Error('NO_END_'+n);return Buffer.from(s.slice(i+a.length,j).replace(/[^A-Za-z0-9+/=]/g,''),'base64')}"
];
for(const item of bundled)unpack.push(
 `{const b=part('${item.label}');if(h(b)!=='${hash(item.bytes)}')throw Error('SHA_MISMATCH_${item.label}');fs.writeFileSync(p.join(process.env.R32_STAGE_DIR,'${item.filename}'),b,{flag:'wx'})}`);
unpack.push("console.log('R32_SIX_COMPONENT_SHA_VERIFIED=YES')");
const js=unpack.join(';');
if(js.includes('"')||js.length>7800)throw Error('CMD_INLINE_JS_UNSAFE');

const cmd=[
 '@echo off',
 'setlocal EnableExtensions DisableDelayedExpansion',
 'rem R32 Stage 5: PRIVATE 9-theme shadow calculation only. NO NETWORK/DB/PUBLISH.',
 'rem Place this CMD next to ONE full THEME_NINE_R25_INDIVIDUAL_SCORES_...json.',
 'rem Drag a JSON onto the CMD if more than one R25 file exists.',
 'set "R32_SELF=%~f0"',
 'set "R32_FOLDER=%~dp0"',
 'set "R32_SELECTED=%~1"',
 'set "R32_RESULT=%~dp0THEME_NINE_R32_PRIVATE_RESULT_%RANDOM%_%RANDOM%.txt"',
 'set "R32_SHADOW_RESULT=%~dp0THEME_NINE_R32_PRIVATE_SHADOW_%RANDOM%_%RANDOM%.json"',
 'set "R32_STAGE_DIR=%~dp0R32_PRIVATE_STAGE_%RANDOM%_%RANDOM%"',
 'set "R32_NODE=node"',
 'if exist "E:\\ZGmini\\runtime\\node.exe" set "R32_NODE=E:\\ZGmini\\runtime\\node.exe"',
 'set "R32_EXIT=1"',
 'if exist "%R32_STAGE_DIR%" goto :collision',
 'if exist "%R32_RESULT%" goto :collision',
 'if exist "%R32_SHADOW_RESULT%" goto :collision',
 'mkdir "%R32_STAGE_DIR%"',
 'if errorlevel 1 goto :mkdir_failed',
 '>"%R32_RESULT%" echo REPORT=THEME_NINE_R32_PRIVATE_SHADOW',
 '>>"%R32_RESULT%" echo BRANCH=codex/theme-fear-greed-integration-20261025',
 '>>"%R32_RESULT%" echo DATA_ROOT_D1_SCHEDULER_FORMULA_PUBLICATION_WRITES=0',
 '"%R32_NODE%" --version >>"%R32_RESULT%" 2>&1',
 'if errorlevel 1 goto :node_failed',
 `"%R32_NODE%" -e "${js}" >>"%R32_RESULT%" 2>&1`,
 'if errorlevel 1 goto :unpack_failed',
 '"%R32_NODE%" "%R32_STAGE_DIR%\\theme-nine-r32-private-aggregate.mjs" --private-aggregate >>"%R32_RESULT%" 2>&1',
 'set "R32_EXIT=%ERRORLEVEL%"',
 'goto :cleanup',
 ':node_failed',
 '>>"%R32_RESULT%" echo STATUS=NODE_MISSING',
 'goto :cleanup',
 ':unpack_failed',
 '>>"%R32_RESULT%" echo STATUS=EMBEDDED_SHA_MISMATCH',
 'goto :cleanup',
 ':mkdir_failed',
 '>"%R32_RESULT%" echo STATUS=STAGING_CREATE_FAILED',
 'goto :cleanup',
 ':collision',
 'echo STATUS=STAGING_OR_OUTPUT_NAME_COLLISION',
 'exit /b 2',
 ':cleanup',
 ...bundled.map(b=>`if exist "%R32_STAGE_DIR%\\${b.filename}" del /q "%R32_STAGE_DIR%\\${b.filename}"`),
 'if exist "%R32_STAGE_DIR%" rmdir "%R32_STAGE_DIR%"',
 'type "%R32_RESULT%"',
 'exit /b %R32_EXIT%',
 ...bundled.flatMap(b=>[`::${b.label}_BEGIN`,...lines(b.bytes),`::${b.label}_END`])
].join('\r\n')+'\r\n';
if(/[^\x00-\x7f]/.test(cmd))throw Error('CMD_ASCII_ONLY');
const out=path.join(here,'THEME_NINE_R32_PRIVATE_AGGREGATE.cmd');
fs.writeFileSync(out,cmd,'ascii');
const check=fs.readFileSync(out,'ascii');
for(const item of bundled){
 const start=check.lastIndexOf(`::${item.label}_BEGIN`),end=check.indexOf(`::${item.label}_END`,start);
 if(start<0||end<0)throw Error('MISSING_'+item.label);
 const actual=Buffer.from(check.slice(start+`::${item.label}_BEGIN`.length,end).replace(/[^A-Za-z0-9+/=]/g,''),'base64');
 if(!actual.equals(item.bytes))throw Error('READBACK_SHA_FAILED_'+item.label);
}
process.stdout.write(JSON.stringify({status:'R32_PRIVATE_CMD_SIX_SHA_READBACK_PASS',
 bytes:Buffer.byteLength(cmd),components:bundled.map(b=>({name:b.filename,sha256:hash(b.bytes)}))},null,2)+'\n');
