import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runDec31Batch,SYMBOLS} from '../scripts/pc-writer/market-calendar-dec31-symbol-batch-a.mjs';

const clock=()=>Date.parse('2026-11-04T09:00:00Z');
const key='test-only-provider-key';
function temp(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-dec31-batch-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;}

test('40 candidates are unique and exclude prior positive probe symbols',()=>{
  assert.equal(SYMBOLS.length,40);
  assert.equal(new Set(SYMBOLS).size,40);
  for(const x of ['BOX','COST','ORCL'])assert.ok(!SYMBOLS.includes(x));
});

test('batch stores each raw response PC-private and never overstates full calendar',async t=>{
  const root=temp(t);
  const touched=[];
  const result=await runDec31Batch({pcHome:root,env:{EARNINGS_API_KEY:key},clock,
    fetcher:async url=>{const u=new URL(url);const symbol=u.searchParams.get('symbol');
      assert.equal(u.searchParams.get('apikey'),key);touched.push(symbol);
      return {ok:true,status:200,text:async()=>JSON.stringify([
        {symbol,date:symbol==='ADBE'?'2026-12-08':'2026-09-01'}])};}});
  assert.deepEqual(touched,SYMBOLS);
  assert.equal(result.status,'BATCH_COMPLETE');
  assert.equal(result.storedSymbols,40);
  assert.equal(result.providerCalls,40);
  assert.equal(result.decemberEventRows,1);
  assert.equal(result.positiveSymbols,1);
  assert.equal(result.coreWrites+result.d1Writes+result.schedulerWrites+result.publicationWrites,0);
  assert.ok(!JSON.stringify(result).includes(key));
  assert.equal(fs.readdirSync(path.join(root,'er1-input','dec31-symbol-batch-a')).length,40);
});

test('429 stops without retry and preserves existing successful raw rows',async t=>{
  const root=temp(t);
  let count=0;
  const result=await runDec31Batch({pcHome:root,env:{EARNINGS_API_KEY:key},clock,
    fetcher:async url=>{count++;
      if(count===6)return {ok:false,status:429};
      return {ok:true,status:200,text:async()=>JSON.stringify([
        {symbol:new URL(url).searchParams.get('symbol'),date:'2026-12-12'}])};}});
  assert.equal(result.status,'PARTIAL');
  assert.equal(result.code,'DEC31_BATCH_QUOTA_STOP');
  assert.equal(result.providerCalls,6);
  assert.equal(result.storedSymbols,5);
  assert.equal(result.decemberEventRows,5);
  assert.equal(count,6);
  assert.ok(!fs.existsSync(path.join(root,'er1-input','dec31-symbol-batch-a.lock')));
});


test('quota-stopped 39th symbol resumes the exact two remaining symbols',async t=>{
  const root=temp(t),dir=path.join(root,'er1-input','dec31-symbol-batch-a');
  let firstCalls=0;
  const first=await runDec31Batch({pcHome:root,env:{EARNINGS_API_KEY:key},clock,
    fetcher:async url=>{
      firstCalls++;
      const symbol=new URL(url).searchParams.get('symbol');
      if(symbol==='TOL')return {ok:false,status:429};
      return {ok:true,status:200,text:async()=>JSON.stringify([
        {symbol,date:'2026-12-08'}])};
    }});
  assert.equal(first.code,'DEC31_BATCH_QUOTA_STOP');
  assert.equal(first.providerCalls,39);
  assert.equal(first.storedSymbols,38);
  assert.equal(first.reusedStoredSymbols,0);
  assert.equal(first.newStoredSymbols,38);
  assert.equal(firstCalls,39);
  const original=SYMBOLS.slice(0,38).map(symbol=>
    [symbol,fs.readFileSync(path.join(dir,symbol+'.json'),'utf8')]);
  const touched=[];
  const second=await runDec31Batch({pcHome:root,env:{EARNINGS_API_KEY:key},clock,
    fetcher:async url=>{
      const symbol=new URL(url).searchParams.get('symbol');
      touched.push(symbol);
      return {ok:true,status:200,text:async()=>JSON.stringify([
        {symbol,date:'2026-12-08'}])};
    }});
  assert.equal(second.status,'BATCH_COMPLETE');
  assert.equal(second.code,'DEC31_BATCH_RAW_SAVED_AND_VERIFIED');
  assert.deepEqual(touched,['TOL','CASY']);
  assert.equal(second.providerCalls,2);
  assert.equal(second.reusedStoredSymbols,38);
  assert.equal(second.newStoredSymbols,2);
  assert.equal(second.storedSymbols,40);
  assert.equal(second.positiveSymbols,40);
  assert.equal(second.decemberEventRows,40);
  for(const [symbol,bytes] of original)
    assert.equal(fs.readFileSync(path.join(dir,symbol+'.json'),'utf8'),bytes);
  assert.equal(fs.readdirSync(dir).length,40);
  assert.equal(fs.existsSync(path.join(root,'er1-input','dec31-symbol-batch-a.lock')),false);
});

test('invalid preexisting raw file stops without overwriting or calling provider',async t=>{
  const root=temp(t),dir=path.join(root,'er1-input','dec31-symbol-batch-a');
  fs.mkdirSync(dir,{recursive:true});
  const file=path.join(dir,'ADBE.json');
  const malformed='{not-json';
  fs.writeFileSync(file,malformed);
  let calls=0;
  const result=await runDec31Batch({pcHome:root,env:{EARNINGS_API_KEY:key},clock,
    fetcher:async()=>{calls++;throw Error('UNEXPECTED_GET')}});
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.code,'DEC31_BATCH_EXISTING_FILE_INVALID');
  assert.equal(result.providerCalls,0);
  assert.equal(calls,0);
  assert.equal(fs.readFileSync(file,'utf8'),malformed);
  assert.equal(fs.existsSync(path.join(root,'er1-input','dec31-symbol-batch-a.lock')),false);
});
