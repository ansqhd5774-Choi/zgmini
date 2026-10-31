import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareUsBreadth,publishUsBreadth} from '../scripts/pc-writer/market-breadth-us-r1.mjs';
import {validUsBreadthRecord,US_BREADTH_CURRENT_KEY,US_BREADTH_DAILY_KEY_PREFIX} from '../lib/market-breadth/us-public-r1.mjs';

const now=new Date('2026-10-31T03:00:00.000Z'); // US Friday session closed
const date='2026-10-30';
const members=Array.from({length:500},(_,i)=>`T${i}`);
const provenance=ticker=>JSON.stringify({provider:'MARKETPARQUET_FREE_SAMPLE',sourceContractRevision:'ZGMINI_B1_PRICE_SOURCE_CONTRACT_R5',
  splitAdjusted:true,dividendAdjusted:false,currentResolvedSymbol:ticker,previousResolvedSymbol:ticker});
const prices=members.map((ticker,i)=>({trade_date:date,ticker,previous_date:'2026-10-29',previous_close:100,
  current_close:i<245?101:i<255?100:99,current_volume:1000,source:'MarketParquet Free Sample',feed:'stock_daily',provenance_json:provenance(ticker)}));

function storedCore({omit=0,universeDate=date}={}){
  const subset=prices.slice(0,500-omit);
  const universe={trade_date:universeDate,members_json:JSON.stringify(members),member_count:500};
  return {prepare(sql){let args=[];const stmt={bind(...values){args=values;return stmt},async first(){
    return sql.includes('universe_v1')&&args[0]===universeDate?universe:null;
  },async all(){
    if(sql.includes('sqlite_master'))return {results:['market_score_breadth_b1_r3_universe_v1','market_score_breadth_b1_r3_current_v1','market_score_breadth_b1_r3_history_v1'].map(name=>({name}))};
    if(sql.includes('_current_v1')||sql.includes('_history_v1'))return {results:args[0]===date?subset:[]};
    throw Error('Unexpected SQL');
  }};return stmt;}};
}

test('500 stored source rows produce strict unweighted US counts',async()=>{
  const result=await prepareUsBreadth(storedCore(),{now});
  assert.equal(result.status,'PREPARED');
  assert.equal(result.body.observationDate,date);
  assert.deepEqual(result.body.counts,{rising:245,unchanged:10,falling:245});
  assert.equal(result.body.eligibleCount,500);
  assert.ok(validUsBreadthRecord(result.body));
});

test('missing 2% is explicit while lower coverage never publishes',async()=>{
  const permitted=await prepareUsBreadth(storedCore({omit:10}),{now});
  assert.equal(permitted.prepared,true);
  assert.equal(permitted.body.eligibleCount,490);
  const rejected=await prepareUsBreadth(storedCore({omit:11}),{now});
  assert.equal(rejected.prepared,false);
  assert.equal(rejected.status,'SOURCE_AUDIT_NOT_READY');
});

test('old or absent source is skipped, never represented as a current quote',async()=>{
  const stale=await prepareUsBreadth(storedCore({universeDate:'2026-10-29'}),{now});
  assert.equal(stale.prepared,false);
  assert.equal(stale.status,'LATEST_SESSION_NOT_STORED');
});

test('remote publication writes bounded current and dated snapshots with readback',async()=>{
  const prepared=await prepareUsBreadth(storedCore(),{now});
  const data=new Map();
  const remote={
    async query(_db,sql,params){assert.match(sql,/SELECT body,stored_at/);const row=data.get(params[0]);return {results:row?[row]:[]};},
    async request(_db,statements){for(const item of statements){assert.match(item.sql,/market_public_snapshots_v1/);
      const [key,body,storedAt,priorStamp,priorBody]=item.params;
      const old=data.get(key);
      if(!old||(old.stored_at===priorStamp&&old.body===priorBody))data.set(key,{body,stored_at:storedAt});
    }}
  };
  const result=await publishUsBreadth(remote,'core',prepared,{now:now.getTime()});
  assert.equal(result.status,'VERIFIED');
  assert.deepEqual(JSON.parse(data.get(US_BREADTH_CURRENT_KEY).body).counts,{rising:245,unchanged:10,falling:245});
  assert.ok(data.has(US_BREADTH_DAILY_KEY_PREFIX+date));
  assert.equal((await publishUsBreadth(remote,'core',prepared,{now:now.getTime()+1000})).status,'ALREADY_VERIFIED');
  assert.equal((await publishUsBreadth(remote,'core',{prepared:false},{now:now.getTime()})).status,'SKIPPED_NOT_READY');
});

test('invalid public records are rejected',async()=>{
  const {body}=await prepareUsBreadth(storedCore(),{now});
  assert.equal(validUsBreadthRecord({...body,counts:{...body.counts,rising:300}}),false);
  assert.equal(validUsBreadthRecord({...body,source:'UNKNOWN'}),false);
  assert.equal(validUsBreadthRecord({...body,expectedCount:900}),false);
});
