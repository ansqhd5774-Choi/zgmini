import test from 'node:test';
import assert from 'node:assert/strict';
import {GROWTH_R2_FEATURE_IDS} from '../lib/market-score/growth-r2-contract.mjs';
import {collectGrowthR2BfsReleasedChartHistory} from '../lib/market-score/growth-r2-chart-history-r1.mjs';
import {readGrowthR2VerifiedBfsForwardMonth} from '../lib/market-score/growth-r2-d1-store-r1.mjs';
import {ensureGrowthR2ChartHistoryR1} from '../lib/market-score/growth-r2-worker-domain-r1.mjs';

const AS_OF='2026-11-17',OCT='2026-10-01',SEP='2026-09-01',AUG25='2025-08-01';
const BFS_IDS=['G060','G061','G062'];
const KINDS=['BA_BA','BA_HBA','BA_WBA'];
const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
function csv({omitOctober=null,omitOneSeries=null}={}){
 const head=['sa','naics_sector','series','geo','year',...months].join(',');
 const rows=KINDS.filter(kind=>kind!==omitOneSeries).map((kind,i)=>{
  const vals=months.map(m=>m==='sep'?'100':m==='oct'&&kind!==omitOctober?'120':'');
  return ['A','TOTAL',kind,'US','2026',...vals].join(',');
 });
 return [head,...rows].join('\n')+'\n';
}
const fetchWithCsv=(body,calls)=>async url=>{
 calls.push(url);
 assert.equal(url,'https://cdn.www.census.gov/econ/bfs/csv/bfs_monthly.csv');
 return {ok:true,status:200,headers:{get:()=>null},text:async()=>body};
};
const forward=()=>BFS_IDS.map(id=>({candidate_id:id,last_date:OCT}));
const chartRow=(id,date)=>({candidate_id:id,observation_date:date,
 observation_period:date.slice(0,7),available_at:'2026-11-15T00:00:00Z',
 release_date:'2026-11-15',vintage_id:'v1',pit_eligible:0,
 provider:'Census BFS Monthly CSV',selector:id,frequency:'MONTHLY',
 native_value:150,native_unit:'COUNT_SA_MONTH',harmonized_value:150,
 harmonized_unit:'COUNT_SA_MONTH_EQUIVALENT',transform_rule:'HARM-BFS-001_MONTHLY_IDENTITY',
 source_hash:'fixture',source_url:'https://api.census.gov/data/timeseries/eits/bfs',
 feature_revision:'GROWTH_R2_CHART_HISTORY_R1',method_revision:'G12_HARMONIZATION_METHOD_R1',
 retrieved_at:'2026-11-15T00:00:00Z',record_hash:id+date});
function memoryDb({forwardRows=forward(),allRows=true,latest=SEP}={}){
 const chartRows=allRows?GROWTH_R2_FEATURE_IDS.flatMap(id=>[
   chartRow(id,AUG25),chartRow(id,latest)
 ]):GROWTH_R2_FEATURE_IDS.map(id=>chartRow(id,AUG25));
 const sqls=[],mutations=[];
 const db={
  prepare(sql){
   sqls.push(sql);
   let args=[];
   return {
    bind(...values){args=values;return this;},
    async all(){
     if(sql.includes('WHERE pit_eligible=0')&&sql.includes("GROWTH_R2_CHART_HISTORY_R1"))
      return {results:[...chartRows]};
     if(sql.includes('MAX(observation_date)'))return {results:forwardRows};
     throw Error('UNEXPECTED_SELECT:'+sql);
    },
    async run(){
     if(!sql.startsWith('INSERT OR IGNORE INTO growth_r2_feature_history_v1'))
      throw Error('UNEXPECTED_WRITE:'+sql);
     for(let i=0;i<args.length;i+=21){
      mutations.push(args.slice(i,i+21));
      chartRows.push(chartRow(args[i],args[i+1]));
     }
     return {meta:{changes:args.length/21}};
    }
   };
  },
  batch:async()=>[]
 };
 return {db,sqls,mutations,chartRows};
}
test('D1 fixed read-only query requires all 3 official BFS releases aligned',async()=>{
 const {db,sqls}=memoryDb();
 const good=await readGrowthR2VerifiedBfsForwardMonth(db,{asOf:AS_OF});
 assert.deepEqual(good,{status:'VERIFIED_STORED_FORWARD',latestMonth:OCT});
 assert.equal(sqls.length,1);
 assert.match(sqls[0],/^SELECT /);
 assert.match(sqls[0],/provider='Census BFS'/);
 assert.match(sqls[0],/substr\(available_at,1,10\)<=\?/);
 const missing=memoryDb({forwardRows:forward().slice(0,2)});
 assert.equal((await readGrowthR2VerifiedBfsForwardMonth(missing.db,{asOf:AS_OF})).status,'UNVERIFIED');
 const mixed=memoryDb({forwardRows:[...forward().slice(0,2),{candidate_id:'G062',last_date:SEP}]});
 assert.equal((await readGrowthR2VerifiedBfsForwardMonth(mixed.db,{asOf:AS_OF})).status,'UNVERIFIED');
 const future=memoryDb({forwardRows:forward().map(x=>({...x,last_date:'2026-11-01'}))});
 assert.equal((await readGrowthR2VerifiedBfsForwardMonth(future.db,{asOf:AS_OF})).status,'UNVERIFIED');
});
test('October forward BFS release triggers exactly one CSV GET and BFS-only history rows',async()=>{
 const {db,mutations,sqls}=memoryDb(),calls=[];
 const x=await ensureGrowthR2ChartHistoryR1({env:{DB:db},asOf:AS_OF,
  now:()=>new Date('2026-11-17T00:00:00Z'),
  fetchImpl:fetchWithCsv(csv(),calls)});
 assert.equal(x.status,'STORED_BFS_RELEASE');
 assert.equal(x.releaseMonth,OCT);
 assert.equal(x.providerRequestCount,1);
 assert.equal(calls.length,1);
 assert.ok(x.rowsWritten>0);
 assert.ok(mutations.length>=3);
 assert.deepEqual([...new Set(mutations.map(v=>v[0]))].sort(),BFS_IDS);
 assert.ok(mutations.every(v=>v[1]<=OCT));
 assert.ok(sqls.every(sql=>!sql.includes('DELETE FROM ')&&!sql.includes('DROP TABLE')));
 const y=await ensureGrowthR2ChartHistoryR1({env:{DB:db},asOf:AS_OF,
  now:()=>new Date('2026-11-17T00:01:00Z'),
  fetchImpl:fetchWithCsv(csv(),calls)});
 assert.equal(y.status,'READY');
 assert.equal(y.providerRequestCount,0);
 assert.equal(calls.length,1,'post-release readback must suppress duplicate CSV GET');
});
test('no verified forward release or already current chart sends zero requests',async()=>{
 for(const opts of [
  {forwardRows:forward().slice(0,2)},
  {forwardRows:forward().map(row=>({...row,last_date:SEP}))},
  {latest:OCT}
 ]){
  const {db,mutations}=memoryDb(opts),calls=[];
  const out=await ensureGrowthR2ChartHistoryR1({env:{DB:db},asOf:AS_OF,
   fetchImpl:fetchWithCsv(csv(),calls)});
  assert.equal(out.status,'READY');
  assert.equal(out.providerRequestCount,0);
  assert.equal(calls.length,0);assert.equal(mutations.length,0);
 }
});
test('partial current-month CSV does not write any D1 rows',async()=>{
 for(const input of [{omitOctober:'BA_HBA'},{omitOneSeries:'BA_HBA'}]){
  const {db,mutations}=memoryDb(),calls=[];
  await assert.rejects(()=>ensureGrowthR2ChartHistoryR1({
   env:{DB:db},asOf:AS_OF,fetchImpl:fetchWithCsv(csv(input),calls)
  }),/GROWTH_R2_BFS_CSV_RELEASE_MONTH_MISSING/);
  assert.equal(calls.length,1);
  assert.equal(mutations.length,0);
 }
});
test('BFS one-GET collector refuses unverified/future release and response size abuse',async()=>{
 const calls=[];
 await assert.rejects(()=>collectGrowthR2BfsReleasedChartHistory({
  asOf:AS_OF,through:'2026-11-01',fetchImpl:fetchWithCsv(csv(),calls)
 }),/GROWTH_R2_BFS_RELEASE_UNVERIFIED/);
 assert.equal(calls.length,0);
 await assert.rejects(()=>collectGrowthR2BfsReleasedChartHistory({
  asOf:AS_OF,through:OCT,fetchImpl:async()=>{
   calls.push('oversized');
   return {ok:true,headers:{get:()=>String(13*1024*1024)},text:async()=>csv()};
  }
 }),/GROWTH_R2_BFS_CSV_SIZE_LIMIT/);
 assert.equal(calls.length,1);
});
