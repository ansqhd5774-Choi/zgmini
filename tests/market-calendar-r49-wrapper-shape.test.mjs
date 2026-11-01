import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {anonymizeR49Vbs,diagnoseR49WrapperShape} from '../scripts/pc-writer/market-calendar-r49-wrapper-shape.mjs';

test('R49 anonymization preserves only launcher syntax and never exposes values',()=>{
 const secret='X-PRIVATE-SECRET-IS-879381';
 const file='E:\\ZGmini\\projects\\personal-user\\scripts\\pc-writer\\quota-runner.mjs';
 const raw=`' private account confidential\nSet shell = CreateObject("WScript.Shell")\n`+
  `scriptPath = "${file}"\n`+
  `password = "${secret}"\n`+
  `WScript.Quit shell.Run(Chr(34) & scriptPath & Chr(34) & " --publish", 0, True)\n`;
 const r=anonymizeR49Vbs(raw);
 const shown=JSON.stringify(r);
 assert.equal(shown.includes(secret),false);
 assert.equal(shown.includes('personal-user'),false);
 assert.equal(shown.includes(file),false);
 assert.equal(shown.includes('password'),false);
 assert.equal(r.hints.hasQuotaRunner,true);
 assert.equal(r.hints.hasConcat,true);
 assert.equal(r.hints.hasChr,true);
 assert.ok(r.lines.some(x=>x.includes('STRING_MJS')));
 assert.ok(r.lines.some(x=>x.includes('RUN')));
});

test('R49 safely scans only the wrapper selected by the Core task',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r49-'));
 try{
  const wrapper=path.join(dir,'new-core.vbs');
  fs.writeFileSync(wrapper,'Set shell = CreateObject("WScript.Shell")\nWScript.Quit shell.Run(command,0,True)\n');
  const xml=`<Task><Actions><Exec><Command>wscript.exe</Command><Arguments>"${wrapper}"</Arguments></Exec></Actions></Task>`;
  const result=diagnoseR49WrapperShape({getTaskXml:()=>xml});
  assert.equal(result.decision,'R49_ANONYMIZED_WRAPPER_SHAPE_READY');
  assert.ok(result.lines.length>0);
  assert.equal(JSON.stringify(result).includes(dir),false);
  assert.equal(result.noSourceWrites,true);
  assert.equal(result.providerCalls,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('R49 ambiguous arguments or denied task access fail closed',()=>{
 assert.equal(diagnoseR49WrapperShape({getTaskXml:()=>'<Task></Task>'}).decision,'R49_TASK_ARGUMENT_AMBIGUOUS');
 const denied=diagnoseR49WrapperShape({getTaskXml:()=>{throw Error('PRIVATE_DIRECTORY');}});
 assert.equal(denied.decision,'R49_WRAPPER_READ_FAILED');
 assert.equal(JSON.stringify(denied).includes('PRIVATE_DIRECTORY'),false);
});
