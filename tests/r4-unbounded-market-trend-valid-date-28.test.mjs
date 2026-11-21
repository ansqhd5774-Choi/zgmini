import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeMarketTrendPointsR4} from '../lib/market-score/market-trend-normalize-r4.mjs';
import {marketTrendWindowR1} from '../lib/market-score/market-trend-window-r1.mjs';

test('W06 #28 no publication timestamp must not promote normalized impossible days to reconstructed chart points',()=>{
 const stored=[
  {label:'2026-11-28',value:0,status:'READY'},
  {label:'2026-11-31',value:91,status:'READY'},
  {label:'2026-02-30',value:99,status:'READY'},
  {label:'2026-11-29',value:42,status:'READY'},
 ];
 const original=structuredClone(stored);
 const accepted=normalizeMarketTrendPointsR4(stored,null);
 assert.deepEqual(accepted,[
  {label:'2026-11-28',value:0},{label:'2026-11-29',value:42},
 ],'impossible YYYY-MM-DD dates cannot be silently normalized into new dates');
 assert.deepEqual(stored,original,'public chart normalization never changes original snapshot');
 for(const days of [1,7,30,90,180,365]){
  const points=marketTrendWindowR1(accepted,days,{includeBoundaryCarry:false});
  assert.equal(points.at(-1)?.label,'2026-11-29',String(days));
  assert.ok(points.every(p=>p.label!=='2026-11-31'&&p.label!=='2026-02-30'));
 }
});

test('W06 #28 unbounded history still rejects ambiguous local datetime and malformed formats',()=>{
 const stored=[
  {date:'2026-11-29T12:00:00',score:99},
  {date:'2026-11-29T12:00:00+09:00',score:53},
  {date:'2026-11-29T03:00:00.000Z',score:53},
  {date:'2026-11-29T99:00:00Z',score:65},
  {date:'2026-13-01',score:90},
  {date:'2026-11-29',score:0},
 ];
 assert.deepEqual(normalizeMarketTrendPointsR4(stored,undefined),[
  {label:'2026-11-29T12:00:00+09:00',value:53},
  {label:'2026-11-29T03:00:00.000Z',value:53},
  {label:'2026-11-29',value:0},
 ]);
});

test('W06 #28 legitimate published-day scores remain compatible without a publisher timestamp',()=>{
 const stored=[
  {label:'2026-11-28',value:0,status:'READY'},
  {label:'2026-11-29',value:100,status:'READY'},
  {label:'2026-11-30',value:55,status:'PROVISIONAL'},
  {label:'2026-11-29',value:null,status:'READY'},
 ];
 assert.deepEqual(normalizeMarketTrendPointsR4(stored),[
  {label:'2026-11-28',value:0},{label:'2026-11-29',value:100},
 ]);
 assert.deepEqual(normalizeMarketTrendPointsR4(stored,'2026-11-28T23:59:00.000Z'),[
  {label:'2026-11-28',value:0},
 ]);
});
