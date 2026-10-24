import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {inspectExistingSevenAiSource} from '../scripts/pc-writer/theme-ai-marketparquet-readonly-r1.mjs';

const SOURCE='MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED';
const overlap='2026-10-22',target='2026-10-23';
function fixtures(t,{missingFile=null,badSha=null}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zg-ai-parquet-readonly-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const parent=path.join(root,'theme-market-history-r131'),archive=path.join(parent,'marketparquet-r165'),audits=path.join(parent,'marketparquet-r167');
 fs.mkdirSync(archive,{recursive:true});fs.mkdirSync(audits);
 for(const date of [overlap,target]){
  if(date===missingFile)continue;
  const name=`etf_daily_${date}`;
  const bytes=Buffer.alloc(16);bytes.write('PAR1',0);bytes.writeUInt32LE(4,8);bytes.write('PAR1',12);
  fs.writeFileSync(path.join(archive,name+'.parquet'),bytes);
  const digest=createHash('sha256').update(bytes).digest('hex');
  fs.writeFileSync(path.join(audits,name+'.audit.json'),JSON.stringify({date,sha256:date===badSha?'a'.repeat(64):digest,complete:true,source:SOURCE}));
 }
 return root;
}

const rows=(date)=>['SMH','SOXX','SPY'].map((symbol,i)=>({date,symbol,asset_type:'etf',close:100+i}));
test('checks the seven-theme actual Parquet bytes and every exact AI ticker without collecting',async t=>{
 const root=fixtures(t);let calls=0;
 const result=await inspectExistingSevenAiSource({dataRoot:root,targetDate:target,overlapDate:overlap,
  reader:async(file,bytes)=>{calls++;assert.equal(bytes.toString('ascii',0,4),'PAR1');return rows(path.basename(file).slice(10,20));}});
 assert.equal(result.status,'ACTUAL_TARGET_AND_OVERLAP_ROWS_VERIFIED');
 assert.equal(calls,2);assert.equal(result.providerCalls,0);assert.equal(result.d1Writes,0);assert.equal(result.schedulerWrites,0);
 assert.deepEqual(result.targetCoverage,{SMH:true,SOXX:true,SPY:true});
 assert.equal(result.dates.length,2);assert.ok(result.dates.every(p=>p.shaVerified&&p.complete));
 assert.equal(JSON.stringify(result).includes('"close"'),false);
});
test('missing actual 23rd original source is not transformed into a provisional score',async t=>{
 const root=fixtures(t,{missingFile:target});
 const result=await inspectExistingSevenAiSource({dataRoot:root,reader:async()=>rows(overlap)});
 assert.equal(result.status,'TARGET_DATE_PARQUET_MISSING');
 assert.deepEqual(result.dates.at(-1).coverage,{SMH:false,SOXX:false,SPY:false});
});
test('source SHA mismatch fails before any target row is trusted',async t=>{
 const root=fixtures(t,{badSha:overlap});let decoderCalls=0;
 const result=await inspectExistingSevenAiSource({dataRoot:root,reader:async()=>{decoderCalls++;return rows(overlap);}});
 assert.equal(result.status,'SEVEN_SOURCE_AUDIT_MISMATCH');assert.equal(decoderCalls,0);
});
test('exact symbol coverage, duplicates and price validity are mandatory',async t=>{
 const root=fixtures(t);
 const missing=await inspectExistingSevenAiSource({dataRoot:root,reader:async(file)=>
  path.basename(file).includes(target)?rows(target).slice(0,2):rows(overlap)});
 assert.equal(missing.status,'ACTUAL_TARGET_SYMBOLS_MISSING');assert.equal(missing.targetCoverage.SPY,false);
 const duplicate=await inspectExistingSevenAiSource({dataRoot:root,reader:async(file)=>{
  const d=path.basename(file).slice(10,20);return [...rows(d),rows(d)[0]];}});
 assert.equal(duplicate.status,'TARGET_ROW_INVALID_OR_DUPLICATE');
 const invalid=await inspectExistingSevenAiSource({dataRoot:root,reader:async(file)=>{
  const d=path.basename(file).slice(10,20);return rows(d).map(x=>x.symbol==='SPY'?{...x,close:0}:x);}});
 assert.equal(invalid.status,'TARGET_ROW_INVALID_OR_DUPLICATE');
});
test('decoder failure is explicit and does not become a PASS',async t=>{
 const root=fixtures(t);
 const result=await inspectExistingSevenAiSource({dataRoot:root,reader:async()=>{throw Error('not installed');}});
 assert.equal(result.status,'PARQUET_DECODER_UNAVAILABLE_OR_FAILED');
 assert.equal(result.decoderReason,'not installed');
});
