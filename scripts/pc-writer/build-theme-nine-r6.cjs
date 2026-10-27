'use strict';
// Build a self-contained PC CMD from verbatim R188/R2 scorer source and read-only adapters.
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const here=__dirname;
const payload={
 runner:fs.readFileSync(path.join(here,'theme-nine-parity-r6.cjs'),'utf8'),
 toolkit:fs.readFileSync(path.join(here,'theme-nine-source-r5.cjs'),'utf8'),
 r188:fs.readFileSync(path.join(here,'theme-optional-score-r188.mjs'),'utf8'),
 r2:fs.readFileSync(path.join(here,'theme-optional-adaptive-r2.mjs'),'utf8'),
};
const encoded=zlib.deflateRawSync(Buffer.from(JSON.stringify(payload)),{level:9}).toString('base64');
const pieces=encoded.match(/.{1,3000}/g)||[];
const expr=pieces.map((_,i)=>`process.env.R6_PART_${i+1}`).join('+');
const evalSource=
 `const p=JSON.parse(require('node:zlib').inflateRawSync(Buffer.from(${expr},'base64')).toString('utf8'));`+
 `const load=(s)=>{const m={exports:{}};new Function('require','module','exports','process',s)(require,m,m.exports,process);return m.exports};`+
 `const esm=(s,n)=>new Function(s.replace(/\\bexport\\s+/g,'')+';return {'+n+'}').call(null);`+
 `globalThis.__R6_TOOLKIT__=load(p.toolkit);`+
 `globalThis.__R6_SCORERS__={...esm(p.r188,'scoreAll252'),...esm(p.r2,'scoreAdaptiveTimeline')};`+
 `load(p.runner).run(process.argv[1]);`;
const command=`"%TASK_NODE%" -e "${evalSource}" "%TASK_DATA_ROOT%" >>"%TASK_RESULT%" 2>&1`;
const lines=[
 '@echo off','setlocal EnableExtensions DisableDelayedExpansion',
 'rem Standalone original-nine private R188/R2 shadow; no sibling Node file required.',
 'set "TASK_DATA_ROOT=E:\\ZGmini\\data"',
 'set "TASK_NODE=node"',
 'if exist "E:\\ZGmini\\runtime\\node.exe" set "TASK_NODE=E:\\ZGmini\\runtime\\node.exe"',
 'set "TASK_RESULT=%~dp0THEME_NINE_PARITY_R6_RESULT.txt"',
 '>"%TASK_RESULT%" echo REPORT=THEME_NINE_PARITY_R6_PRIVATE',
 '>>"%TASK_RESULT%" echo OUTPUT=RESULT_TXT_BESIDE_CMD_ONLY',
 'if not exist "%TASK_DATA_ROOT%\\" (',
 '  >>"%TASK_RESULT%" echo ERROR=APPROVED_E_DATA_ROOT_NOT_FOUND',
 '  type "%TASK_RESULT%"',
 '  exit /b 1',
 ')',
 '"%TASK_NODE%" --version >>"%TASK_RESULT%" 2>&1',
 'if errorlevel 1 (',
 '  >>"%TASK_RESULT%" echo ERROR=NODE_NOT_AVAILABLE',
 '  type "%TASK_RESULT%"',
 '  exit /b 1',
 ')',
 ...pieces.map((s,i)=>`set "R6_PART_${i+1}=${s}"`),
 command,
 'set "TASK_EXEC_EXIT=%ERRORLEVEL%"',
 '>>"%TASK_RESULT%" echo SCRIPT_EXIT=%TASK_EXEC_EXIT%',
 'type "%TASK_RESULT%"',
 'exit /b %TASK_EXEC_EXIT%',
 ''
];
if(lines.some(s=>s.length>7000))throw Error('WINDOWS_CMD_8191_LIMIT');
const filename=path.join(here,'theme-nine-parity-r6.cmd');
fs.writeFileSync(filename,lines.join('\r\n'),'ascii');
console.log(`R6_STANDALONE_BUILT=YES;PARTS=${pieces.length};BYTES=${fs.statSync(filename).size}`);
