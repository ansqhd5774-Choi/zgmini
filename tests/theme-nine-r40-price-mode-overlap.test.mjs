import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {analyzeNineR40Overlap} from '../scripts/pc-writer/theme-nine-r40-price-mode-overlap.mjs';

const roster=JSON.parse(readFileSync(new URL('../config/theme-nine-r20-approved-candidates.json',
 import.meta.url),'utf8'));
const names=[...new Set(roster.groups.flatMap(g=>g.tickers.map(t=>t.ticker)))].sort();
const dates=['2026-10-21','2026-10-22','2026-10-23','2026-10-26'];
const rows=(date,index)=>['SPY',...names].map((symbol,i)=>({
 date,symbol,asset_type:'ETF',close:100+i+index*2
}));
const raw=()=>new Map(['SPY',...names].map((symbol,i)=>[symbol,
 dates.slice(0,3).map((date,j)=>({date,close:99+i+j*2}))]));
const eod=()=>new Map(dates.map((d,i)=>[d,rows(d,i)]));

test('R40 reads saved EOD/SPY coverage, measures 1h overlaps, never certifies price mode',()=>{
 const r=analyzeNineR40Overlap({roster,eodByDate:eod(),proxyBySymbol:raw(),
  inventoryCount:4});
 assert.equal(r.status,'SOURCE_AUDIT_COMPLETE_PRICE_MODE_BRIDGE_NOT_CERTIFIED');
 assert.equal(r.eodNextDayETFCount,63);
 assert.equal(r.r23AndEodOverlapSymbols,63);
 assert.equal(r.r23AndEodTwoOrMoreDates,63);
 assert.equal(r.spyOverlap.overlapSessions,3);
 assert.equal(r.spyOverlap.returnIntervalsCompared,2);
 assert.equal(r.maturityByETF.BOTZ.observedSavedEodWithSpy,4);
 assert.equal(r.maturityByETF.BOTZ.atLeast40,false);
 assert.equal(r.priceModeAlignmentAuthorized,false);
 assert.equal(r.publicationAuthorized,false);
 assert.equal(r.providerCalls,0);
});
test('R40 preserves missing ticker state and refuses to treat one overlap as return parity',()=>{
 const absent=new Set(['CABZ','CBOT','GNMX','KYC','LATR','LLMA','RBTX','WR','XA']);
 const priceDays=eod();
 for(const [date,rs] of priceDays){
  priceDays.set(date,rs.filter(r=>!absent.has(r.symbol)));
 }
 const proxy=raw();
 for(const [symbol] of proxy)proxy.set(symbol,
  proxy.get(symbol).filter(x=>x.date==='2026-10-23'));
 const r=analyzeNineR40Overlap({roster,eodByDate:priceDays,
  proxyBySymbol:proxy,inventoryCount:4});
 assert.equal(r.eodNextDayETFCount,54);
 assert.equal(r.r23AndEodOverlapSymbols,54);
 assert.equal(r.r23AndEodTwoOrMoreDates,0);
 assert.equal(r.etfComparison.CABZ.overlapSessions,0);
 assert.equal(r.etfComparison.ROBO.returnIntervalsCompared,0);
 assert.equal(r.maturityByETF.CABZ.observedSavedEodWithSpy,0);
 assert.equal(r.maturityByETF.CABZ.atLeast40,false);
 assert.equal(r.publicationAuthorized,false);
});
test('R40 does not accept duplicated EOD symbols, corrupt prices or wrong dates',()=>{
 const bad=eod();
 bad.get('2026-10-23').push({...bad.get('2026-10-23')[1]});
 assert.throws(()=>analyzeNineR40Overlap({roster,eodByDate:bad,
  proxyBySymbol:raw(),inventoryCount:4}),/EOD_DRIFT/);
 const zero=eod();
 zero.get('2026-10-23')[0].close=0;
 assert.throws(()=>analyzeNineR40Overlap({roster,eodByDate:zero,
  proxyBySymbol:raw(),inventoryCount:4}),/EOD_DRIFT/);
 const wrong=eod();
 wrong.get('2026-10-23')[0].date='2026-10-22';
 assert.throws(()=>analyzeNineR40Overlap({roster,eodByDate:wrong,
  proxyBySymbol:raw(),inventoryCount:4}),/EOD_DRIFT/);
});
test('R40 rejects missing SPY raw proxy rather than inferring it',()=>{
 const proxies=raw();proxies.delete('SPY');
 assert.throws(()=>analyzeNineR40Overlap({roster,eodByDate:eod(),
  proxyBySymbol:proxies,inventoryCount:4}),/PROXY_MISSING_SPY/);
});
