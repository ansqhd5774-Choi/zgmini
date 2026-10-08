import test from 'node:test';
import assert from 'node:assert/strict';
import {deflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {collectGdeltArchiveChunk,fetchMasterWindow,masterWindowRows} from '../scripts/iran-progress/gdelt-backfill-r14.mjs';
const H=3600000,S=900000,NOW=Date.parse('2026-10-08T16:00:00Z');
const START=NOW-H,TARGET=START+S,EARLIER=START-S;
const stamp=n=>new Date(n).toISOString().replace(/[-:TZ.]/g,'').slice(0,14);
const ts=n=>new Date(n).toISOString().replace(/[-:TZ.]/g,'').slice(0,14);
function row(id,at){
 const f=Array(61).fill('');
 Object.assign(f,{0:String(id),1:'20261008',6:'IRAN',7:'IRN',16:'ISRAEL',17:'ISR',26:'190',28:'19',29:'4',51:'IR',59:ts(at),60:'https://example.org/news/'+id});
 return f.join('\t');
}
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c&1)?(c>>>1)^0xedb88320:c>>>1;}return(c^0xffffffff)>>>0;}
function makeZip(at){
 const data=Buffer.from(row(Math.floor(at/S),at)),packed=deflateRawSync(data),name=Buffer.from(stamp(at)+'.export.CSV');
 const local=Buffer.alloc(30),central=Buffer.alloc(46),end=Buffer.alloc(22),crc=crc32(data);
 local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(8,8);local.writeUInt32LE(crc,14);local.writeUInt32LE(packed.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(name.length,26);
 central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(8,10);central.writeUInt32LE(crc,16);central.writeUInt32LE(packed.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(name.length,28);
 const front=Buffer.concat([local,name,packed]),center=Buffer.concat([central,name]);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(center.length,12);end.writeUInt32LE(front.length,16);
 return Buffer.concat([front,center,end]);
}
const files=new Map([EARLIER,START,TARGET].map(t=>[t,makeZip(t)]));
const manifest='INCOMPLETE_PREFIX\n'+[EARLIER,START,TARGET].map(at=>{
 const bytes=files.get(at),md5=createHash('md5').update(bytes).digest('hex');
 return bytes.length+' '+md5+' http://data.gdeltproject.org/gdeltv2/'+stamp(at)+'.export.CSV.zip';
}).join('\n')+'\n';
const checkpoint=()=>({version:'GDELT_EVENTS_BACKFILL_R14',startAt:START,nextAt:START,targetAt:TARGET,archivesSaved:0});
function store(){
 const checkpoints=new Map([['gdelt-events-r14',checkpoint()]]),saved=new Map(),candidates=new Map();
 return {checkpoints,saved,candidates,
  getCheckpoint:k=>checkpoints.get(k)??null,
  checkpoint(k,v){checkpoints.set(k,structuredClone(v));},
  putCandidate(c){candidates.set(c.id,c);},
  putSource(k,v){saved.set(k,v);}
 };
}
const calls=[];
function goodFetch(url,opts){
 calls.push({url,opts});
 if(url.endsWith('/masterfilelist.txt'))return new Response(manifest,{status:206,headers:{'content-range':'bytes 9876-11234/11235'}});
 const at=[...files.keys()].find(x=>url.endsWith(stamp(x)+'.export.CSV.zip'));
 if(at==null)return new Response('not found',{status:404});
 return new Response(files.get(at),{status:200});
}
test('master index only accepts original host and 15-minute timestamps, not an incident ledger',()=>{
 const r=masterWindowRows(manifest,{startAt:START,targetAt:TARGET});
 assert.equal(r.status,'INDEXED');assert.equal(r.entries.length,2);
 assert.equal(r.entries[0].at,START);assert.equal(r.attackCount,null);
 assert.equal(r.coverageVerified,false);assert.equal(r.eventVerified,false);
 assert.throws(()=>masterWindowRows('INCOMPLETE_PREFIX\n'+manifest.replaceAll('data.gdeltproject.org','evil.test'),{startAt:START,targetAt:TARGET}),/TAIL_INCOMPLETE/);
});
test('archive collection saves metadata+candidate before cursor, resumes without a duplicate request',async()=>{
 calls.length=0;const db=store();
 const first=await collectGdeltArchiveChunk({store:db,now:NOW,maxArchives:1,fetcher:goodFetch});
 assert.equal(first.status,'RUNNING');assert.equal(first.processed,1);
 assert.equal(db.getCheckpoint('gdelt-events-r14').nextAt,TARGET);
 assert.equal(db.candidates.size,1);assert.equal(db.saved.size,1);
 const record=[...db.saved.values()][0];assert.equal(record.checksumVerified,true);
 assert.equal(record.coverageVerified,false);assert.equal(record.attackCount,null);
 const second=await collectGdeltArchiveChunk({store:db,now:NOW,maxArchives:1,fetcher:goodFetch});
 assert.equal(second.status,'CAUGHT_UP',JSON.stringify(second));assert.equal(second.processed,1);assert.equal(db.candidates.size,2);assert.equal(db.saved.size,2);
 const third=await collectGdeltArchiveChunk({store:db,now:NOW,maxArchives:1,fetcher:()=>{throw Error('unexpected network');}});
 assert.equal(third.status,'CAUGHT_UP');assert.equal(db.saved.size,2);
 assert.equal(calls.filter(c=>c.url.endsWith('/masterfilelist.txt')).length,1);
});
test('source 429 preserves cursor and retry cooldown; does not retry during cooldown',async()=>{
 const db=store();let requests=0;
 const r=await collectGdeltArchiveChunk({store:db,now:NOW,maxArchives:1,fetcher:(url)=>{
  requests++;return url.endsWith('masterfilelist.txt')?new Response(manifest,{status:206,headers:{'content-range':'bytes 9876-11234/11235'}})
   :new Response('limited',{status:429,headers:{'retry-after':'60'}});
 }});
 assert.equal(r.reason,'GDELT_ARCHIVE_HTTP_429');assert.equal(r.httpStatus,429);
 assert.equal(db.getCheckpoint('gdelt-events-r14').nextAt,START);
 assert.equal(db.getCheckpoint('gdelt-events-r14').retryAt,NOW+6*H);
 const repeat=await collectGdeltArchiveChunk({store:db,now:NOW+H,maxArchives:1,fetcher:()=>{requests++;throw Error('not allowed');}});
 assert.equal(repeat.status,'DEFERRED');assert.equal(requests,2);
 assert.equal(db.candidates.size,0);
});
test('missing master archive is backlog blocker, never a fabricated zero event',async()=>{
 const db=store();
 const onlyFirst='TRUNCATED\n'+manifest.split('\n').filter(x=>x.includes(stamp(EARLIER))||x.includes(stamp(START))).join('\n')+'\n';
 const index=await fetchMasterWindow({startAt:START,targetAt:TARGET,rangeBytes:1048576,fetcher:async()=>new Response(onlyFirst,{status:206,headers:{'content-range':'bytes 900-1600/1601'}})});
 assert.equal(index.status,'INDEXED');assert.equal(index.entries.length,1);
 db.checkpoint('gdelt-events-index-r14',index);
 const a=await collectGdeltArchiveChunk({store:db,now:NOW,maxArchives:3,fetcher:goodFetch});
 assert.equal(a.status,'BACKLOG_BLOCKED');assert.equal(a.reason,'GDELT_ARCHIVE_MISSING_IN_INDEX');
 assert.equal(db.getCheckpoint('gdelt-events-r14').nextAt,TARGET);
 assert.equal(a.coverageVerified,false);
});
test('full catalogue response is rejected to avoid 128MB unbounded download',async()=>{
 const response=await fetchMasterWindow({startAt:START,targetAt:TARGET,rangeBytes:1048576,
  fetcher:async()=>new Response('text',{status:200})});
 assert.equal(response.reason,'GDELT_MASTER_RANGE_UNSUPPORTED');
});
test('failed source persistence cannot skip a 15-minute slice',async()=>{
 const db=store();db.putSource=()=>{throw Error('LOCAL_SQLITE_WRITE_FAILED');};
 await assert.rejects(()=>collectGdeltArchiveChunk({store:db,now:NOW,maxArchives:1,fetcher:goodFetch}),/LOCAL_SQLITE_WRITE_FAILED/);
 assert.equal(db.getCheckpoint('gdelt-events-r14').nextAt,START);
});
