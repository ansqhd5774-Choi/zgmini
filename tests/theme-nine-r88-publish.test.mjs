import test from 'node:test';
import assert from 'node:assert/strict';
import {publishNineR88} from '../scripts/pc-writer/theme-nine-r88-publish.mjs';
import {fixture} from './theme-nine-r88-provisional.test.mjs';
import {R88_KEY,R88_VERSION} from '../worker/theme-nine-r88-provisional.mjs';
import {expectedNineR54WithProvisional} from '../scripts/pc-writer/theme-nine-r54-public-connect.mjs';
const now=Date.parse('2026-10-30T07:00:00Z');
function store({race=false,badReadback=false}={}){
 let row=null,writes=0;
 return {get writes(){return writes;},async query(sql,params,opts={}){
  if(!opts.write){assert.deepEqual(params,[R88_KEY]);return {results:row?[{...row,body:badReadback?'{}':row.body}]:[]};}
  writes++;
  if(race)return {meta:{changes:0}};
  assert.ok(sql.startsWith('INSERT'));assert.equal(params[1],R88_KEY);
  row={body:params[3],stored_at:params[4]};return {meta:{changes:1}};
 }};
}
test('R88 uses only separate provisional key, exact readback and duplicate protection',async()=>{
 const {base,record}=fixture();base.r32ProvisionalReaderVersion=R88_VERSION;const db=store();
 assert.equal((await publishNineR88({query:db.query,record,base,now})).d1Writes,1);
 assert.equal((await publishNineR88({query:db.query,record,base,now:now+1})).d1Writes,0);assert.equal(db.writes,1);
});
test('R88 refuses publication before deployed reader or with invalid inputs',async()=>{
 const {base,record}=fixture();const db=store();
 await assert.rejects(publishNineR88({query:db.query,record,base,now}),/PRODUCTION_READER/);
 base.r32ProvisionalReaderVersion=R88_VERSION;record.themes[0].confirmedScore=99;
 await assert.rejects(publishNineR88({query:db.query,record,base,now}),/PUBLIC_RECORD/);assert.equal(db.writes,0);
});
test('R88 detects CAS race and write-readback mismatch without blind retry',async()=>{
 for(const option of [{race:true},{badReadback:true}]){
  const {base,record}=fixture();base.r32ProvisionalReaderVersion=R88_VERSION;const db=store(option);
  await assert.rejects(publishNineR88({query:db.query,record,base,now}),/CAS_NOT_APPLIED|READBACK_MISMATCH/);assert.equal(db.writes,1);
 }
});
test('R54 readback compares the real R32 provisional sidecar, not legacy pair values',async()=>{
 const {base,record}=fixture();let reads=0;
 const expected=await expectedNineR54WithProvisional({base,now,query:async(sql,params,opts)=>{
  reads++;assert.deepEqual(params,[R88_KEY]);assert.equal(opts.write,false);
  return {results:[{body:JSON.stringify(record),stored_at:now-1000}]};
 }});
 assert.equal(reads,1);assert.equal(expected.provisional.points[0].scores['핀테크'],60);
 assert.equal(base.provisional.points[0].scores['핀테크'],12);
 assert.strictEqual(expected.themes,base.themes);
});
