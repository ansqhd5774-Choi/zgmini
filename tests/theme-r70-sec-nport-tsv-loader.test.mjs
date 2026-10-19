import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {readR70Tsv,loadR70ExactAccession,consolidateR70IdentifierRows,summarizeR70WithoutPrivateRows} from '../lib/market-score/theme-r70-sec-nport-tsv-loader.mjs';
const acc='0000940400-26-032759',foreign='0000940400-26-032760';
const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'r70-'));
const setup=root=>{
 const write=(name,headers,rows)=>{const file=path.join(root,name+'.tsv');fs.writeFileSync(file,[headers.join('\t'),...rows.map(r=>r.join('\t'))].join('\n')+'\n');return file;};
 return {
  submission:write('SUBMISSION',['ACCESSION_NUMBER','FILING_DATE','REPORT_DATE','SUB_TYPE'],[[foreign,'2026-08-22','2026-06-30','NPORT-P'],[acc,'2026-08-21','2026-06-30','NPORT-P']]),
  registrant:write('REGISTRANT',['ACCESSION_NUMBER','CIK'],[[acc,'1364608'],[foreign,'1432353']]),
  fundReportedInfo:write('FUND_REPORTED_INFO',['ACCESSION_NUMBER','SERIES_ID'],[[acc,'S000050385'],[foreign,'S000066713']]),
  fundReportedHolding:write('FUND_REPORTED_HOLDING',['ACCESSION_NUMBER','HOLDING_ID','ISSUER_CUSIP','ASSET_CAT','PERCENTAGE'],[[acc,'42','123456789','EC','2'],[foreign,'43','999999999','EC','2'],[acc,'44','','EC','4']]),
  identifiers:write('IDENTIFIERS',['HOLDING_ID','IDENTIFIERS_ID','IDENTIFIER_ISIN','IDENTIFIER_TICKER'],[['43','90','US9999999999','FOREIGN'],['42','1','','ONE'],['42','2','US1234567890',''],['44','3','US0987654321','TWO']]),
 };
};
test('five official SEC flat-file schemas, exact accession and consistent identifier merge',async()=>{
 const root=tmp();try{
  const x=await loadR70ExactAccession({tables:setup(root),accession:acc});
  assert.equal(x.holdingsMatched,2);assert.equal(x.identifierRowsMatched,3);
  assert.equal(x.mergedConsistentIdentifiers,1);assert.equal(x.conflictingHoldings,0);
  assert.equal(x.privateR67Input.identifierRows.length,2);
  assert.equal(x.privateR67Input.identifierRows[0].IDENTIFIER_ISIN,'US1234567890');
  assert.equal(summarizeR70WithoutPrivateRows(x).privateR67Input,undefined);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('unrelated filing does not contaminate exact accession',async()=>{
 const root=tmp();try{const x=await loadR70ExactAccession({tables:setup(root),accession:foreign});assert.equal(x.holdingsMatched,1);assert.equal(x.privateR67Input.fundRows[0].SERIES_ID,'S000066713');}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('missing official headers and byte cap fail closed',async()=>{
 const root=tmp();try{const file=path.join(root,'bad.tsv');fs.writeFileSync(file,'WRONG\tHEAD\nA\tB\n');
 await assert.rejects(readR70Tsv({filename:file,columns:['ACCESSION_NUMBER'],acceptRow:()=>true}),/MISSING_OR_DUPLICATED_COLUMNS/);
 await assert.rejects(readR70Tsv({filename:file,columns:['WRONG'],acceptRow:()=>true,maxBytes:1}),/FILE_SIZE_OR_TYPE_LIMIT/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('inconsistent multiple identifiers held for review',()=>{
 const x=consolidateR70IdentifierRows([{HOLDING_ID:'1',IDENTIFIERS_ID:'10',IDENTIFIER_ISIN:'US1234567890',IDENTIFIER_TICKER:'X'},{HOLDING_ID:'1',IDENTIFIERS_ID:'11',IDENTIFIER_ISIN:'US0987654321',IDENTIFIER_TICKER:'Y'}],new Set(['1']));
 assert.equal(x.conflictingHoldings,1);assert.equal(x.rows.length,2);
});
test('duplicate identifier compound key rejected',()=>{
 assert.throws(()=>consolidateR70IdentifierRows([{HOLDING_ID:'1',IDENTIFIERS_ID:'2'},{HOLDING_ID:'1',IDENTIFIERS_ID:'2'}],new Set(['1'])),/DUPLICATE_IDENTIFIER_COMPOUND_KEY/);
});
test('missing a required table is not counted as zero',async()=>{
 const root=tmp();try{const paths=setup(root);delete paths.identifiers;await assert.rejects(loadR70ExactAccession({tables:paths,accession:acc}),/FIVE_TABLE_PATHS_REQUIRED/);}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('invalid accession rejected',async()=>{await assert.rejects(loadR70ExactAccession({tables:{},accession:'invalid'}),/ACCESSION_FORMAT/);});
test('table loader never modifies original data',async()=>{
 const root=tmp();try{const paths=setup(root),before=fs.readFileSync(paths.identifiers);const x=await loadR70ExactAccession({tables:paths,accession:acc});
 assert.deepEqual(fs.readFileSync(paths.identifiers),before);assert.equal(x.status,'LOCAL_SEC_TABLES_READ_ONLY_NO_DAILY_PIT_OR_SCORE');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
