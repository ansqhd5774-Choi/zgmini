import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';

const analysisPath=process.argv[2];
const outPath=process.argv[3]??'work/d1-r42-partition.json';
if(!analysisPath)throw Error('Usage: node scripts/build-d1-2db-partition-r42.mjs <r41-analysis.json> [out.json]');
const a=JSON.parse(readFileSync(analysisPath,'utf8'));

const historyPrefixes=['kfg_v2_','kfg_rev7_'];
const classify=t=>historyPrefixes.some(p=>t.table.startsWith(p))?'HISTORY':'CORE';

const shards={CORE:[],HISTORY:[]};
for(const t of a.tables??[])shards[classify(t)].push(t);

const sum=list=>list.reduce((s,t)=>s+Number(t.total_bytes??0),0);
const rows=list=>list.reduce((s,t)=>s+Number(t.rows??0),0);
const overhead=16*1024*1024;
const result={
  policy:{
    version:'D1_R42_2DB_PREFIX_POLICY_R1',
    historyPrefixes,
    coreRule:'all preserved tables not matched by HISTORY prefixes',
    expectedHistoryTableCount:11,
    expectedCoreTableCount:42,
    overheadBytesPerShard:overhead,
  },
  shards:{
    CORE:{tables:shards.CORE.map(x=>x.table).sort(),rows:rows(shards.CORE),measuredBytes:sum(shards.CORE),estimatedBytes:sum(shards.CORE)+overhead},
    HISTORY:{tables:shards.HISTORY.map(x=>x.table).sort(),rows:rows(shards.HISTORY),measuredBytes:sum(shards.HISTORY),estimatedBytes:sum(shards.HISTORY)+overhead},
  },
  source:{tableCount:a.table_count,rowTotal:a.row_total,fileBytes:a.file_bytes},
};
const all=[...result.shards.CORE.tables,...result.shards.HISTORY.tables];
if(new Set(all).size!==all.length)throw Error('partition duplicate table');
if(all.length!==a.table_count)throw Error(`partition table count mismatch ${all.length} != ${a.table_count}`);
if(result.shards.HISTORY.tables.length!==11)throw Error(`HISTORY table count mismatch ${result.shards.HISTORY.tables.length}`);
if(result.shards.CORE.tables.length!==42)throw Error(`CORE table count mismatch ${result.shards.CORE.tables.length}`);
if(result.shards.CORE.rows+result.shards.HISTORY.rows!==a.row_total)throw Error('partition row total mismatch');

mkdirSync(outPath.includes('/')?outPath.slice(0,outPath.lastIndexOf('/')):'.',{recursive:true});
writeFileSync(outPath,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
