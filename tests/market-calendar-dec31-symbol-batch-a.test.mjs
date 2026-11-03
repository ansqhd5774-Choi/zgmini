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
