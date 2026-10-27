import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {locate} from '../scripts/pc-writer/market-calendar-r11-publisher-locator.mjs';

const approved='ee41bb295200d248efc683841e0f1ba0bc4779ee';
const baseline='f084e2a360b544257bb44a60b97875627c7ca371';

function fixture({count=1,source=approved,head=approved,writerStatus='VERIFIED',protectedChanges=''}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-calendar-r11-'));
 const projects=path.join(root,'projects'),data=path.join(root,'data');
 fs.mkdirSync(projects);fs.mkdirSync(data);
 const saved=(file,obj)=>fs.writeFileSync(path.join(data,file),JSON.stringify(obj));
 saved('config.json',{source,enabled:true,collectionTarget:'pc'});
 saved('local-writer-last-run.json',{source:approved,status:writerStatus,mode:'PUBLISH',at:'2026-10-27T06:30:06Z'});
 saved('local-publication-ledger.json',{source:approved,status:'VERIFIED',at:'2026-10-27T06:31:17Z'});
 for(let n=0;n<count;n++){
  const project=path.join(projects,`case-${n}`);
  fs.mkdirSync(path.join(project,'.git'),{recursive:true});
  fs.mkdirSync(path.join(project,'scripts','pc-writer'),{recursive:true});
  fs.writeFileSync(path.join(project,'scripts','pc-writer','run-local.mjs'),'// fixture');
 }
 const gitCall=(dir,args)=>{
  if(args[0]==='rev-parse')return head;
  if(args[0]==='hash-object')return baseline;
  if(args[0]==='diff')return protectedChanges;
  return null;
 };
 return {root,run:()=>locate({projectRoot:projects,dataRoot:data,gitCall})};
}

test('R11: one clean approved-head source and verified writer can be selected without revealing paths',()=>{
 const f=fixture();
 try{
  const r=f.run();
  assert.equal(r.decision,'READY_FOR_EXACT_WORKTREE_SELECTION_NO_CHANGES_MADE');
  assert.equal(r.projects.sourceHeadMatches,1);
  assert.equal(r.projects.candidates[0].protectedClean,true);
  assert.match(r.projects.candidates[0].id,/^[a-f0-9]{12}$/);
  assert.ok(!JSON.stringify(r).includes(f.root));
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});

test('R11: independently approved PC source changes still need matching verified writer records',()=>{
 const f=fixture({source:'e95805a368a6d0c4461f6de9410df4b8e59ea011'});
 try{assert.equal(f.run().decision,'RECENT_VERIFIED_WRITER_NOT_MATCHED_STOP');}finally{fs.rmSync(f.root,{recursive:true,force:true});}
});

test('R11: changed source with matching verified writer is accepted when the checked-out HEAD and parser also match',()=>{
 const changed='e95805a368a6d0c4461f6de9410df4b8e59ea011';
 const f=fixture({source:changed,head:changed});
 try{
  for(const file of ['local-writer-last-run.json','local-publication-ledger.json']){
   const at=path.join(f.root,'data',file);const obj=JSON.parse(fs.readFileSync(at,'utf8'));obj.source=changed;fs.writeFileSync(at,JSON.stringify(obj));
  }
  assert.equal(f.run().decision,'READY_FOR_EXACT_WORKTREE_SELECTION_NO_CHANGES_MADE');
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});

test('R11: ambiguous worktrees and protected source changes stop without edits',()=>{
 for(const opts of [{count:2},{protectedChanges:'lib/release-calendar.mjs'},{writerStatus:'FAILED'}]){
  const f=fixture(opts);
  try{assert.match(f.run().decision,/_STOP$/);}finally{fs.rmSync(f.root,{recursive:true,force:true});}
 }
});
