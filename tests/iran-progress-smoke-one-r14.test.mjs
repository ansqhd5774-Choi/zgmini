import test from 'node:test';
import assert from 'node:assert/strict';
import {deflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {collectOneGdeltFile} from '../scripts/iran-progress/smoke-one-r14.mjs';

const T='20261008233000',NOW=Date.parse('2026-10-09T00:00:00Z');
const csv=()=>{const f=Array(61).fill('');Object.assign(f,{0:'12345',1:'20261008',6:'IRAN',7:'IRN',16:'ISRAEL',17:'ISR',26:'190',28:'19',29:'4',51:'IR',59:T,60:'https://example.org/report'});return f.join('\t');};
const crc=b=>{let c=0xffffffff;for(const x of b){c^=x;for(let i=0;i<8;i++)c=c&1?(c>>>1)^0xedb88320:c>>>1;}return(c^0xffffffff)>>>0;};
function archive(){
 const text=Buffer.from(csv()),packed=deflateRawSync(text),name=Buffer.from(T+'.export.CSV');
 const local=Buffer.alloc(30),central=Buffer.alloc(46),end=Buffer.alloc(22);
 local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(8,8);local.writeUInt32LE(crc(text),14);local.writeUInt32LE(packed.length,18);local.writeUInt32LE(text.length,22);local.writeUInt16LE(name.length,26);
 central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(8,10);central.writeUInt32LE(crc(text),16);central.writeUInt32LE(packed.length,20);central.writeUInt32LE(text.length,24);central.writeUInt16LE(name.length,28);
 const front=Buffer.concat([local,name,packed]),dir=Buffer.concat([central,name]);
 end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(dir.length,12);end.writeUInt32LE(front.length,16);
 return Buffer.concat([front,dir,end]);
}
const zip=archive();
function manifest(archiveBytes=zip,at=T){
 const types=['export.CSV.zip','mentions.CSV.zip','gkg.csv.zip'];
 return types.map((type,i)=>{
  const bytes=i===0?archiveBytes:Buffer.from(type);
  return bytes.length+' '+createHash('md5').update(bytes).digest('hex')+' http://data.gdeltproject.org/gdeltv2/'+at+'.'+type;
 }).join('\n')+'\n';
}
function state(){
 const sources=new Map(),candidates=new Map();let cursorCalls=0;
 return {sources,candidates,
  putCandidate(x){candidates.set(x.id,x);},
  putSource(k,v){sources.set(k,v);},
  getCheckpoint(){cursorCalls++;throw Error('CURSOR_READ_UNEXPECTED');},
  checkpoint(){cursorCalls++;throw Error('CURSOR_WRITE_UNEXPECTED');},
  get cursorCalls(){return cursorCalls;},
  db:{prepare(sql){
   if(sql.startsWith('SELECT body FROM sources'))return{get:id=>sources.has(id)?{body:JSON.stringify(sources.get(id))}:null};
   if(sql.startsWith('SELECT count(*)'))return{get:()=>({n:candidates.size})};
   throw Error('SQL_NOT_ALLOWED');
  }},
 };
}
function fetcher({index=manifest(),download=zip,failIndex=null,failArchive=null}={}){
 const calls=[];
 return {calls,call:async url=>{
  calls.push(url);
  if(url.endsWith('lastupdate.txt'))return new Response(failIndex??index,{status:failIndex?403:200});
  if(url==='https://data.gdeltproject.org/gdeltv2/'+T+'.export.CSV.zip')
   return new Response(failArchive??download,{status:failArchive?403:200});
  throw Error('UNEXPECTED_GDELT_REQUEST');
 }};
}
test('one-file official archive is checked, stored and read back without advancing any checkpoint',async()=>{
 const s=state(),api=fetcher();
 const result=await collectOneGdeltFile({store:s,fetcher:api.call,now:NOW});
 assert.equal(result.status,'ONE_FILE_STORED');
 assert.equal(result.checksumVerified,true);assert.equal(result.sourceReadbackVerified,true);
 assert.equal(result.candidatesInArchive,1);
 assert.equal(s.candidates.size,1);assert.equal(s.sources.size,1);
 assert.equal(s.cursorCalls,0);
 assert.equal(result.eventVerified,false);assert.equal(result.attackCount,null);
 assert.equal(result.coverageVerified,false);assert.equal(result.productionEligible,false);
 assert.deepEqual(api.calls,['https://data.gdeltproject.org/gdeltv2/lastupdate.txt',
  'https://data.gdeltproject.org/gdeltv2/'+T+'.export.CSV.zip']);
});
test('GDELT 403, stale source and malformed ZIP cannot store candidates',async()=>{
 for(const mode of ['403','stale','corrupt']){
  const s=state(),api=mode==='403'?fetcher({failIndex:'blocked'}):
   mode==='stale'?fetcher({index:manifest(zip,'20261001000000')}):
    fetcher({download:Buffer.from('corrupt')});
  const result=await collectOneGdeltFile({store:s,fetcher:api.call,now:NOW});
  assert.equal(result.status,'SOURCE_FAILED');
  assert.equal(s.sources.size,0);assert.equal(s.candidates.size,0);
  assert.equal(s.cursorCalls,0);
 }
});
