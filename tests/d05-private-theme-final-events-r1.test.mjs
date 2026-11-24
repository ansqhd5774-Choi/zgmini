import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {storeVerifiedPrivateThemeFinalEvents,readStoredPrivateThemeFinalScoreDays}
 from '../lib/score-history/d05-private-theme-final-events-r1.mjs';

const digest=b=>createHash('sha256').update(b).digest('hex');
const VERSION='a'.repeat(64),REGISTRY='b'.repeat(64);
const DATE='2026-11-23',AT=Date.parse('2026-11-23T16:02:00.000Z');
function fixture({score=55,history=null,privateData=null}={}){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'d05-private-final-'));
 const themes=[{id:'ai-software',configured:true,score,methodologyVersion:'APPROVED_R32',
  confirmedObservationDate:DATE,history:history??[
   {date:'2026-11-22',score:50},{date:DATE,score}],
  secretIndicatorData:'DO_NOT_STORE'}];
 const obj=privateData??{schema:'ZGMINI_PAID_PRIVATE_DERIVED_V1',
  sourceVersion:VERSION,registrySha256:REGISTRY,confirmedDate:DATE,
  provisionalDate:'2026-11-24',themes};
 const bytes=Buffer.from(JSON.stringify(obj)),bodySha256=digest(bytes);
 const file=path.join(directory,'private-theme-'+bodySha256+'.json');
 fs.writeFileSync(file,bytes);
 const privateStored={status:'PRIVATE_STORED_READBACK_VERIFIED',
  count:obj.themes.length,bodySha256};
 const capture=(at=AT,extra={})=>storeVerifiedPrivateThemeFinalEvents({
  directory,privateStored,sourceVersion:VERSION,registrySha256:REGISTRY,
  confirmedDate:DATE,calculatedAtMs:at,now:at+10000,...extra});
 const daily=(fromDay='2026-11-24',toDay='2026-11-24',now=AT+100000)=> 
  readStoredPrivateThemeFinalScoreDays({directory,fromDay,toDay,now});
 return {directory,file,privateStored,capture,daily,
  cleanup:()=>fs.rmSync(directory,{recursive:true,force:true})};
}
test('private final score is a genuine clocked receipt, never a trend or raw input',()=>{
 const f=fixture();try{
  const receipt=f.capture();
  assert.equal(receipt.status,'LOCAL_PRIVATE_FINAL_THEME_EVENTS_VERIFIED');
  assert.equal(receipt.scoreCount,1);
  assert.equal(receipt.calculatedAt,'2026-11-23T16:02:00.000Z');
  assert.equal(receipt.confirmedObservationDate,DATE);
  assert.match(receipt.finalEventBodySha256,/^[a-f0-9]{64}$/);
  const result=f.daily();
  assert.equal(result.candidateFiles,1);
  assert.equal(result.actualOutputEvents,1);
  assert.equal(result.dailyFinalScorePoints,1);
  assert.equal(result.points[0].score,55);
  assert.equal(result.points[0].calculatedDateKst,'2026-11-24');
  assert.equal(result.points[0].asOfDate,DATE);
  assert.equal(result.points[0].phase,'CONFIRMED');
  const event=fs.readFileSync(path.join(f.directory,'d05-private-final-theme-'+
   receipt.finalEventBodySha256+'.json'),'utf8');
  assert.doesNotMatch(event,/DO_NOT_STORE|history|secretIndicatorData|sourcePriceMode/);
  assert.equal(result.points[0].scoreId,'theme:ai-software');
 }finally{f.cleanup()}
});
test('identical source snapshot can yield separate real events, with one daily point',()=>{
 const f=fixture();try{
  const first=f.capture(AT);
  const second=f.capture(AT+3600000);
  assert.notEqual(first.finalEventBodySha256,second.finalEventBodySha256);
  assert.equal(first.privateBodySha256,second.privateBodySha256);
  const out=f.daily('2026-11-24','2026-11-24',AT+4000000);
  assert.equal(out.candidateFiles,2);
  assert.equal(out.actualOutputEvents,2);
  assert.equal(out.dailyFinalScorePoints,1);
  assert.equal(out.points[0].calculatedAt,new Date(AT+3600000).toISOString());
 }finally{f.cleanup()}
});
test('a replay of the exact calculation is idempotent, not another event',()=>{
 const f=fixture();try{
  const old=f.capture();
  assert.deepEqual(f.capture(),old);
  assert.equal(f.daily().actualOutputEvents,1);
 }finally{f.cleanup()}
});
test('a zero final score remains zero; old trend values cannot create stored PIT dates',()=>{
 const old=Array.from({length:252},(_,i)=>({
  date:new Date(Date.parse(DATE+'T00:00:00Z')-(251-i)*86400000).toISOString().slice(0,10),score:i===251?0:60
 }));
 const f=fixture({score:0,history:old});try{
  f.capture();
  const d=f.daily('2025-11-24','2026-11-24');
  assert.equal(d.candidateFiles,1);
  assert.equal(d.actualOutputEvents,1);
  assert.equal(d.dailyFinalScorePoints,1);
  assert.equal(d.points[0].score,0);
 }finally{f.cleanup()}
});
test('source SHA tamper and incorrect source clock do not create a private receipt',()=>{
 const f=fixture();try{
  fs.writeFileSync(f.file,Buffer.from('{"modified":true}'));
  assert.throws(()=>f.capture(),/SHA_MISMATCH/);
  const saved=fs.readdirSync(f.directory).filter(n=>n.startsWith('d05-private-final-theme-'));
  assert.equal(saved.length,0);
 }finally{f.cleanup()}
 const g=fixture();try{
  assert.throws(()=>g.capture(AT,{sourceVersion:'c'.repeat(64)}),/SOURCE_MISMATCH/);
  assert.throws(()=>g.capture(AT,{now:AT-1}),/STORED_RECEIPT_INVALID/);
  assert.throws(()=>g.capture(AT,{confirmedDate:'2026-11-21'}),/SOURCE_MISMATCH/);
  assert.equal(g.daily().candidateFiles,0);
 }finally{g.cleanup()}
});
test('same clock conflicting private scores fail at read, never silently replace',()=>{
 const f=fixture();try{
  f.capture();
  const second=fixture({score:60});
  try{
   const orig=fs.readdirSync(second.directory).find(n=>n.startsWith('private-theme-'));
   fs.copyFileSync(path.join(second.directory,orig),path.join(f.directory,orig));
   const receipt=second.privateStored;
   storeVerifiedPrivateThemeFinalEvents({directory:f.directory,
    privateStored:receipt,sourceVersion:VERSION,registrySha256:REGISTRY,
    confirmedDate:DATE,calculatedAtMs:AT,now:AT+1000});
   assert.throws(()=>f.daily(),/SAME_CLOCK_CONFLICT/);
  }finally{second.cleanup()}
 }finally{f.cleanup()}
});
test('corrupted immutable private output cannot pass after a successful write',()=>{
 const f=fixture();try{
  const receipt=f.capture(),dest=path.join(f.directory,
   'd05-private-final-theme-'+receipt.finalEventBodySha256+'.json');
  fs.writeFileSync(dest,'{}');
  assert.throws(()=>f.daily(),/SHA_MISMATCH/);
  assert.throws(()=>f.capture(),/READBACK_MISMATCH/);
 }finally{f.cleanup()}
});
test('future immutable event and out-of-range query are rejected',()=>{
 const f=fixture();try{
  f.capture();
  assert.throws(()=>f.daily('2026-11-24','2026-11-24',AT-1),/FUTURE_EVENT/);
  assert.throws(()=>f.daily('2025-01-01','2026-11-24'),/DATE_RANGE_INVALID/);
 }finally{f.cleanup()}
});
test('paid Core integration adds only optional local private event readback',()=>{
 const source=readFileSync(new URL('../scripts/pc-writer/theme-paid-cycle.mjs',import.meta.url),'utf8');
 assert.match(source,/privateStored\?\.status==='PRIVATE_STORED_READBACK_VERIFIED'/);
 assert.match(source,/storeVerifiedPrivateThemeFinalEvents\(/);
 assert.match(source,/d05PrivateFinalOutputReadback/);
 assert.match(source,/catch\{d05PrivateFinalOutputReadback=\{status:'UNPROVEN_PRIVATE_FINAL_OUTPUT'\}\}/);
});
