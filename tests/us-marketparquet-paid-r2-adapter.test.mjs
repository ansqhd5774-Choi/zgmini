import test from 'node:test';
import assert from 'node:assert/strict';
import {preparePaidFullMarketR2,US_PAID_R2_SOURCE}
  from '../lib/market-breadth/us-marketparquet-paid-r2-adapter.mjs';

const before='2026-11-18',today='2026-11-19';
const row=(date,symbol,close)=>({date,symbol,close,volume:100,asset_type:'stock'});
const previousRows=[
  row(before,'UP',10),row(before,'DOWN',10),row(before,'FLAT',10),
];
const currentRows=[
  row(today,'UP',11),row(today,'DOWN',9),row(today,'FLAT',10),
  row(today,'NEW',5),row(today,'OLD-DELISTED',8),
];
const receipt=(date,rows,char)=>({
  schema:'ZGMINI_MP_PAID_FILE_V1',plan:'full',assetType:'stock_daily',date,
  sha256:char.repeat(64),projectionSha256:(char==='a'?'c':'d').repeat(64),
  rows:rows.length,bytes:2048,priceMode:'SPLIT_ADJUSTED_DAILY_CLOSE',
  rawPublished:false,
});
const input=()=>({
  currentRows:[...currentRows],previousRows:[...previousRows],
  currentReceipt:receipt(today,currentRows,'a'),
  previousReceipt:receipt(before,previousRows,'b'),
});

test('full-market paid R2 preserves rising/falling/flat and missing-as-flat',()=>{
  const r=preparePaidFullMarketR2(input());
  assert.equal(r.status,'PAID_R2_PRIVATE_CALCULATED');
  assert.equal(r.prepared,true);
  assert.equal(r.publicationAllowed,false);
  assert.equal(r.source,US_PAID_R2_SOURCE);
  assert.deepEqual(r.privateCounts,{rising:1,unchanged:2,falling:1});
  assert.equal(r.privateQuality.imputedUnchangedCount,1);
  assert.equal(r.privateQuality.observedComparableCount,3);
  assert.equal(r.privateQuality.expectedCount,4);
  assert.deepEqual([
    r.publicPercentPreview.risingPct,r.publicPercentPreview.unchangedPct,
    r.publicPercentPreview.fallingPct,
  ],[25,50,25]);
  assert.equal('counts' in r.publicPercentPreview,false);
  assert.equal('rawRows' in r.publicPercentPreview,false);
});

test('free, incorrect price mode and incomplete receipts cannot be promoted',()=>{
  for(const field of ['plan','priceMode','projectionSha256','rows','rawPublished']){
    const x=input();
    x.currentReceipt={...x.currentReceipt,[field]:{
      plan:'free',priceMode:'UNADJUSTED',projectionSha256:'invalid',
      rows:999,rawPublished:true,
    }[field]};
    const r=preparePaidFullMarketR2(x);
    assert.equal(r.prepared,false,field);
    assert.equal(r.publicationAllowed,false,field);
    assert.equal(r.status,'PAID_R2_SOURCE_RECEIPT_INVALID',field);
  }
});

test('a missing entire previous session is never converted into unchanged',()=>{
  const x=input();
  x.previousRows=x.previousRows.map(r=>({...r,date:'2026-11-17'}));
  x.previousReceipt=receipt('2026-11-17',x.previousRows,'b');
  const r=preparePaidFullMarketR2(x);
  assert.equal(r.prepared,false);
  assert.equal(r.publicationAllowed,false);
  assert.equal(r.status,'PAID_R2_CALCULATION_NON_ADJACENT_TRADING_SESSIONS');
});

test('duplicate or invalid stored source rows fail closed',()=>{
  const duplicate=input();
  duplicate.currentRows.push(row(today,'UP',100));
  duplicate.currentReceipt=receipt(today,duplicate.currentRows,'a');
  assert.equal(preparePaidFullMarketR2(duplicate).status,
    'PAID_R2_CALCULATION_DUPLICATE_SOURCE_SYMBOL');
  const invalid=input();
  invalid.currentRows[0]={...invalid.currentRows[0],close:0};
  assert.equal(preparePaidFullMarketR2(invalid).status,
    'PAID_R2_CALCULATION_INVALID_STORED_PRICE');
});

test('no D1 or network work is performed by the pure paid adapter',()=>{
  const x=input();
  const r=preparePaidFullMarketR2(x);
  assert.equal(r.prepared,true);
  assert.equal(r.publicationAllowed,false);
  assert.equal(r.privateEvidence.currentSha256,'a'.repeat(64));
  assert.equal(r.privateEvidence.previousSha256,'b'.repeat(64));
});
