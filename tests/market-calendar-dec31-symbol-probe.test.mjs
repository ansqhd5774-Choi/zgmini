import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {inspectSymbol,runDec31SymbolProbe} from '../scripts/pc-writer/market-calendar-dec31-symbol-probe.mjs';

const FIXED_TIME=Date.parse('2026-11-04T06:00:00Z');

function workspace(t){
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'dec31-symbol-probe-'));
  t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));
  return folder;
}

test('accepts documented per-symbol shape and extracts only December dates',()=>{
  assert.deepEqual(inspectSymbol([
    {date:'2026-12-10',symbol:'COST',name:'Costco'},
    {date:'2026-09-24',symbol:'COST',name:'Costco'},
    {date:'2026-12-10',symbol:'COST',name:null},
  ],'COST'),{symbol:'COST',totalRows:3,decemberDates:['2026-12-10']});
  assert.throws(()=>inspectSymbol({data:[]},'COST'),/DEC31_SYMBOL_RESPONSE_SHAPE_INVALID/);
  assert.throws(()=>inspectSymbol([{date:'2026-12-10',symbol:'BOX'}],'COST'),/DEC31_SYMBOL_RESPONSE_ROW_INVALID/);
});

test('bounded probe stores private raw response with readback, 3 calls',async t=>{
  const folder=workspace(t);
  const symbols=[];
  const fakeFetch=async url=>{
    const parsed=new URL(url);
    assert.equal(parsed.searchParams.get('apikey'),'test-only-provider-key');
    assert.equal(parsed.pathname,'/v1/earnings');
    symbols.push(parsed.searchParams.get('symbol'));
    const data=[{symbol:parsed.searchParams.get('symbol'),date:'2026-12-10',eps:null}];
    return {ok:true,status:200,text:async()=>JSON.stringify(data)};
  };
  const report=await runDec31SymbolProbe({pcHome:folder,
    env:{EARNINGS_API_KEY:'test-only-provider-key'},fetcher:fakeFetch,clock:()=>FIXED_TIME});
  assert.deepEqual(symbols,['BOX','COST','ORCL']);
  assert.equal(report.status,'PROBE_POSITIVE');
  assert.equal(report.providerCalls,3);
  assert.equal(report.stagedSymbols,3);
  assert.equal(report.decemberEventRows,3);
  assert.equal(report.coreWrites+report.d1Writes+report.schedulerWrites+report.publicationWrites,0);
  assert.ok(fs.existsSync(path.join(folder,'er1-input','dec31-symbol-probe','BOX.json')));
  assert.ok(!fs.existsSync(path.join(folder,'er1-input','dec31-symbol-probe.lock')));
  assert.ok(!JSON.stringify(report).includes('test-only-provider-key'));
});

test('empty December responses remain inconclusive, not PASS',async t=>{
  const folder=workspace(t);
  const report=await runDec31SymbolProbe({pcHome:folder,
    env:{EARNINGS_API_KEY:'test-only-provider-key'},
    fetcher:async url=>({ok:true,status:200,text:async()=>JSON.stringify([
      {symbol:new URL(url).searchParams.get('symbol'),date:'2026-05-04'}])}),
    clock:()=>FIXED_TIME});
  assert.equal(report.status,'INCONCLUSIVE');
  assert.equal(report.decemberEventRows,0);
});

test('rate limit aborts, with no retries or later calls',async t=>{
  const folder=workspace(t);
  let calls=0;
  const report=await runDec31SymbolProbe({pcHome:folder,
    env:{EARNINGS_API_KEY:'test-only-provider-key'},
    fetcher:async()=>{calls++;return {ok:false,status:429}},clock:()=>FIXED_TIME});
  assert.equal(calls,1);
  assert.equal(report.status,'BLOCKED');
  assert.equal(report.code,'DEC31_SYMBOL_RATE_LIMIT_STOP');
  assert.ok(!fs.existsSync(path.join(folder,'er1-input','dec31-symbol-probe.lock')));
});

test('second execution cannot overwrite prior staged raw rows',async t=>{
  const folder=workspace(t);
  let calls=0;
  const opts={pcHome:folder,env:{EARNINGS_API_KEY:'test-only-provider-key'},
    fetcher:async url=>{calls++;return {ok:true,status:200,text:async()=>JSON.stringify([
      {symbol:new URL(url).searchParams.get('symbol'),date:'2026-12-10'}])}},clock:()=>FIXED_TIME};
  assert.equal((await runDec31SymbolProbe(opts)).status,'PROBE_POSITIVE');
  const second=await runDec31SymbolProbe(opts);
  assert.equal(second.status,'BLOCKED');
  assert.equal(second.code,'DEC31_SYMBOL_ALREADY_STAGED');
  assert.equal(calls,3);
});
