import test from 'node:test';
import assert from 'node:assert/strict';
import {breadthSnapshotTrend,readBreadthSnapshotTrend} from '../lib/market-score/breadth-r2-history.mjs';
import {BREADTH_R2_RUNTIME_VERSION} from '../lib/market-score/breadth-r2-runtime.mjs';
import {buildCmR1DomainResults} from '../lib/market-score/domain-adapter-r1.mjs';
const result=(day,score)=>({runtimeVersion:BREADTH_R2_RUNTIME_VERSION,runtime:{asOfDate:day},candidate:{indicators:[37,38,39,40].map(n=>({id:`breadth-${n}`,status:score===null?'PARTIAL':'READY',score}))}});
const snapshot=(day,score)=>({cachedAt:day+'T00:00:00Z',runtimeResult:result(day,score)});
test('actual daily snapshots sorted; zero retained; partial/future/other versions excluded',()=>{
 const records=[snapshot('2026-09-22',30),snapshot('2026-09-20',0),snapshot('2026-09-21',null),snapshot('2026-09-24',90),{...snapshot('2026-09-19',20),runtimeResult:{...result('2026-09-19',20),runtimeVersion:'LEGACY'}}];
 assert.deepEqual(breadthSnapshotTrend(records,result('2026-09-23',50),'2026-09-23'),[{label:'2026-09-20',value:0},{label:'2026-09-22',value:30},{label:'2026-09-23',value:50}]);
});
test('single observation stays one point; current partial does not reuse same-day ready',()=>{
 assert.deepEqual(breadthSnapshotTrend([],result('2026-09-23',50),'2026-09-23'),[{label:'2026-09-23',value:50}]);
 assert.deepEqual(breadthSnapshotTrend([snapshot('2026-09-23',50)],result('2026-09-23',null),'2026-09-23'),[]);
});
test('bounded stored snapshot reader tolerates corrupt entry',async()=>{
 const db={prepare(sql){assert.match(sql,/LIMIT 800/);return{bind(...args){assert.equal(args[0],BREADTH_R2_RUNTIME_VERSION+'|%');return{async all(){return{results:[{body_json:'bad'},{body_json:JSON.stringify(snapshot('2026-09-22',40))}]};}};}};}};
 assert.equal((await readBreadthSnapshotTrend(db,result('2026-09-23',50),'2026-09-23')).length,2);
});
test('employment retains full observation dates and excludes future rows without changing score',()=>{
 const employment={status:'READY',current:{observationDate:'2026-08-01',score:60},rows:[{observationDate:'2025-08-01',score:0},{observationDate:'2026-08-01',score:60},{observationDate:'2026-09-01',score:90}]};
 const domain=buildCmR1DomainResults({employment}).find(x=>x.id==='employment');
 assert.equal(domain.score,60);
 assert.deepEqual(domain.trend,[{label:'2025-08-01',value:0},{label:'2026-08-01',value:60}]);
});
