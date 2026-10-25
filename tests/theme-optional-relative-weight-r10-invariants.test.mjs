import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreRelativeThemeBasket} from '../scripts/pc-writer/theme-optional-relative-weight-r4.mjs';

const etf=(i,sessions,score=50)=>({
 symbol:`ETF${String(i).padStart(3,'0')}`,
 sessions,score,
 status:sessions>=377?'R188_COMPATIBLE':'ADAPTIVE_PROVISIONAL',
});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-11,`${a} != ${b}`);

test('R10: the unapproved R4-A shadow works with 2/3/4/5/10/25/100 ETFs, never a hard 3 cap',()=>{
 for(const count of [2,3,4,5,10,25,100]){
  const entries=Array.from({length:count},(_,i)=>etf(i+1,[700,377,252,144,120,80,40][i%7],(i*17)%101));
  const result=scoreRelativeThemeBasket({etfs:entries});
  assert.equal(Object.keys(result.weights).length,count);
  near(Object.values(result.weights).reduce((a,b)=>a+b,0),1);
  near(result.score,entries.reduce((sum,row)=>sum+result.weights[row.symbol]*row.score,0));
  const reversed=scoreRelativeThemeBasket({etfs:[...entries].reverse()});
  near(reversed.score,result.score);
  for(const row of entries)near(reversed.weights[row.symbol],result.weights[row.symbol]);
  assert.equal(result.publicationAuthorized,false);
 }
});

test('R10: equal maturity is symmetric at any N and maturity dominance is never inverted',()=>{
 for(const count of [2,3,4,5,10,25]){
  const equal=scoreRelativeThemeBasket({etfs:Array.from({length:count},(_,i)=>etf(i+1,120))});
  for(const weight of Object.values(equal.weights))near(weight,1/count);
  const mixed=scoreRelativeThemeBasket({etfs:Array.from({length:count},(_,i)=>etf(i+1,i===0?700:40))});
  assert.ok(mixed.weights.ETF001>mixed.weights.ETF002);
  for(let i=3;i<=count;i++)near(mixed.weights.ETF002,mixed.weights[`ETF${String(i).padStart(3,'0')}`]);
 }
});

test('R10: approved long + 40-day pair stays 70:30; 39-day and one-ETF scores stay blocked',()=>{
 const out=scoreRelativeThemeBasket({etfs:[etf(1,700),etf(2,40)]});
 near(out.weights.ETF001,.70);
 near(out.weights.ETF002,.30);
 assert.throws(()=>scoreRelativeThemeBasket({etfs:[etf(1,700),etf(2,39)]}),/INSUFFICIENT_REAL_SESSIONS/);
 assert.throws(()=>scoreRelativeThemeBasket({etfs:[etf(1,700)]}),/AT_LEAST_TWO/);
});
