import test from 'node:test';
import assert from 'node:assert/strict';
import {assessBreadthR8SourcePure,scoreBreadthR8Guarded,R8_MIN_COVERAGE} from '../lib/market-score/breadth-r8-source-pure-guard.mjs';

const tickers=Array.from({length:490},(_,i)=>'T'+String(i).padStart(3,'0'));
const dateAt=i=>new Date(Date.UTC(2025,0,1)+i*86400000).toISOString().slice(0,10);
const mp='MarketParquet Free Sample',feed='stock_daily';
function fixture(){
 const universes=Array.from({length:316},(_,i)=>({tradeDate:dateAt(i),members:tickers}));
 const rows=[];
 for(let i=0;i<316;i++)for(const ticker of tickers)rows.push({
  trade_date:dateAt(i),ticker,current_close:100+i,current_volume:1000,
  previous_date:dateAt(i-1),previous_close:99+i,source:mp,feed,
 });
 const relativeSeries={source:mp,feed,adjustment:'split',sourceVerified:true,
  equalWeighted:Array.from({length:315},(_,i)=>({date:dateAt(i+1),value:100+i})),
  capWeighted:Array.from({length:315},(_,i)=>({date:dateAt(i+1),value:100+i}))};
 return {rows,universes,relativeSeries,source:mp,feed,asOfDate:dateAt(315)};
}

const main=fixture();
test('approved 98% unchanged and complete source-pure fixture is INPUT_READY',()=>{
 assert.equal(R8_MIN_COVERAGE,.98);
 const x=assessBreadthR8SourcePure(main);
 assert.equal(x.status,'INPUT_READY',JSON.stringify(x.blockers));
 assert.equal(x.current.required,481);
 assert.equal(x.current.price,490);
 assert.equal(x.relative.aligned,315);
 assert.equal(x.dailyReadyDates,315);
});

test('a different provider never overwrites selected daily values',()=>{
 const r={...main.rows.at(-1),current_close:9999,current_volume:9999,source:'IEX HIST',feed:'TOPS1.6'};
 const x=assessBreadthR8SourcePure({...main,rows:[...main.rows,r]});
 assert.equal(x.status,'INPUT_READY');
 assert.equal(x.current.price,490);
 assert.equal(x.otherSourceRows,1);
 assert.equal(x.rows.at(-1).current_close,415);
});

test('same source conflict fails closed instead of last-write-wins',()=>{
 const duplicate={...main.rows.at(-1),current_close:9999};
 const x=assessBreadthR8SourcePure({...main,rows:[...main.rows,duplicate]});
 assert.equal(x.status,'PARTIAL');
 assert.ok(x.blockers.includes('R8_SAME_SOURCE_DUPLICATE_CONFLICT'));
});

test('price-only gap with no volume never becomes daily READY',()=>{
 const target=dateAt(315);
 const rows=main.rows.map(r=>r.trade_date===target?{...r,current_volume:null}:r);
 const x=assessBreadthR8SourcePure({...main,rows});
 assert.equal(x.status,'PARTIAL');
 assert.equal(x.current.price,490);
 assert.equal(x.current.value,0);
 assert.ok(x.blockers.includes('R8_CURRENT_EXACT_DATE_VALUE_COVERAGE'));
});

test('partial day blocks compressed EMA and 252 continuous McClellan',()=>{
 const bad=dateAt(250);
 const drop=new Set(tickers.slice(0,20));
 const rows=main.rows.filter(r=>!(r.trade_date===bad&&drop.has(r.ticker)));
 const x=assessBreadthR8SourcePure({...main,rows});
 assert.equal(x.status,'PARTIAL');
 assert.ok(x.recent252ShortDates.some(x=>x.date===bad));
 assert.ok(x.blockers.includes('R8_READY_SESSION_GAP_WOULD_COMPRESS_EMA'));
});

test('requests cannot silently use prior session as their asOf date',()=>{
 const x=assessBreadthR8SourcePure({...main,asOfDate:dateAt(316)});
 assert.equal(x.status,'PARTIAL');
 assert.ok(x.blockers.includes('R8_PIT_EVALUATION_DATE_MISSING'));
});

test('stale or unproven RSP/SPY pair is not certified',()=>{
 const bad={...main.relativeSeries,capWeighted:main.relativeSeries.capWeighted.slice(0,-1)};
 const x=assessBreadthR8SourcePure({...main,relativeSeries:bad});
 assert.equal(x.status,'PARTIAL');
 assert.ok(x.blockers.includes('R8_RELATIVE_315_EXACT_ALIGNED_MISSING'));
 const unverified={...main.relativeSeries,sourceVerified:false};
 assert.ok(assessBreadthR8SourcePure({...main,relativeSeries:unverified}).blockers.includes('R8_RELATIVE_PROVENANCE_UNVERIFIED'));
});

test('guarded scorer never invokes formula on PARTIAL, never reweights',()=>{
 let invoked=0;
 const bad={...main,asOfDate:dateAt(316)};
 const partial=scoreBreadthR8Guarded(bad,()=>{invoked++;return {score:75,status:'READY',asOfDate:bad.asOfDate}});
 assert.equal(invoked,0);
 assert.equal(partial.status,'PARTIAL');
 assert.equal(partial.score,null);
 const complete=scoreBreadthR8Guarded(main,()=>{invoked++;return {score:50,status:'READY',asOfDate:main.asOfDate}});
 assert.equal(invoked,1);
 assert.equal(complete.status,'READY_SHADOW_ONLY');
 assert.equal(complete.score,50);
});

test('provider identity must be explicit; no unknown-origin R6/R7 promotion',()=>{
 const alien={...main.rows[20],source:'B1_R3_STORED',feed:undefined};
 const rows=main.rows.map((r,i)=>i===20?alien:r);
 const x=assessBreadthR8SourcePure({...main,rows});
 assert.equal(x.otherSourceRows,1);
 assert.equal(x.status,'INPUT_READY');
 assert.ok(!x.rows.some(r=>r.source==='B1_R3_STORED'));
});
