import {readFileSync} from 'node:fs';

const sourcePath=process.argv[2];
const corePath=process.argv[3];
const historyPath=process.argv[4];
if(!sourcePath||!corePath||!historyPath)throw Error('Usage: node scripts/plan-final-d1-delta-r6.mjs <source.json> <core.json> <history.json>');

const source=JSON.parse(readFileSync(sourcePath,'utf8'));
const core=JSON.parse(readFileSync(corePath,'utf8'));
const history=JSON.parse(readFileSync(historyPath,'utf8'));

const targetMap=new Map();
for(const [shard,data] of [['CORE',core],['HISTORY',history]]){
  for(const t of data.tables??[])targetMap.set(t.table,{...t,shard});
}
const out=[];
for(const s of source.tables??[]){
  const expectedShard=/^kfg_(?:v2|rev7)_/.test(s.table)?'HISTORY':'CORE';
  const t=targetMap.get(s.table);
  let status='UNKNOWN';
  if(!t)status='MISSING_TARGET_TABLE';
  else if(t.shard!==expectedShard)status='WRONG_SHARD';
  else if(s.schema_hash&&t.schema_hash&&s.schema_hash!==t.schema_hash)status='SCHEMA_MISMATCH';
  else if(Number(s.row_count)===Number(t.row_count)&&s.table_hash&&t.table_hash&&s.table_hash===t.table_hash)status='EXACT';
  else if(Number(s.row_count)>=Number(t.row_count))status='DELTA_REQUIRED';
  else status='DELETE_OR_RECONCILE_REQUIRED';
  out.push({
    table:s.table,
    expectedShard,
    sourceRows:Number(s.row_count),
    targetRows:t?Number(t.row_count):null,
    sourceFreshness:s.freshness??null,
    targetFreshness:t?.freshness??null,
    sourceHash:s.table_hash??null,
    targetHash:t?.table_hash??null,
    status,
  });
}
const summary=Object.fromEntries([...new Set(out.map(x=>x.status))].sort().map(k=>[k,out.filter(x=>x.status===k).length]));
console.log(JSON.stringify({tables:out.length,summary,plan:out},null,2));
if(out.some(x=>['MISSING_TARGET_TABLE','WRONG_SHARD','SCHEMA_MISMATCH'].includes(x.status)))process.exitCode=2;
