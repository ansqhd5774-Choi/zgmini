import test from 'node:test';
import assert from 'node:assert/strict';
import {R158_SYMBOLS,R158_PAIRS,r158ScorePrices,buildPrivateThemeTwoDayCandidate} from '../lib/market-score/theme-etf-provisional-score.mjs';
import {validThemeEtfProvisional} from '../lib/market-score/theme-etf-provisional.mjs';
const date=x=>new Date(Date.UTC(2023,0,2)+x*86400000).toISOString().slice(0,10);
function inputs(){
 const days=Array.from({length:701},(_,i)=>date(i));
 const joined=Object.fromEntries(R158_SYMBOLS.map((ticker,j)=>[ticker,{days:days.map((date,i)=>({
  date,proxyClose:100+(j+1)*.8+i*.043+Math.sin((i+j)/19)*3.1
 }))}]));
 const scores=Object.fromEntries(R158_SYMBOLS.slice(1).map(t=>[
  t,r158ScorePrices(joined[t].days.map(d=>d.proxyClose),joined.SPY.days.map(d=>d.proxyClose))[700]
 ]));
 const confirmed={observationDate:days.at(-1),themes:R158_PAIRS.map(([theme,etfs])=>({theme,etfs,
  score:Number(((scores[etfs[0]]+scores[etfs[1]])/2).toFixed(5))}))};
 const rows=[701,702].map(i=>({date:date(i),prices:Object.fromEntries(R158_SYMBOLS.map((t,j)=>[t,100+(j+1)*.8+i*.043+Math.sin((i+j)/19)*3.1]))}));
 return {joined,confirmed,newPrices:rows,sourceName:'FIXTURE_NO_PROVIDER',sourceStoredAt:'2026-10-21T04:00:00Z',asOf:'2026-10-21T04:00:00Z'};
}
test('R158 actual R135 price-axis shape, unchanged 40:20:40 and two matching ETF days',()=>{
 const i=inputs(),result=buildPrivateThemeTwoDayCandidate(i);
 assert.equal(result.status,'PRIVATE_RESEARCH_READY_NOT_PUBLIC');
 assert.equal(result.points.length,2);
 assert.equal(result.points[0].date,i.newPrices[0].date);
 assert.equal(Object.keys(result.points[1].scores).length,7);
 assert.ok(Object.values(result.points[1].scores).every(x=>Number.isFinite(x)&&x>=0&&x<=100));
 assert.equal(result.publicationAuthorized,false);
 assert.equal(result.upstreamCommercialRightsVerified,false);
 assert.equal(result.sourcePriceReconciled,false);
 assert.equal(validThemeEtfProvisional(result,i.confirmed.observationDate,{now:Date.parse('2026-10-21T05:00:00Z'),themes:i.confirmed.themes}),false);
});
test('R158 single newer session allowed and no estimate of a second date',()=>{
 const i=inputs();i.newPrices=i.newPrices.slice(0,1);
 const result=buildPrivateThemeTwoDayCandidate(i);
 assert.equal(result.points.length,1);
 assert.equal(result.points[0].date,i.newPrices[0].date);
});
test('R158 rejects missing ETF/SPY, copied dates, synthetic zero and formula baseline drift',()=>{
 const configs=[inputs(),inputs(),inputs(),inputs()];
 delete configs[0].newPrices[0].prices.SPY;
 configs[1].newPrices[1].date=configs[1].newPrices[0].date;
 configs[2].newPrices[0].prices.BOTZ=0;
 configs[3].confirmed.themes[0].score+=2;
 for(const input of configs)assert.throws(()=>buildPrivateThemeTwoDayCandidate(input),/THEME_R158_/);
});
