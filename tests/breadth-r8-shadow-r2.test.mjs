import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBreadthR8Components} from '../lib/market-score/breadth-r8-shadow.mjs';
import {BREADTH_R8_SHADOW_R2_METHOD,buildBreadthR8ComponentsR2} from '../lib/market-score/breadth-r8-shadow-r2.mjs';

function dateAt(day){return new Date(Date.UTC(2025,0,1)+day*86400000).toISOString().slice(0,10)}
function fixture(days=360,tickers=500){
  const members=Array.from({length:tickers},(_,i)=>`T${String(i).padStart(3,'0')}`);
  const rows=[];
  for(let d=0;d<days;d++){
    const tradeDate=dateAt(d);
    for(let i=0;i<tickers;i++){
      const rising=i<tickers/2;
      const slope=rising?0.1:-0.05;
      const currentClose=200+slope*d;
      const previousClose=200+slope*(d-1);
      rows.push({trade_date:tradeDate,ticker:members[i],previous_close:previousClose,current_close:currentClose,current_volume:100000/currentClose});
    }
  }
  const relativeSeries={
    equalWeighted:Array.from({length:days},(_,d)=>({date:dateAt(d),value:100+d*0.1})),
    capWeighted:Array.from({length:days},(_,d)=>({date:dateAt(d),value:100+d*0.1})),
  };
  return {rows,universes:[{tradeDate:dateAt(0),members}],relativeSeries,currentDate:dateAt(days-1)};
}

test('R8 R2 uses each ticker last N valid sessions instead of exact global calendar windows',()=>{
  const f=fixture();
  const missingDate=dateAt(200);
  const affected=new Set(f.universes[0].members.slice(0,11));
  f.rows=f.rows.filter(row=>!(row.trade_date===missingDate&&affected.has(row.ticker)));
  const r1=buildBreadthR8Components(f);
  const r2=buildBreadthR8ComponentsR2(f);
  assert.equal(r1.readiness.long.highLow52w,false);
  assert.equal(r1.coverage.long.highLow52w,489);
  assert.equal(r2.methodologyVersion,BREADTH_R8_SHADOW_R2_METHOD);
  assert.equal(r2.historyWindowContract,'PER_TICKER_LAST_N_VALID_SESSIONS');
  assert.equal(r2.readiness.long.highLow52w,true);
  assert.equal(r2.coverage.long.highLow52w,500);
  assert.equal(r2.status,'READY');
  assert.ok(Number.isFinite(r2.score));
});

test('R8 R2 keeps missing relative-strength factor PARTIAL without reweighting',()=>{
  const f=fixture();
  const out=buildBreadthR8ComponentsR2({...f,relativeSeries:null});
  assert.equal(out.readiness.long.highLow52w,true);
  assert.equal(out.status,'PARTIAL');
  assert.equal(out.score,null);
  assert.deepEqual(out.missingFactors,['equalCapRelativeStrength']);
  assert.equal(out.reason,'BREADTH_R8_FACTOR_MISSING');
});
