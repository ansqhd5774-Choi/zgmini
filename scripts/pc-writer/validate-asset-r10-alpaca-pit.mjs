import fs from 'node:fs';import path from 'node:path';
import {base,saveReport} from './asset-r10-storage.mjs';
import {isMarketSession} from '../../lib/market-score/breadth-b1-r3-calendar.mjs';
import {priceWindowQuarantined,R10_PRICE_DISCONTINUITIES} from '../../lib/market-score/asset-r10-price-quarantine.mjs';
const dir=path.join(base,'asset-r10-alpaca');const prices=new Map();
for(const name of fs.readdirSync(dir).filter(n=>/^group-\d+\.json$/.test(n)))for(const r of JSON.parse(fs.readFileSync(path.join(dir,name)))){
 const map=prices.get(r.ticker)??new Map();if(map.has(r.tradeDate)&&map.get(r.tradeDate)!==r.currentClose)throw Error('ALPACA_CONFLICT');map.set(r.tradeDate,r.currentClose);prices.set(r.ticker,map);
}
const pit=JSON.parse(fs.readFileSync(path.join(base,'local-asset-bubble-r10-pit-compatible-universe.json')));
const reference=JSON.parse(fs.readFileSync(path.join(base,'local-asset-bubble-r10-core-price-candidate.json')));
const groups=new Map();let overlap=0;
for(const r of reference.rows){const value=prices.get(r.ticker)?.get(r.tradeDate);if(!value)continue;overlap++;const g=groups.get(r.ticker)??[];g.push(Math.abs(value/r.currentClose-1));groups.set(r.ticker,g);}
const comparison=[...groups].map(([ticker,values])=>{values.sort((a,b)=>a-b);return {ticker,overlap:values.length,medianRelativeDifference:values[Math.floor(values.length/2)],maxRelativeDifference:values.at(-1),aboveOnePercent:values.filter(v=>v>.01).length};});
// Official special closure: Nasdaq ECA2024-632. R10-only correction;
// leave production calendar unchanged until independently reviewed.
const calendar=[];for(let d=new Date('2023-10-02T00:00:00Z');d.toISOString().slice(0,10)<=pit.verifiedThrough;d.setUTCDate(d.getUTCDate()+1)){const date=d.toISOString().slice(0,10);if(isMarketSession(date)&&date!=='2025-01-09')calendar.push(date);}
const rows=pit.eligibleUniverses.map(u=>{
 const window=calendar.filter(d=>d<=u.tradeDate).slice(-200);let valid=0,above=0;const missing=[];
 for(const ticker of u.members){const map=prices.get(ticker);if(priceWindowQuarantined(ticker,window)||window.length!==200||!window.every(d=>map?.has(d))){missing.push(ticker);continue;}valid++;if(map.get(u.tradeDate)>window.reduce((n,d)=>n+map.get(d),0)/200)above++;}
 const coverage=valid/u.members.length;return {observationDate:u.tradeDate,members:u.members.length,valid200:valid,above200:above,coverage,participation:coverage>=.98?above/valid:null,missing};
});
const ready=rows.filter(r=>r.participation!==null);const chart=rows.filter(r=>r.observationDate>='2025-10-10');
saveReport('alpaca-pit-validation',{checkedAt:new Date().toISOString(),providerRequests:0,originalMutation:false,quarantinedEvents:R10_PRICE_DISCONTINUITIES,overlapPairs:overlap,comparison,readyObservations:ready.length,firstReady:ready[0]?.observationDate??null,latest:rows.at(-1),chartObservations:chart.length,chartReadyObservations:chart.filter(r=>r.participation!==null).length,priceAdjustmentVerified:false,reason:'IEX_VENUE_AND_SOURCE_DIFFERENCES_REQUIRE_REVIEW',rows});
console.log(JSON.stringify({overlapPairs:overlap,readyObservations:ready.length,firstReady:ready[0]?.observationDate,latest:rows.at(-1),chartObservations:chart.length,chartReadyObservations:chart.filter(r=>r.participation!==null).length,highMedianDifference:comparison.filter(r=>r.medianRelativeDifference>.01)},null,2));
