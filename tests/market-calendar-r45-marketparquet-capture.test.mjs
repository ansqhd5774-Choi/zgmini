import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {captureR45MarketParquetPair,R45_CAPTURE_DIR} from '../scripts/pc-writer/market-calendar-r45-marketparquet-capture.mjs';

const previousDate='2026-10-29',tradeDate='2026-10-30';
const now=Date.parse('2026-10-31T10:00:00Z');
const rows=date=>Array.from({length:3000},(_,i)=>({date,symbol:`S${i}`,
  asset_type:'stock',close:10+i/100,volume:10000+i}));
const fixture=()=>({tradeDate,previousDate,previousRows:rows(previousDate),currentRows:rows(tradeDate),now});

test('R45 writes only the already-downloaded full-market day rows to private PC files',()=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r45-'));
 try{
  const input={base,...fixture()};const result=captureR45MarketParquetPair(input);
  assert.equal(result.status,'R45_PRIVATE_REUSE_READY');
  assert.equal(result.providerCalls,0);
  assert.equal(result.dbWrites,0);
  assert.equal(result.remoteWrites,0);
  assert.equal(result.previous.tickerCount,3000);
  const target=path.join(base,R45_CAPTURE_DIR,`stock_daily_${tradeDate}.json`);
  assert.ok(fs.existsSync(target));
  const stored=JSON.parse(fs.readFileSync(target,'utf8'));
  assert.equal(stored.publicFeed,false);
  assert.equal(stored.redistribution,false);
  assert.equal(stored.rows.length,3000);
  assert.equal(stored.rows[0].ticker,'S0');
  const again=captureR45MarketParquetPair(input);
  assert.equal(again.current.status,'ALREADY_STORED');
  const conflicting=fixture();conflicting.currentRows[0].close+=1;
  assert.equal(captureR45MarketParquetPair({base,...conflicting}).status,'R45_SOURCE_CONFLICT_PRESERVED');
  assert.deepEqual(JSON.parse(fs.readFileSync(target,'utf8')),stored);
 }finally{fs.rmSync(base,{recursive:true,force:true});}
});

test('R45 refuses sparse days and conflicting share-row observations before writing',()=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r45-'));
 try{
  assert.throws(()=>captureR45MarketParquetPair({base,...fixture(),currentRows:rows(tradeDate).slice(0,500)}),
    /R45_FULL_STOCK_COVERAGE_INVALID/);
  assert.equal(fs.existsSync(path.join(base,R45_CAPTURE_DIR)),false);
  const conflict=fixture();conflict.currentRows.push({...conflict.currentRows[0],close:999});
  assert.throws(()=>captureR45MarketParquetPair({base,...conflict}),/R45_DUPLICATE_TICKER_CONFLICT/);
  assert.equal(fs.existsSync(path.join(base,R45_CAPTURE_DIR)),false);
 }finally{fs.rmSync(base,{recursive:true,force:true});}
});

test('R45 treats damaged previously stored data as a conflict without replacing it',()=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r45-'));
 try{
  const input={base,...fixture()};captureR45MarketParquetPair(input);
  const target=path.join(base,R45_CAPTURE_DIR,`stock_daily_${tradeDate}.json`);
  const damaged=JSON.parse(fs.readFileSync(target,'utf8'));
  damaged.rows[0].close=987654;
  fs.writeFileSync(target,JSON.stringify(damaged));
  const result=captureR45MarketParquetPair(input);
  assert.equal(result.current.status,'CONFLICT_PRESERVED');
  assert.equal(JSON.parse(fs.readFileSync(target,'utf8')).rows[0].close,987654);
 }finally{fs.rmSync(base,{recursive:true,force:true});}
});

test('R45 excludes invalid volume rows rather than coercing fractional trades',()=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r45-'));
 try{
  const input={base,...fixture()};input.currentRows[0].volume=100.5;
  const result=captureR45MarketParquetPair(input);
  assert.equal(result.current.tickerCount,2999);
  const target=path.join(base,R45_CAPTURE_DIR,`stock_daily_${tradeDate}.json`);
  assert.equal(JSON.parse(fs.readFileSync(target,'utf8')).rows.some(x=>x.ticker==='S0'),false);
 }finally{fs.rmSync(base,{recursive:true,force:true});}
});
