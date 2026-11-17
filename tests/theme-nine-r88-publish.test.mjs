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
test('retired R88 public writer blocks old approved flags before any D1 read or write',async()=>{
 const {base,record}=fixture();base.r32ProvisionalReaderVersion=R88_VERSION;
 let queries=0;
 const deny=async()=>{queries++;throw Error('RETIRED_PROVIDER_DB_EFFECT');};
 await assert.rejects(publishNineR88({query:deny,record,base,now}),
  /R88_PUBLIC_RECORD_REJECTED/);
 await assert.rejects(publishNineR88({query:deny,record,base,now:now+1}),
  /R88_PUBLIC_RECORD_REJECTED/);
 assert.equal(queries,0);
});
test('R88 refuses publication before deployed reader or with invalid inputs',async()=>{
 const {base,record}=fixture();const db=store();
 await assert.rejects(publishNineR88({query:db.query,record,base,now}),/PRODUCTION_READER/);
 base.r32ProvisionalReaderVersion=R88_VERSION;record.themes[0].confirmedScore=99;
 await assert.rejects(publishNineR88({query:db.query,record,base,now}),/PUBLIC_RECORD/);assert.equal(db.writes,0);
});
test('retired R88 cannot enter CAS or readback regardless of stored-row race',async()=>{
 for(const option of [{race:true},{badReadback:true}]){
  const {base,record}=fixture();base.r32ProvisionalReaderVersion=R88_VERSION;const db=store(option);
  await assert.rejects(publishNineR88({query:db.query,record,base,now}),
   /R88_PUBLIC_RECORD_REJECTED/);
  assert.equal(db.writes,0);
 }
});
test('R54 readback preserves confirmed and optional scores without retired R88 D1 reads',async()=>{
 const {base}=fixture();let reads=0;
 const expected=await expectedNineR54WithProvisional({base,now,query:async()=>{
  reads++;throw Error('RETIRED_PROVIDER_DB_READ');
 }});
 assert.equal(reads,0);
 assert.equal(Object.hasOwn(expected.provisional.points[0].scores,'핀테크'),false);
 assert.equal(expected.provisional.points[0].scores['우주·위성'],12);
 assert.equal(expected.provisional.points[0].scores['데이터센터·전력'],12);
 assert.equal(base.provisional.points[0].scores['핀테크'],12);
 assert.strictEqual(expected.themes,base.themes);
});
