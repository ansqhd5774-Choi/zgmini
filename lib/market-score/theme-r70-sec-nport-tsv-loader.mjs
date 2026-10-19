import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';

/** Offline, streaming SEC N-PORT flat-table reader; no network/DB/write/score.
 * Official SEC NPORT readme table definitions: SUBMISSION, REGISTRANT,
 * FUND_REPORTED_INFO, FUND_REPORTED_HOLDING, IDENTIFIERS.
 */
export const R70_VERSION='THEME-R70-SEC-NPORT-TSV-STREAMING-INPUT-V1';
export const R70_TABLES=Object.freeze({
 submission:['ACCESSION_NUMBER','FILING_DATE','REPORT_DATE','SUB_TYPE'],
 registrant:['ACCESSION_NUMBER','CIK'],
 fundReportedInfo:['ACCESSION_NUMBER','SERIES_ID'],
 fundReportedHolding:['ACCESSION_NUMBER','HOLDING_ID','ISSUER_CUSIP','ASSET_CAT','PERCENTAGE'],
 identifiers:['HOLDING_ID','IDENTIFIERS_ID','IDENTIFIER_ISIN','IDENTIFIER_TICKER'],
});
const fail=s=>{throw Error('R70_'+s);},req=(c,s)=>{if(!c)fail(s);};
const MAX_BYTES=4000000000,MAX_TARGET_ROWS=10000,digits=/^\d+$/,ACCESSION=/^\d{10}-\d{2}-\d{6}$/;
export async function readR70Tsv({filename,columns,acceptRow,maxRows=MAX_TARGET_ROWS,maxBytes=MAX_BYTES}={}){
 req(typeof filename==='string'&&path.isAbsolute(filename),'ABSOLUTE_FILENAME_REQUIRED');
 req(Array.isArray(columns)&&columns.length>0&&typeof acceptRow==='function','SCHEMA_OR_FILTER_REQUIRED');
 const st=await fsp.stat(filename);req(st.isFile()&&st.size<=maxBytes,'FILE_SIZE_OR_TYPE_LIMIT');
 req(/\.(tsv|txt|csv)$/i.test(path.basename(filename)),'NOT_SEC_FLAT_TEXT');
 const input=fs.createReadStream(filename,{encoding:'utf8',highWaterMark:65536});
 const iter=readline.createInterface({input,crlfDelay:Infinity});
 let cols=null,seen=0;const matches=[];
 try{
  for await(const line of iter){
   if(!cols){
    cols=line.replace(/^\uFEFF/,'').split('\t');
    req(cols.length>=columns.length&&new Set(cols).size===cols.length&&columns.every(x=>cols.includes(x)),'MISSING_OR_DUPLICATED_COLUMNS');
    continue;
   }
   if(!line)continue;
   const vals=line.split('\t');req(vals.length===cols.length,'ROW_WIDTH_MISMATCH');seen++;
   const row=Object.fromEntries(cols.map((c,i)=>[c,vals[i]]));
   if(acceptRow(row)){matches.push(Object.freeze(row));req(matches.length<=maxRows,'MATCHED_ROW_LIMIT');}
  }
 }finally{iter.close();input.destroy();}
 req(cols!==null,'EMPTY_FILE');
 return Object.freeze({scannedRows:seen,matchedRows:matches.length,rows:Object.freeze(matches),bytes:st.size});
}
export function consolidateR70IdentifierRows(rows,requiredHoldingIds){
 req(Array.isArray(rows)&&requiredHoldingIds instanceof Set,'IDENTIFIER_ROWS_INVALID');
 const buckets=new Map(),seenCompound=new Set();
 for(const r of rows){
  const holdingId=String(r?.HOLDING_ID??'').trim(),itemId=String(r?.IDENTIFIERS_ID??'').trim();
  req(digits.test(holdingId)&&digits.test(itemId),'BAD_IDENTIFIER_KEYS');
  if(!requiredHoldingIds.has(holdingId))continue;
  const pk=holdingId+'|'+itemId;req(!seenCompound.has(pk),'DUPLICATE_IDENTIFIER_COMPOUND_KEY');seenCompound.add(pk);
  const group=buckets.get(holdingId)??[];group.push(r);buckets.set(holdingId,group);
 }
 let merged=0,conflicts=0;const out=[];
 for(const [holdingId,group] of buckets){
  const field=key=>new Set(group.map(x=>String(x[key]??'').trim()).filter(Boolean));
  const tickers=field('IDENTIFIER_TICKER'),isins=field('IDENTIFIER_ISIN');
  if(tickers.size>1||isins.size>1){conflicts++;out.push(...group);}
  else{
   if(group.length>1)merged+=group.length-1;
   out.push(Object.freeze({HOLDING_ID:holdingId,IDENTIFIER_ISIN:[...isins][0]??'',IDENTIFIER_TICKER:[...tickers][0]??''}));
  }
 }
 return Object.freeze({rows:Object.freeze(out),mergedConsistentRows:merged,conflictingHoldings:conflicts});
}
/** Reads only explicitly named existing local SEC text files. No extraction,
 * downloading, backfill, formula, provider, DB, or external publication.
 */
export async function loadR70ExactAccession({tables,accession,maxBytes=MAX_BYTES}={}){
 req(ACCESSION.test(accession??''),'ACCESSION_FORMAT');
 req(tables&&Object.keys(R70_TABLES).every(k=>typeof tables[k]==='string'),'FIVE_TABLE_PATHS_REQUIRED');
 const results={};let scanned=0;
 for(const [key,columns] of Object.entries(R70_TABLES)){
  if(key==='identifiers')continue;
  const result=await readR70Tsv({filename:tables[key],columns,maxBytes,acceptRow:row=>row.ACCESSION_NUMBER===accession});
  results[key]=result.rows;scanned+=result.scannedRows;
 }
 req(results.submission.length===1&&results.registrant.length===1&&results.fundReportedInfo.length===1,'MISSING_OR_DUPLICATE_FILING');
 const holdingIds=new Set();
 for(const h of results.fundReportedHolding){
  req(digits.test(h.HOLDING_ID)&&!holdingIds.has(h.HOLDING_ID),'HOLDING_ID_DUPLICATE_OR_INVALID');holdingIds.add(h.HOLDING_ID);
 }
 const r=await readR70Tsv({filename:tables.identifiers,columns:R70_TABLES.identifiers,maxBytes,acceptRow:row=>holdingIds.has(row.HOLDING_ID)});
 scanned+=r.scannedRows;
 const ids=consolidateR70IdentifierRows(r.rows,holdingIds);
 return Object.freeze({
  version:R70_VERSION,accession,scannedRows:scanned,holdingsMatched:results.fundReportedHolding.length,
  identifierRowsMatched:r.matchedRows,mergedConsistentIdentifiers:ids.mergedConsistentRows,conflictingHoldings:ids.conflictingHoldings,
  privateR67Input:Object.freeze({submissionRows:results.submission,registrantRows:results.registrant,
    fundRows:results.fundReportedInfo,holdingRows:results.fundReportedHolding,identifierRows:ids.rows}),
  status:'LOCAL_SEC_TABLES_READ_ONLY_NO_DAILY_PIT_OR_SCORE'
 });
}
export function summarizeR70WithoutPrivateRows(report){
 req(report?.version===R70_VERSION,'INVALID_REPORT');
 const {privateR67Input,...safe}=report;return Object.freeze(safe);
}
