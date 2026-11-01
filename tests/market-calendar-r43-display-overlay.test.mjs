import test from 'node:test';
import assert from 'node:assert/strict';
import {rankR43Issuers,r43ImportanceIndex,selectR43ReviewedExceptions,
 R43_REVIEWED_EXCEPTION_POLICY} from '../lib/market-calendar-r43-issuer-rank.mjs';
import {makeR43MarketImportanceDisplay,r43MarketImportanceDisplayIndex,
 withR43MarketImportanceBadge,R43_MARKET_IMPORTANCE_PUBLIC_KEY} from '../lib/market-calendar-r43-display-overlay.mjs';

const asOf='2026-10-31',now=Date.parse('2026-11-01T12:00:00Z');
const rows=Array.from({length:2634},(_,i)=>({ticker:`T${i}`,eligible:true,
 tradeDate:asOf,price:10+i,volume:100+i,relativeVolume:1+i/10000,
 dividendYield:i%10,eps:i/10,dailyChangePct:i%5,epsGrowthPct:i%30}));
const rank=rankR43Issuers(rows,{asOf});

test('R43 output is strictly separate from annual FHS-R3 public key and contains only identifier data',()=>{
 const compact=makeR43MarketImportanceDisplay(rank,{now});
 const index=r43MarketImportanceDisplayIndex(compact,{now});
 assert.equal(rank.status,'READY_SHADOW');
 assert.equal(compact.topCount,132);
 assert.equal(compact.selected.length,132);
 assert.equal(index.size,132);
 assert.notEqual(R43_MARKET_IMPORTANCE_PUBLIC_KEY,'market-calendar:fhs-r3-annual');
 assert.deepEqual(Object.keys(compact.selected[0]),['issuerId','tickers']);
 assert.equal(Object.hasOwn(compact,'rankings'),false);
 assert.doesNotMatch(JSON.stringify(compact.selected),/price|volume|score|financialHealth|provider|rawVendor/i);
});

test('market importance badge is additive: never overwrites FHS annual grade stars',()=>{
 const compact=makeR43MarketImportanceDisplay(rank,{now});
 const index=r43MarketImportanceDisplayIndex(compact,{now});
 const ticker=compact.selected[0].tickers[0];
 const html=`<article class="mc-row mc-vendor-row"><div class=mc-importance aria-label="재무건전성 별 1개">★</div><div class=mc-event><span>Issuer (${ticker})</span><span class=mc-tag-status>예정 · 미확정</span></div></article>`;
 const decorated=withR43MarketImportanceBadge(html,[ticker],index,{asOf});
 assert.match(decorated,/재무건전성 별 1개">★<\/div>/);
 assert.match(decorated,/aria-label="시장 중요도 별 3개"/);
 assert.match(decorated,/시장 중요도 ★★★/);
 assert.equal(withR43MarketImportanceBadge(decorated,[ticker],index,{asOf}),decorated);
 assert.equal(withR43MarketImportanceBadge(html,['NOT_SELECTED'],index,{asOf}),html);
});

test('missing, tampered, or stale R43 compact output cannot produce a badge',()=>{
 const compact=makeR43MarketImportanceDisplay(rank,{now});
 const index=r43MarketImportanceDisplayIndex(compact,{now});
 assert.equal(r43MarketImportanceDisplayIndex(null,{now}),null);
 assert.ok(r43MarketImportanceDisplayIndex(compact,{now:Date.parse('2026-12-01T00:00:00Z')}),
   'annual manual data must remain visible beyond a seven-day window');
 assert.ok(r43ImportanceIndex(rank,{now:Date.parse('2026-12-01T00:00:00Z')}));
 assert.equal(r43MarketImportanceDisplayIndex(compact,{now:Date.parse('2028-01-01T00:00:00Z')}),null);
 assert.equal(r43ImportanceIndex(rank,{now:Date.parse('2028-01-01T00:00:00Z')}),null);
 assert.equal(r43MarketImportanceDisplayIndex({...compact,topCount:133},{now}),null);
 assert.equal(r43MarketImportanceDisplayIndex({...compact,priceVolumeCoverage:.1},{now}),null);
 assert.equal(r43MarketImportanceDisplayIndex({...compact,selected:[...compact.selected.slice(1),compact.selected[1]]},{now}),null);
 assert.equal(withR43MarketImportanceBadge('<div class=mc-event><span>X</span></div>',[],index,{asOf}),'<div class=mc-event><span>X</span></div>');
});

test('reviewed BRK/ARM/ANET/SHOP/DE exceptions survive noncontiguous rank flags within 132 quota',()=>{
 const reviewedRows=rows.map((row,i)=>({...row,
  ticker:['BRK.A','ARM','ANET','SHOP','DE'][i]??row.ticker}));
 reviewedRows.push({...reviewedRows[0],ticker:'BRK.B',price:12,volume:100});
 const original=rankR43Issuers(reviewedRows,{asOf});
 const selected=selectR43ReviewedExceptions(original);
 const compact=makeR43MarketImportanceDisplay(selected,{now});
 const index=r43MarketImportanceDisplayIndex(compact,{now});
 assert.equal(compact.selectionPolicy,R43_REVIEWED_EXCEPTION_POLICY);
 assert.deepEqual(compact.reviewedExceptionsApplied,['BERKSHIRE','ARM','ANET','SHOP','DE']);
 assert.equal(compact.selected.length,132);
 assert.equal(new Set(compact.selected.map(row=>row.issuerId)).size,132);
 for(const ticker of ['BRK.A','BRK.B','ARM','ANET','SHOP','DE']){
  assert.equal(index.get(ticker),3,`${ticker} missing reviewed ★★★`);
 }
 assert.ok(compact.selected.some(row=>row.selectionReason==='REVIEWED_EXCEPTION'));
 assert.ok(compact.selected.some(row=>row.selectionReason==='MODEL_SCORE'));
 assert.ok(compact.selected.some(row=>!original.rankings.slice(0,132).some(old=>old.issuerId===row.issuerId)));
 const annual='<article><div class=mc-importance aria-label="재무건전성 별 1개">★</div><div class=mc-event><span>ARM (ARM)</span></div></article>';
 const html=withR43MarketImportanceBadge(annual,['ARM'],index,{asOf});
 assert.match(html,/재무건전성 별 1개">★<\/div>/);
 assert.match(html,/시장 중요도 ★★★/);
 assert.equal(r43MarketImportanceDisplayIndex({...compact,reviewedExceptionsApplied:['ARM']},{now}),null);
});
