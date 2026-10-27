'use strict';
// Packaging-only utility: embeds all of R5 in one CRLF/ASCII CMD, no sibling dependencies.
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const source=path.join(__dirname,'theme-nine-source-r5.cjs');
const target=path.join(__dirname,'theme-nine-source-r5.cmd');
const encoded=zlib.deflateRawSync(fs.readFileSync(source),{level:9}).toString('base64');
const chunks=encoded.match(/.{1,3000}/g)||[];
const envExpr=chunks.map((_,i)=>`process.env.R5_PART_${i+1}`).join('+');
const command='"%TASK_NODE%" -e "const z=require(\'node:zlib\');const m={exports:{}};'+
 `new Function('require','module','exports','process',z.inflateRawSync(Buffer.from(${envExpr},'base64')).toString('utf8'))(require,m,m.exports,process);`+
 `m.exports.run(process.argv[1]);" "%TASK_DATA_ROOT%" >>"%TASK_RESULT%" 2>&1`;
const lines=[
 '@echo off','setlocal EnableExtensions DisableDelayedExpansion',
 'rem R5 stand-alone read-only coverage, generated with build-theme-nine-r5.cjs.',
 'rem Source files and PC configuration must never be mutated by this audit.',
 'set "TASK_DATA_ROOT=E:\\ZGmini\\data"',
 'set "TASK_NODE=node"',
 'if exist "E:\\ZGmini\\runtime\\node.exe" set "TASK_NODE=E:\\ZGmini\\runtime\\node.exe"',
 'set "TASK_RESULT=%~dp0THEME_NINE_SOURCE_R5_RESULT.txt"',
 '>"%TASK_RESULT%" echo START=THEME_NINE_SOURCE_R5',
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
 ...chunks.map((part,i)=>`set "R5_PART_${i+1}=${part}"`),
 command,
 'set "TASK_EXEC_EXIT=%ERRORLEVEL%"',
 '>>"%TASK_RESULT%" echo SCRIPT_EXIT=%TASK_EXEC_EXIT%',
 'type "%TASK_RESULT%"',
 'exit /b %TASK_EXEC_EXIT%',
 ''];
if(lines.some(line=>line.length>7000))throw Error('CMD_LINE_TOO_LONG');
fs.writeFileSync(target,lines.join('\r\n'),'ascii');
console.log(`R5_STANDALONE_BUILT=YES;CHUNKS=${chunks.length};BYTES=${fs.statSync(target).size}`);
