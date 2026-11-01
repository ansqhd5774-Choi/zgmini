import test from 'node:test';
import assert from 'node:assert/strict';
import {readStoredMarketInputsSelected} from '../worker/candidate-market-operational-store.mjs';
import {loadProjectionSource,PROJECTION_INPUT_BATCHES,selectStoredEarningsProjection} from '../worker/projection-source-r52.mjs';

const r5Indicators=()=>Array.from({length:13},(_,index)=>({id:`S${index+1}`,status:'READY',score:50+index}));
const r5Domain=()=>({
 id:'earnings',
 status:'READY',
 score:73.51207667731629,
 methodologyVersion:'E1-R5',
 missingFactors:[],
 indicators:r5Indicators(),
 trend:[{label:'2026-10-16',value:73.51207667731629}],
 updatedAt:'2026-10-15T22:05:19.322Z',
});

test('projection batch map is minimal and deterministic',()=>{
 assert.deepEqual(PROJECTION_INPUT_BATCHES.recession,['macro','credit','rates']);
 assert.deepEqual(PROJECTION_INPUT_BATCHES.liquidityCrisis,['macro','credit']);
 assert.deepEqual(PROJECTION_INPUT_BATCHES.creditRisk,['macro','credit']);
 assert.deepEqual(PROJECTION_INPUT_BATCHES.earningsRecession,[]);
 assert.deepEqual(PROJECTION_INPUT_BATCHES.assetBubble,['macro']);
 assert.deepEqual(PROJECTION_INPUT_BATCHES.debtRisk,['macro','credit','bisDsr','bisTc']);
 assert.deepEqual(PROJECTION_INPUT_BATCHES.supplyShock,['macro','supply']);
});

test('selected reader touches only requested input batches',async()=>{
 const reads=[];
 const store={async readInput(key){reads.push(key);return {storedAt:100,body:{series:{[key.toUpperCase()]:[{observationDate:'2026-01-01',value:1}]},external:{[key+'X']:[1]},providerSummary:{[key]:{status:'READY'}}}};}};
 const out=await readStoredMarketInputsSelected(store,['credit','supply'],101);
 assert.deepEqual(reads,['credit','supply']);
 assert.ok(out.series.CREDIT);
 assert.ok(out.series.SUPPLY);
 assert.equal(out.external.creditX[0],1);
 assert.equal(out.external.supplyX[0],1);
});

test('selected reader rejects unapproved batch keys',async()=>{
 const store={async readInput(){throw Error('SHOULD_NOT_RUN')}};
 await assert.rejects(()=>readStoredMarketInputsSelected(store,['macro','not-real'],Date.now()),/INVALID_INPUT_BATCH_KEY/);
});

test('earnings detail selects only complete ready E1-R5 public domain',()=>{
 const valid=r5Domain();
 const selected=selectStoredEarningsProjection({body:{domains:[valid]}});
 assert.equal(selected?.methodologyVersion,'E1-R5');
 assert.equal(selected?.score,valid.score);
 assert.deepEqual(selected?.missing,[]);
 assert.equal(selected?.indicators?.length,13);

 const incomplete=r5Domain();
 incomplete.indicators=incomplete.indicators.slice(0,12);
 assert.equal(selectStoredEarningsProjection({body:{domains:[incomplete]}}),null);

 const partial=r5Domain();
 partial.missingFactors=['S10'];
 assert.equal(selectStoredEarningsProjection({body:{domains:[partial]}}),null);
});

test('earnings projection source uses stored E1-R5 snapshot without reading legacy R4',async()=>{
 const domain=r5Domain();
 const body={asOfDate:'2026-10-15',domains:[domain]};
 const sql=[];
 const db={
  prepare(statement){
   sql.push(statement);
   assert.match(statement,/market_public_snapshots_v1/);
   return {bind(){return {first:async()=>({body:JSON.stringify(body),stored_at:1000})}}};
  },
 };
 const out=await loadProjectionSource('earningsRecession',{DB_CORE:db},{now:2000});
 assert.equal(out.e1?.methodologyVersion,'E1-R5');
 assert.equal(out.e1?.score,domain.score);
 assert.equal(out.e1?.indicators?.length,13);
 assert.equal(sql.length,1);
});
