import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import {DatabaseSync} from 'node:sqlite';
import {auditPc,crc32,openBulkZip,readCompanyFact,scanCachedPrices,runPc} from './market-calendar-r50-bulk-facts-readonly.mjs';

function tempDir(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r50-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;}
function zipBuffer(entries){
 let offset=0;const local=[],central=[];
 for(const [name,content] of entries){
  const raw=Buffer.from(content),compressed=zlib.deflateRawSync(raw),file=Buffer.from(name);
  const crc=crc32(raw),l=Buffer.alloc(30),c=Buffer.alloc(46);
  l.writeUInt32LE(0x04034b50,0);l.writeUInt16LE(20,4);l.writeUInt16LE(8,8);l.writeUInt32LE(crc,14);
  l.writeUInt32LE(compressed.length,18);l.writeUInt32LE(raw.length,22);l.writeUInt16LE(file.length,26);
  c.writeUInt32LE(0x02014b50,0);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(8,10);
  c.writeUInt32LE(crc,16);c.writeUInt32LE(compressed.length,20);c.writeUInt32LE(raw.length,24);
  c.writeUInt16LE(file.length,28);c.writeUInt32LE(offset,42);
  const chunk=Buffer.concat([l,file,compressed]);local.push(chunk);central.push(c,file);offset+=chunk.length;
 }
 const centralBuffer=Buffer.concat(central),end=Buffer.alloc(22);
 end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);
 end.writeUInt32LE(centralBuffer.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...local,centralBuffer,end]);
}

const cik='0000320193';
const companyFacts=(shares=100000)=>JSON.stringify({cik:320193,facts:{dei:{EntityCommonStockSharesOutstanding:{units:{shares:[
 {end:'2026-09-30',filed:'2026-10-15',val:shares}
]}}}}});

test('CRC32 known vector',()=>assert.equal(crc32(Buffer.from('123456789')),0xcbf43926));
test('read one SEC member by ZIP index without writing extracted files',t=>{
 const dir=tempDir(t),file=path.join(dir,'companyfacts.zip');fs.writeFileSync(file,zipBuffer([[`CIK${cik}.json`,companyFacts()]]));
 const zip=openBulkZip(file);
 try{assert.equal(zip.entries,1);assert.equal(zip.index.size,1);
  assert.equal(readCompanyFact(zip,zip.index.get(cik)).cik,320193);
 }finally{zip.close();}
 assert.deepEqual(fs.readdirSync(dir),['companyfacts.zip']);
});
test('CRC failure is identified',t=>{
 const dir=tempDir(t),file=path.join(dir,'companyfacts.zip');
 const content=zipBuffer([[`CIK${cik}.json`,companyFacts()]]);
 const centralOffset=content.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));
 content.writeUInt32LE(1,centralOffset+16);
 fs.writeFileSync(file,content);
 const zip=openBulkZip(file);
 try{assert.throws(()=>readCompanyFact(zip,zip.index.get(cik)),/ENTRY_CHECKSUM_FAILED/);}
 finally{zip.close();}
});
test('duplicate ZIP CIK remains ambiguous and is excluded',t=>{
 const dir=tempDir(t),file=path.join(dir,'companyfacts.zip');
 fs.writeFileSync(file,zipBuffer([[`CIK${cik}.json`,companyFacts()],[`nested/CIK${cik}.json`,companyFacts(100001)]]));
 const zip=openBulkZip(file);try{assert.equal(zip.index.size,0);assert.ok(zip.duplicates.has(cik));}finally{zip.close();}
});
test('truncated ZIP is refused',t=>{
 const dir=tempDir(t),file=path.join(dir,'companyfacts.zip');fs.writeFileSync(file,Buffer.from('not-a-zip'));
 assert.throws(()=>openBulkZip(file),/ZIP_SIZE_INVALID/);
});
test('price scan reads all matching files with no arbitrary 1200-file cutoff',t=>{
 const dir=tempDir(t),ticker=new Set(['AAPL']);
 for(let i=0;i<1202;i++){
  const name=`2026-10-28-2026-10-29-group-${i}.json`;
  fs.writeFileSync(path.join(dir,name),JSON.stringify([{ticker:'AAPL',tradeDate:'2026-10-28',
   currentClose:277,source:'ALPACA',feed:'iex',adjustmentStatus:'split'}]));
 }
 const r=scanCachedPrices(dir,ticker,'2026-10-29');
 assert.equal(r.fileCount,1202);assert.equal(r.readFiles,1202);assert.equal(r.skippedByBudget,0);
 assert.equal(r.latest.get('AAPL').close,277);
});

function fixturePc(t){
 const root=tempDir(t),incoming=path.join(root,'manual-input','e1-r5','incoming');
 fs.mkdirSync(incoming,{recursive:true});fs.mkdirSync(path.join(root,'storage'));
 const dbPath=path.join(root,'storage','core.sqlite'),db=new DatabaseSync(dbPath);
 db.exec('CREATE TABLE public_feed_snapshots_v1(kind TEXT,feed_key TEXT,snapshot_key TEXT,body TEXT)');
 const days=Array.from({length:14},(_,i)=>new Date(Date.parse('2026-10-29T00:00:00Z')+i*86400000).toISOString().slice(0,10));
 const byDay=Object.fromEntries(days.map(day=>[day,['<article class="mc-row mc-vendor-row" data-search="aapl Apple">x</article>']]));
 const calendar={status:'READY_DISPLAY',mode:'OWN_SITE_HTML_ONLY',rawVendorJsonExposed:false,
  publicJsonFeed:false,redistribution:false,coveredDays:days,byDay,recordCount:14,checkedAt:'2026-10-29T04:00:00Z'};
 db.prepare('INSERT INTO public_feed_snapshots_v1 VALUES(?,?,?,?)')
  .run('output','market-calendar:earnings-display-html','current',JSON.stringify(calendar));db.close();
 fs.writeFileSync(path.join(incoming,'company_tickers_exchange.json'),JSON.stringify({fields:['cik','name','ticker','exchange'],data:[[320193,'Apple','AAPL','Nasdaq']]}));
 fs.writeFileSync(path.join(incoming,'companyfacts.zip'),zipBuffer([[`CIK${cik}.json`,companyFacts()]]));
 const priceDir=path.join(root,'asset-r10-alpaca','incremental');fs.mkdirSync(priceDir,{recursive:true});
 fs.writeFileSync(path.join(priceDir,'2026-10-28-2026-10-29-group-1.json'),JSON.stringify([{
  ticker:'AAPL',tradeDate:'2026-10-28',currentClose:277,source:'ALPACA',feed:'iex',adjustmentStatus:'split'
 }]));
 return {root,dbPath};
}
test('PC audit joins existing SEC and price candidates, never publishes caps',t=>{
 const {root,dbPath}=fixturePc(t),original=fs.readFileSync(dbPath);
 const r=auditPc({pcHome:root,asOf:'2026-10-29'});
 assert.equal(r.status,'R50_BULK_AND_PRICE_READONLY_COMPLETE');
 assert.equal(r.calendarUniqueTickers,1);assert.equal(r.zipSharesUsableIssuerCandidates,1);
 assert.equal(r.priceFilesRead,1);assert.equal(r.shareFactAndPriceTickerCandidates,1);
 assert.equal(r.freshShareFactAndPriceTickerCandidates,1);
 assert.equal(r.capValuesComputed,0);assert.equal(r.gradeableTickerCount,0);
 assert.equal(r.providerRequests,0);assert.equal(r.dbWrites,0);assert.equal(r.d1Writes,0);
 assert.deepEqual(fs.readFileSync(dbPath),original);
});
test('PC output is one-time, writes aggregate report only',t=>{
 const {root}=fixturePc(t),output=tempDir(t);
 const first=runPc({pcHome:root,outputDir:output,asOf:'2026-10-29'});
 assert.equal(first.status,'R50_BULK_AND_PRICE_READONLY_COMPLETE');
 const report=fs.readFileSync(path.join(output,first.file),'utf8');
 assert.match(report,/gradeableTickerCount=0/);assert.doesNotMatch(report,/AAPL|320193|secret/i);
 assert.equal(runPc({pcHome:root,outputDir:output,asOf:'2026-10-29'}).status,'R50_RESULT_ALREADY_EXISTS_STOP');
});
