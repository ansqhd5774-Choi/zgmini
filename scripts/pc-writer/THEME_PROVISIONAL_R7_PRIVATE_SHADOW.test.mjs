import assert from 'node:assert/strict';
import test from 'node:test';
import {scoreAll252} from './r7_approved/theme-optional-score-r188.mjs';
import {calculateApprovedSpaceBasket} from './r7_approved/theme-space-satellite-basket-r27-pure.mjs';
import {calculateDcPrivate} from './THEME_PROVISIONAL_R7_PRIVATE_SHADOW.mjs';

const baseDate='2026-10-23',nextDate='2026-10-26';
const score=(a,b)=>Number(((a+b)/2).toFixed(5));

test('R188 approved 628-session private baseline and 629th appended observation',()=>{
 const epoch=Date.parse(baseDate+'T00:00:00Z');
 const dates=Array.from({length:628},(_,i)=>
  new Date(epoch-(627-i)*86400000).toISOString().slice(0,10));
 const spy=dates.map((_,i)=>100+i*.03+Math.sin(i/8)*2);
 const dtcr=dates.map((_,i)=>40+i*.05+Math.sin(i/6)*3);
 const grid=dates.map((_,i)=>20+i*.025+Math.cos(i/9));
 const series={SPY:spy,DTCR:dtcr,GRID:grid};
 const daily=Object.fromEntries(Object.entries(series).map(([s,prices])=>
  [s,new Map(dates.map((date,i)=>[date,prices[i]]))]));
 const p=Object.fromEntries(Object.entries(series).map(([s,v])=>[s,v.at(-1)]));
 const latest={SPY:spy.at(-1)*1.005,DTCR:dtcr.at(-1)*1.011,GRID:grid.at(-1)*0.993};
 const r=calculateDcPrivate({tables:{daily,dates},base:p,next:latest});
 assert.equal(r.baseScore,score(scoreAll252(dtcr,spy).at(-1),scoreAll252(grid,spy).at(-1)));
 assert.equal(r.nextScore,score(scoreAll252([...dtcr,latest.DTCR],[...spy,latest.SPY]).at(-1),
  scoreAll252([...grid,latest.GRID],[...spy,latest.SPY]).at(-1)));
 assert.throws(()=>calculateDcPrivate({tables:{daily,dates},base:{...p,DTCR:p.DTCR*1.08},
  next:latest}),/R7_DC_PRICE_MODE_MISMATCH_DTCR/);
});

test('R32 approved AUM three-ETF basket does not backfill missing WARP',()=>{
 const dates=[baseDate,nextDate],symbols=['UFO','NASA','WARP','ROKT'];
 const value={UFO:30,NASA:50,WARP:75,ROKT:40};
 const aum={UFO:4,NASA:8,WARP:2,ROKT:3};
 const timelines=Object.fromEntries(symbols.map(s=>[s,dates.map(date=>({
  date,score:date===nextDate&&s==='WARP'?null:value[s],
  status:date===nextDate&&s==='WARP'?'INSUFFICIENT_REAL_OBSERVATIONS':'ADAPTIVE_PROVISIONAL'}))]));
 const observed=Object.fromEntries(symbols.map(s=>[s,new Set(
  s==='WARP'?[baseDate]:dates)]));
 const sessionCounts=Object.fromEntries(symbols.map(s=>[s,new Map(
  [[baseDate,120],[nextDate,s==='WARP'?120:121]])]));
 const aumEvidence=symbols.map(s=>({symbol:s,aumUsd:aum[s],aumAsOf:baseDate,
  issuerUrl:'https://example.org/'+s}));
 const basket=calculateApprovedSpaceBasket({dates,symbols,timelines,observed,
  sessionCounts,aumEvidence,scoreAsOf:nextDate,historicalSingleContinuity:true});
 assert.deepEqual(basket.latest.etfs,['UFO','NASA','ROKT']);
 assert.equal(basket.latest.status,'APPROVED_THREE_PLUS_AUM');
 assert.equal(basket.latest.weightsPercent.WARP,undefined);
 const manual=Number(((value.UFO*4+value.NASA*8+value.ROKT*3)/15).toFixed(5));
 assert.equal(basket.latest.score,manual);
 assert.ok(basket.history[0].etfs.includes('WARP'));
});
