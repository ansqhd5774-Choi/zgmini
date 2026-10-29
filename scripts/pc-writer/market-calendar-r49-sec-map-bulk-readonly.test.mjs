import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {parseExchangeMap,inspectCentralDirectory,summarizeCoverage,auditPc,runPc} from './market-calendar-r49-sec-map-bulk-readonly.mjs';

const secMap=rows=>({fields:['cik','name','ticker','exchange'],data:rows});
const cikA='0000320193',cikB='0000001800';

function fakeZip(ciks){
 const locals=[],centers=[];let offset=0;
 for(const cik of ciks){
  const name=Buffer.from(`CIK${cik}.json`,'utf8');
  const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(name.length,26);
  locals.push(local,name);
  const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50,0);
  central.writeUInt16LE(name.length,28);central.writeUInt32LE(offset,42);
  centers.push(central,name);offset+=local.length+name.length;
 }
 const center=Buffer.concat(centers),end=Buffer.alloc(22);
 end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(ciks.length,8);end.writeUInt16LE(ciks.length,10);
 end.writeUInt32LE(center.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...locals,center,end]);
}

function fixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r49-sec-audit-'));
 const pc=path.join(dir,'pc'),out=path.join(dir,'out'),incoming=path.join(pc,'manual-input','e1-r5','incoming');
 fs.mkdirSync(path.join(pc,'storage'),{recursive:true});fs.mkdirSync(incoming,{recursive:true});fs.mkdirSync(out);
 const db=new DatabaseSync(path.join(pc,'storage','core.sqlite'));
 db.exec('CREATE TABLE public_feed_snapshots_v1(kind TEXT,feed_key TEXT,snapshot_key TEXT,body TEXT)');
 db.exec('CREATE TABLE market_score_earnings_e1_r3_universe_v1(body_json TEXT,period_end TEXT)');
 const dates=Array.from({length:14},(_,i)=>new Date(Date.UTC(2026,9,1+i)).toISOString().slice(0,10));
 const html=t=>`<article class="mc-row mc-vendor-row" data-search="${t.toLowerCase()} sample">ok</article>`;
 const snapshot={status:'READY_DISPLAY',mode:'OWN_SITE_HTML_ONLY',rawVendorJsonExposed:false,
  publicJsonFeed:false,redistribution:false,recordCount:3,checkedAt:'2026-10-29T00:00:00Z',
  coveredDays:dates,byDay:Object.fromEntries(dates.map((d,i)=>[d,i===0?[html('AAPL'),html('GOOG'),html('BRK.B')]:[]]))};
 db.prepare('INSERT INTO public_feed_snapshots_v1 VALUES(?,?,?,?)').run('output','market-calendar:earnings-display-html','current',JSON.stringify(snapshot));
 db.prepare('INSERT INTO market_score_earnings_e1_r3_universe_v1 VALUES(?,?)').run(JSON.stringify({members:[{ticker:'AAPL',cik:320193}]}),'2026-06-30');
 db.close();fs.writeFileSync(path.join(incoming,'companyfacts.zip'),fakeZip([cikA,cikB]));
 return {dir,pc,out,incoming};
}

test('parse real SEC exchange tuple shape',()=>{
 const r=parseExchangeMap(secMap([[320193,'Apple Inc','AAPL','Nasdaq'],[1800,'Alphabet','GOOG','Nasdaq']]));
 assert.equal(r.map.get('AAPL'),cikA);assert.equal(r.map.get('GOOG'),cikB);assert.equal(r.sourceRows,2);
});
test('conflicting CIKs are excluded rather than silently overwritten',()=>{
 const r=parseExchangeMap(secMap([[320193,'Apple','AAPL','Nasdaq'],[1800,'Other','AAPL','NYSE']]));
 assert.equal(r.map.has('AAPL'),false);assert.equal(r.conflicts.has('AAPL'),true);
});
test('schema and malformed tickers are rejected',()=>{
 assert.throws(()=>parseExchangeMap({fields:['ticker'],data:[]}),/FIELDS_INVALID/);
 const r=parseExchangeMap(secMap([[320193,'Apple','AAPL','Nasdaq'],['xxx','Invalid','BAD','OTC']]));
 assert.equal(r.ignored,1);assert.equal(r.map.size,1);
});
test('ZIP central directory enumerates CIKs without extracting archive',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r49-zip-'));
 try{const file=path.join(dir,'companyfacts.zip');fs.writeFileSync(file,fakeZip([cikA,cikB]));
  const r=inspectCentralDirectory(file);assert.equal(r.status,'ZIP_INDEX_READ');assert.equal(r.ciks.size,2);
  assert.equal(r.entries,2);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('corrupted ZIP is not counted as successful coverage',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r49-zip-bad-'));
 try{const file=path.join(dir,'companyfacts.zip');fs.writeFileSync(file,Buffer.from('not a zip'));
  assert.equal(inspectCentralDirectory(file).status,'ZIP_INDEX_UNREADABLE');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('mapping coverage does not auto-map punctuation aliases or verify caps',()=>{
 const r=summarizeCoverage({tickers:new Set(['AAPL','GOOG','BRK.B']),oldMapping:new Map([['AAPL',cikA]]),
  secMapping:parseExchangeMap(secMap([[320193,'Apple','AAPL','Nasdaq'],[1800,'Alphabet','GOOG','Nasdaq'],[1800,'Berkshire','BRK-B','NYSE']])),
  zipCiks:new Set([cikA,cikB]),extractedCiks:new Set([cikA])});
 assert.equal(r.existingUniverseMappingCount,1);assert.equal(r.secMappingTickerCount,2);
 assert.equal(r.secNewMappingTickerCount,1);assert.equal(r.secBulkZipTickerMatches,2);
 assert.equal(r.dotHyphenAliasCandidatesNotAutoMapped,1);
});
test('preexisting SEC mapping: zero requests, PC SQLite readonly, no cap',async()=>{
 const x=fixture();
 try{fs.writeFileSync(path.join(x.incoming,'company_tickers_exchange.json'),JSON.stringify(secMap([[320193,'Apple','AAPL','Nasdaq'],[1800,'Alphabet','GOOG','Nasdaq']])));
  const r=await auditPc({pcHome:x.pc,fetchImpl:()=>{throw Error('NETWORK_NOT_EXPECTED');}});
  assert.equal(r.status,'R49_MAPPING_AND_BULK_INDEX_RETRIEVED');assert.equal(r.providerRequests,0);
  assert.equal(r.secNewMappingTickerCount,1);assert.equal(r.secBulkZipTickerMatches,2);
  assert.equal(r.capValuesComputed,0);assert.equal(r.gradeableTickerCount,0);assert.equal(r.dbWrites,0);assert.equal(r.d1Writes,0);
  const once=await runPc({pcHome:x.pc,outputDir:x.out,fetchImpl:()=>{throw Error('NETWORK_NOT_EXPECTED');}});
  assert.equal(once.status,'R49_MAPPING_AND_BULK_INDEX_RETRIEVED');
  const report=fs.readFileSync(path.join(x.out,'MARKET_CALENDAR_R49_SEC_MAPPING_BULK_RESULT.txt'),'utf8');
  assert.match(report,/secBulkZipTickerMatches=2/);
  assert.doesNotMatch(report,/AAPL|GOOG|320193|Alphabet|Apple/);
  const second=await runPc({pcHome:x.pc,outputDir:x.out,fetchImpl:()=>{throw Error('NETWORK_NOT_EXPECTED');}});
  assert.equal(second.status,'R49_RESULT_ALREADY_EXISTS_STOP');
 }finally{fs.rmSync(x.dir,{recursive:true,force:true});}
});
test('missing SEC map: one official fetch, locally persisted, no retry',async()=>{
 const x=fixture();let count=0;
 try{
  const fetchImpl=async(url,opts)=>{count++;assert.equal(url,'https://www.sec.gov/files/company_tickers_exchange.json');
   assert.equal(opts.redirect,'error');return new Response(JSON.stringify(secMap([[320193,'Apple','AAPL','Nasdaq'],[1800,'Alphabet','GOOG','Nasdaq']])),{status:200,headers:{'content-type':'application/json'}});};
  const r=await auditPc({pcHome:x.pc,fetchImpl});assert.equal(r.providerRequests,1);
  assert.equal(r.mappingFileStatus,'DOWNLOADED_AND_STORED');assert.equal(count,1);
  assert.equal(fs.existsSync(path.join(x.incoming,'company_tickers_exchange.json')),true);
  const reread=await auditPc({pcHome:x.pc,fetchImpl:()=>{throw Error('NO_SECOND_FETCH');}});
  assert.equal(reread.providerRequests,0);
 }finally{fs.rmSync(x.dir,{recursive:true,force:true});}
});
test('SEC 403 is a bounded failure with no local raw file created',async()=>{
 const x=fixture();let count=0;
 try{const r=await auditPc({pcHome:x.pc,fetchImpl:async()=>{count++;return new Response('Denied',{status:403});}});
  assert.equal(r.status,'R49_SEC_MAP_DOWNLOAD_FAILED');assert.equal(r.failureCode,'SEC_HTTP_403');
  assert.equal(count,1);assert.equal(fs.existsSync(path.join(x.incoming,'company_tickers_exchange.json')),false);
 }finally{fs.rmSync(x.dir,{recursive:true,force:true});}
});
test('missing SEC mapping in offline mode does not request a provider',async()=>{
 const x=fixture();
 try{const r=await auditPc({pcHome:x.pc,allowDownload:false,fetchImpl:()=>{throw Error('NO_NETWORK');}});
  assert.equal(r.status,'R49_MAPPING_FILE_ABSENT_NO_NETWORK');assert.equal(r.providerRequests,0);
 }finally{fs.rmSync(x.dir,{recursive:true,force:true});}
});
test('missing ZIP is reported as partial, never bulk-index success',async()=>{
 const x=fixture();
 try{
  fs.unlinkSync(path.join(x.incoming,'companyfacts.zip'));
  fs.writeFileSync(path.join(x.incoming,'company_tickers_exchange.json'),JSON.stringify(secMap([[320193,'Apple','AAPL','Nasdaq']])));
  const r=await auditPc({pcHome:x.pc,fetchImpl:()=>{throw Error('NO_NETWORK');}});
  assert.equal(r.status,'R49_MAPPING_RETRIEVED_BULK_UNAVAILABLE');assert.equal(r.secBulkZipTickerMatches,0);
  assert.equal(r.capValuesComputed,0);
 }finally{fs.rmSync(x.dir,{recursive:true,force:true});}
});
test('CMD passes output directory without trailing backslash quoting pitfall',()=>{
 const cmd=path.join(path.dirname(fileURLToPath(import.meta.url)),'MARKET_CALENDAR_R49_SEC_MAPPING_BULK.cmd');
 const line=fs.readFileSync(cmd,'utf8').split(/\r?\n/).find(s=>s.startsWith('"E:\\ZGmini\\runtime\\node.exe"'));
 assert.ok(line);assert.match(line,/"%~dp0\."$/);assert.doesNotMatch(line,/"%~dp0"$/);
 const content=fs.readFileSync(cmd);
 assert.equal(content[0]===0xef&&content[1]===0xbb&&content[2]===0xbf,false);
 assert.match(content.toString('utf8'),/\r\n/);
});
