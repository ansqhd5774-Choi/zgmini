import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rankR43Issuers, r43ImportanceIndex, selectR43ReviewedExceptions,
  R43_REVIEWED_EXCEPTION_POLICY,
} from '../lib/market-calendar-r43-issuer-rank.mjs';

const day = '2026-10-30', now = Date.parse('2026-10-31T12:00:00Z');
const five = ['BRK.A', 'ARM', 'ANET', 'SHOP', 'DE'];
const sample = () => {
  const rows = Array.from({length:200},(_,i)=>({
    ticker:`Q${i}`, eligible:true, tradeDate:day,
    price:50+i, volume:1_000+i*10, relativeVolume:1+i/100,
    dividendYield:i/100, eps:1+i/20,
    epsGrowthPct:i/5, dailyChangePct:i/10,
  }));
  for (let i=0;i<five.length;i++)
    rows[i] = {...rows[i], ticker:five[i], price:2, volume:1, relativeVolume:.2,
      dividendYield:0, eps:null, epsGrowthPct:null, dailyChangePct:0};
  rows.push({...rows[0], ticker:'BRK-B'}); // One issuer, two classes.
  return rows;
};

test('reviewed five take slots, scores and original ranks are unchanged, total stays 5%',()=>{
  const base = rankR43Issuers(sample(),{asOf:day,expectedEligibleIssuers:200});
  const before = JSON.stringify(base);
  assert.equal(base.status,'READY_SHADOW');
  assert.equal(base.topCount,10);
  assert.ok(r43ImportanceIndex(base,{now}));
  const result = selectR43ReviewedExceptions(base);
  assert.equal(JSON.stringify(base),before);
  assert.equal(result.selectionPolicy,R43_REVIEWED_EXCEPTION_POLICY);
  assert.deepEqual(result.reviewedExceptionsApplied,['BERKSHIRE','ARM','ANET','SHOP','DE']);
  assert.equal(result.rankings.filter(row=>row.importance===3).length,10);
  for (let i=0;i<result.rankings.length;i++) {
    assert.equal(result.rankings[i].rank,base.rankings[i].rank);
    assert.equal(result.rankings[i].score,base.rankings[i].score);
  }
  const index = r43ImportanceIndex(result,{now});
  assert.ok(index);
  for (const ticker of [...five,'BRK-B']) {
    assert.equal(index.get(ticker),3,ticker);
    const row = result.rankings.find(r=>r.tickers.includes(ticker));
    assert.equal(row.selectionReason,'REVIEWED_EXCEPTION');
  }
  assert.equal([...result.rankings].filter(r=>r.selectionReason==='MODEL_SCORE').length,5);
  assert.throws(()=>selectR43ReviewedExceptions(result),/R43_REVIEWED_INPUT_NOT_VERIFIED/);
  assert.throws(()=>selectR43ReviewedExceptions({
    ...base,rankings:base.rankings.map((r,i)=>i===0?{...r,importance:null}:r),
  }),/R43_REVIEWED_INPUT_NOT_VERIFIED/);
});

test('review policy never fabricates an absent ticker and rejects any quota/reason tampering',()=>{
  const rows=sample().filter(row=>row.ticker!=='DE');
  rows.push({ ...rows[rows.length-1], ticker:'OTHER1' });
  const base=rankR43Issuers(rows,{asOf:day,expectedEligibleIssuers:200});
  const result=selectR43ReviewedExceptions(base);
  assert.deepEqual(result.reviewedExceptionsApplied,['BERKSHIRE','ARM','ANET','SHOP']);
  assert.equal(result.rankings.some(r=>r.tickers.includes('DE')),false);
  assert.equal(result.rankings.filter(r=>r.importance===3).length,10);
  assert.ok(r43ImportanceIndex(result,{now}));

  const change=patch=>({
    ...result, rankings:result.rankings.map((r,i)=>i===0?{...r,...patch}:r),
  });
  assert.equal(r43ImportanceIndex(change({selectionReason:'REVIEWED_EXCEPTION'}),{now}),null);
  assert.equal(r43ImportanceIndex(change({importance:null}),{now}),null);
  assert.equal(r43ImportanceIndex({...result,selectionPolicy:'UNKNOWN_OVERRIDE'},{now}),null);
  assert.equal(r43ImportanceIndex({...result,reviewedExceptionsApplied:['ARM']},{now}),null);
});

test('five exceptions cannot exceed a smaller universe quota',()=>{
  const rows=sample().slice(0,40);
  const base=rankR43Issuers(rows,{asOf:day,expectedEligibleIssuers:40});
  assert.equal(base.status,'READY_SHADOW');
  assert.equal(base.topCount,2);
  assert.throws(()=>selectR43ReviewedExceptions(base),
    /R43_REVIEWED_EXCEPTIONS_EXCEED_OR_CONFLICT_WITH_QUOTA/);
});
