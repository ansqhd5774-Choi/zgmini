import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const path=process.argv[2];
if(!path)throw Error('Usage: node scripts/verify-sites-d1-export-manifest-r3.mjs <manifest.json>');
const m=JSON.parse(readFileSync(path,'utf8'));
const problems=[];

if(!Array.isArray(m.tables)||!m.tables.length)problems.push('tables missing');
const names=new Set();
for(const t of m.tables??[]){
 if(!t?.table)problems.push('table name missing');
 if(names.has(t.table))problems.push(`duplicate table manifest: ${t.table}`);
 names.add(t.table);
 if(!Number.isInteger(t.source_row_count)||t.source_row_count<0)problems.push(`${t.table}: invalid source_row_count`);
 if(!Number.isInteger(t.exported_row_count)||t.exported_row_count<0)problems.push(`${t.table}: invalid exported_row_count`);
 if(t.source_row_count!==t.exported_row_count)problems.push(`${t.table}: row count mismatch`);
 if(!Array.isArray(t.chunks))problems.push(`${t.table}: chunks missing`);
 let rows=0;
 let previousAfter=null;
 const hashes=[];
 for(const [i,c] of (t.chunks??[]).entries()){
  if(!Number.isInteger(c.row_count)||c.row_count<0)problems.push(`${t.table} chunk${i}: invalid row_count`);
  rows+=c.row_count??0;
  if(typeof c.sha256!=='string'||!/^[a-f0-9]{64}$/i.test(c.sha256))problems.push(`${t.table} chunk${i}: invalid sha256`);
  hashes.push(c.sha256??'');
  if(i>0 && JSON.stringify(c.cursor_before)!==JSON.stringify(previousAfter))problems.push(`${t.table} chunk${i}: cursor discontinuity`);
  previousAfter=c.cursor_after;
 }
 if(rows!==t.exported_row_count)problems.push(`${t.table}: chunk rows != exported_row_count`);
 const derived=createHash('sha256').update(hashes.join('\n')).digest('hex');
 if(t.chunk_hash_chain_sha256 && t.chunk_hash_chain_sha256!==derived)problems.push(`${t.table}: chunk hash chain mismatch`);
}
if(m.pre_counts_sha256&&m.post_counts_sha256&&m.pre_counts_sha256!==m.post_counts_sha256)problems.push('pre/post count snapshot mismatch');
if(m.pre_freshness_sha256&&m.post_freshness_sha256&&m.pre_freshness_sha256!==m.post_freshness_sha256)problems.push('pre/post freshness snapshot mismatch');

const out={status:problems.length?'FAIL':'PASS',table_count:names.size,problems};
console.log(JSON.stringify(out,null,2));
if(problems.length)process.exitCode=1;
