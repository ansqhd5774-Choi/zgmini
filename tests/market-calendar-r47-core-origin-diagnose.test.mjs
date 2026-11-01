import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {diagnoseR47CoreOrigin} from '../scripts/pc-writer/market-calendar-r47-core-origin-diagnose.mjs';

const sha=s=>createHash('sha256').update(s).digest('hex');

test('R47 identifies the original R38 wrapper/Core origin without reporting paths',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r47-'));
 try{
  const root=path.join(temp,'pc-project'),wrapper=path.join(temp,'run-local-core.vbs');
  const origin=path.join(temp,'origin.cmd');
  fs.writeFileSync(wrapper,`' ZGMINI_R38_WRAPPER_V1\norigin = "${origin}"\n`);
  fs.writeFileSync(origin,`set runner="${path.join(root,'scripts','pc-writer','local-cycle.mjs')}"\n`);
  const xml=`<Task><Actions><Exec><Command>wscript.exe</Command><Arguments>"${wrapper}"</Arguments></Exec></Actions></Task>`;
  const result=diagnoseR47CoreOrigin({getTaskXml:()=>xml});
  assert.equal(result.decision,'R47_CORE_ORIGIN_READONLY_RESOLVED');
  assert.equal(result.strictR46WrapperMatches,1);
  assert.equal(result.wrapperR38Marker,true);
  assert.equal(result.rootWorktreeId,sha(path.normalize(root).replaceAll('\\','/').toLowerCase()).slice(0,12));
  assert.equal(JSON.stringify(result).includes(temp),false);
  assert.equal(result.noSourceWrites,true);
  assert.equal(result.providerCalls,0);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('R47 detects a changed wrapper marker without pretending install origin is approved',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r47-'));
 try{
  const wrapper=path.join(temp,'run-local-core.vbs'),origin=path.join(temp,'origin.cmd');
  fs.writeFileSync(wrapper,`' ZGMINI_NEW_WRAPPER\norigin = "${origin}"\n`);
  fs.writeFileSync(origin,`set runner="${path.join(temp,'project','scripts','pc-writer','local-cycle.mjs')}"\n`);
  const xml=`<Task><Actions><Exec><Command>wscript.exe</Command><Arguments>"${wrapper}"</Arguments></Exec></Actions></Task>`;
  const result=diagnoseR47CoreOrigin({getTaskXml:()=>xml});
  assert.equal(result.wrapperR38Marker,false);
  assert.equal(result.decision,'R47_CORE_ORIGIN_READONLY_RESOLVED');
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('R47 flags direct Node task argument drift and does not scan unrelated paths',()=>{
 const xml='<Task><Actions><Exec><Command>node.exe</Command></Exec></Actions></Task>';
 const result=diagnoseR47CoreOrigin({getTaskXml:()=>xml});
 assert.equal(result.decision,'R47_TASK_ARGUMENT_SHAPE_CHANGED');
 assert.equal(result.taskCommandType,'NODE');
 assert.equal(result.originReadable,false);
 assert.equal(result.gitChanges,0);
});

test('R47 turns task read failure into a coded, read-only stop',()=>{
 const result=diagnoseR47CoreOrigin({getTaskXml:()=>{throw Error('ACCESS_DENIED_PATH_NOT_EXPOSED');}});
 assert.equal(result.decision,'R47_TASK_READ_OR_PARSE_FAILED');
 assert.equal(result.noSourceWrites,true);
 assert.equal(JSON.stringify(result).includes('ACCESS_DENIED'),false);
});
