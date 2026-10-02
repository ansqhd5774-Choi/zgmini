import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const sqlPath=process.argv[2];
if(!sqlPath)throw Error('Usage: node scripts/validate-d1-export-r12.mjs <export.sql> [schema-reconciliation.json]');
const schemaPath=process.argv[3]??'docs/migration/r4/schema-reconciliation.json';
const sql=readFileSync(sqlPath,'utf8');
const schema=JSON.parse(readFileSync(schemaPath,'utf8'));

const norm=s=>s.replace(/["`\[\]]/g,'').trim();
const collect=(re)=>{const out=[];for(const m of sql.matchAll(re))out.push(norm(m[1]));return out;};

const tables=new Set(collect(/\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w"`\[\].-]+)/gi));
const indexes=new Set(collect(/\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w"`\[\].-]+)/gi));
const triggers=new Set(collect(/\bCREATE\s+TRIGGER\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w"`\[\].-]+)/gi));
const views=new Set(collect(/\bCREATE\s+VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w"`\[\].-]+)/gi));
const insertTables=collect(/\bINSERT\s+INTO\s+([\w"`\[\].-]+)/gi);
const insertStatementCounts={};for(const name of insertTables)insertStatementCounts[name]=(insertStatementCounts[name]??0)+1;

const expected=(schema.tables??[]).map(x=>({table:x.table,classification:x.classification}));
const liveExpected=expected.filter(x=>x.classification==='LIVE_CONFIRMED').map(x=>x.table);
const sourceOnly=expected.filter(x=>x.classification==='SOURCE_REFERENCED_NOT_VISIBLE').map(x=>x.table);
const missingLive=liveExpected.filter(x=>!tables.has(x));
const missingSourceOnly=sourceOnly.filter(x=>!tables.has(x));
const extra=[...tables].filter(x=>!expected.some(e=>e.table===x) && !x.startsWith('sqlite_'));

const transaction={
 begin:/\bBEGIN(?:\s+TRANSACTION)?\b/i.test(sql),
 commit:/\bCOMMIT\b/i.test(sql),
 rollback:/\bROLLBACK\b/i.test(sql),
};

const dangerous=[];
for(const re of [
 /\bATTACH\b/gi,/\bDETACH\b/gi,/\bVACUUM\b/gi,/\bload_extension\b/gi,
]) if(re.test(sql))dangerous.push(re.source);

const result={
 sqlPath,
 bytes:Buffer.byteLength(sql),
 expected:{liveConfirmed:liveExpected.length,sourceReferencedNotVisible:sourceOnly.length},
 objects:{tables:[...tables].sort(),indexes:[...indexes].sort(),triggers:[...triggers].sort(),views:[...views].sort()},
 missing:{liveConfirmed:missingLive,sourceReferencedNotVisible:missingSourceOnly},
 extraTables:extra.sort(),
 insertStatementCounts,
 transaction,
 dangerousPatterns:dangerous,
 pass:missingLive.length===0&&dangerous.length===0,
 notes:[
  'INSERT statement counts are not row counts.',
  'Presence of a table in SQL does not prove target import row parity.',
  'SOURCE_REFERENCED_NOT_VISIBLE tables are reported separately and are not required for export PASS unless support confirms they exist in live D1.',
  'Transaction markers are descriptive evidence only; support must confirm snapshot consistency semantics.'
 ]
};
console.log(JSON.stringify(result,null,2));
assert.equal(missingLive.length,0,`Export missing LIVE_CONFIRMED tables: ${missingLive.join(', ')}`);
assert.equal(dangerous.length,0,`Export contains disallowed patterns: ${dangerous.join(', ')}`);
