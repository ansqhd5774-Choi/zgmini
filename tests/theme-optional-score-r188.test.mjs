import test from 'node:test';import assert from 'node:assert/strict';
import {scoreAll252,regularHour15Rows} from '../scripts/pc-writer/theme-optional-score-r188.mjs';
import {r158ScorePrices} from '../lib/market-score/theme-etf-provisional-score.mjs';
test('recovered R188 engine matches approved R158 trailing scores with the same price inputs',()=>{
 const own=Array.from({length:640},(_,i)=>100+i*.04+Math.sin(i*.17)*3),spy=own.map((_,i)=>90+i*.03+Math.cos(i*.13)*2);
 const all=scoreAll252(own,spy),last=r158ScorePrices(own,spy);
 assert.equal(all.length,252);for(let k=0;k<3;k++)assert.ok(Math.abs(all.at(-1-k)-last[own.length-1-k])<1e-10);
 assert.throws(()=>scoreAll252(own.slice(0,627),spy.slice(0,627)));const bad=[...own];bad[12]=null;assert.throws(()=>scoreAll252(bad,spy));
});
test('historical hourly selector preserves New York early-close and last hourly bar selection',()=>{
 const rows=Array.from({length:628},(_,i)=>({timestamp:new Date(Date.UTC(2024,0,1+i,20)).toISOString(),close:100+i}));
 // Separate chronological range avoids duplicate timestamps.
 rows.push({timestamp:'2025-11-28T17:00:00Z',close:888},{timestamp:'2025-11-28T20:00:00Z',close:999});
 const found=regularHour15Rows(rows).find(p=>p.date==='2025-11-28');assert.equal(found.close,888);
 assert.throws(()=>regularHour15Rows([...rows].reverse()));
});
