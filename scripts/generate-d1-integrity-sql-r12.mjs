import {readFileSync} from 'node:fs';

const schemaPath=process.argv[2]??'docs/migration/r4/schema-reconciliation.json';
const schema=JSON.parse(readFileSync(schemaPath,'utf8'));
const tables=(schema.tables??[]).filter(x=>x.classification==='LIVE_CONFIRMED');
const q=id=>'"'+String(id).replaceAll('"','""')+'"';

const countSql=tables.map(x=>`SELECT ${JSON.stringify(x.table)} AS table_name, COUNT(*) AS row_count FROM ${q(x.table)}`).join('\nUNION ALL\n')+';';

const priority=[
 'observation_date','date','as_of_date','score_date','trade_date','snapshot_key',
 'updated_at','stored_at','retrieved_at','fetched_at','calculated_at','created_at','finished_at'
];
const freshness=[];
for(const x of tables){
 const cols=new Set(x.live_columns??[]);
 const col=priority.find(c=>cols.has(c));
 if(col)freshness.push(`SELECT ${JSON.stringify(x.table)} AS table_name, ${JSON.stringify(col)} AS freshness_column, MAX(${q(col)}) AS max_value FROM ${q(x.table)}`);
}

console.log('-- R12 target D1 integrity queries (read-only)');
console.log('-- Object inventory');
console.log("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE type IN ('table','index','trigger','view') ORDER BY type,name;");
console.log('\n-- Exact row counts for all R4 LIVE_CONFIRMED tables');
console.log(countSql);
console.log('\n-- Best available freshness marker per table');
console.log(freshness.join('\nUNION ALL\n')+';');
