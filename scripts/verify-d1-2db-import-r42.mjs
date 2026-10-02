import {readFileSync} from 'node:fs';

const partitionPath=process.argv[2];
const corePath=process.argv[3];
const historyPath=process.argv[4];
if(!partitionPath||!corePath||!historyPath)throw Error('Usage: node scripts/verify-d1-2db-import-r42.mjs <partition.json> <core-integrity.json> <history-integrity.json>');

const p=JSON.parse(readFileSync(partitionPath,'utf8'));
const core=JSON.parse(readFileSync(corePath,'utf8'));
const history=JSON.parse(readFileSync(historyPath,'utf8'));

const problems=[];
const check=(name,expected,actual)=>{
 const actualNames=new Set((actual.tables??[]).map(x=>x.table));
 const expectedNames=new Set(expected.tables??[]);
 for(const t of expectedNames)if(!actualNames.has(t))problems.push(`${name}: missing ${t}`);
 for(const t of actualNames)if(!expectedNames.has(t)&&!t.startsWith('sqlite_')&&t!=='_cf_KV')problems.push(`${name}: unexpected ${t}`);
 const actualMap=new Map((actual.tables??[]).map(x=>[x.table,x]));
 let rowTotal=0;
 for(const t of expectedNames){
  const r=actualMap.get(t);
  if(r)rowTotal+=Number(r.row_count??0);
 }
 if(Number(expected.rows)!==rowTotal)problems.push(`${name}: row total ${rowTotal} != ${expected.rows}`);
 return rowTotal;
};

const coreRows=check('CORE',p.shards.CORE,core);
const historyRows=check('HISTORY',p.shards.HISTORY,history);
if(coreRows+historyRows!==Number(p.source.rowTotal))problems.push('combined row total mismatch');

const out={
 status:problems.length?'FAIL':'PASS',
 core:{expectedTables:p.shards.CORE.tables.length,rows:coreRows},
 history:{expectedTables:p.shards.HISTORY.tables.length,rows:historyRows},
 combinedRows:coreRows+historyRows,
 expectedRows:p.source.rowTotal,
 problems,
};
console.log(JSON.stringify(out,null,2));
if(problems.length)process.exitCode=1;
