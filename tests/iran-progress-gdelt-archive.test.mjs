import test from 'node:test';
import assert from 'node:assert/strict';
import {deflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {parseGdeltEventsCsv,parseVerifiedGdeltExport} from '../scripts/iran-progress/gdelt-events-archive.mjs';

const stamp='20261008153000';
function row({id='123',day='20261008',actor1='IRN',actor2='ISR',root='19',url='https://example.org/story',added=stamp}={}){
 const f=Array(61).fill('');
 Object.assign(f,{0:id,1:day,6:'IRAN',7:actor1,16:'ISRAEL',17:actor2,26:'190',28:root,29:'4',51:'IR',59:added,60:url});
 return f.join('\t');
}
function crc32(b){
 let v=0xffffffff;
 for(const x of b){v^=x;for(let j=0;j<8;j++)v=v&1?(v>>>1)^0xedb88320:v>>>1;}
 return (v^0xffffffff)>>>0;
}
function zipEvent(text,{name=stamp+'.export.CSV',method=8,extraEntry=false}={}){
 const data=Buffer.from(text,'utf8'),packed=method===8?deflateRawSync(data):data,filename=Buffer.from(name),crc=crc32(data);
 const local=Buffer.alloc(30),central=Buffer.alloc(46),end=Buffer.alloc(22);
 local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(method,8);
 local.writeUInt32LE(crc,14);local.writeUInt32LE(packed.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(filename.length,26);
 const localPart=Buffer.concat([local,filename,packed]);
 central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(method,10);
 central.writeUInt32LE(crc,16);central.writeUInt32LE(packed.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(filename.length,28);
 const centralPart=Buffer.concat([central,filename]);
 end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(extraEntry?2:1,8);end.writeUInt16LE(extraEntry?2:1,10);
 end.writeUInt32LE(centralPart.length,12);end.writeUInt32LE(localPart.length,16);
 return Buffer.concat([localPart,centralPart,end]);
}
function descriptor(bytes,md5=createHash('md5').update(bytes).digest('hex')){
 return {archive:{type:'export.CSV.zip',url:'https://data.gdeltproject.org/gdeltv2/'+stamp+'.export.CSV.zip'},
 expectedBytes:bytes.length,reportedMd5:md5};
}
test('verified GDELT ZIP produces candidate-only and never verified attacks',()=>{
 const zip=zipEvent([row(),row(),row({id:'124',root:'03'})].join('\n'));
 const r=parseVerifiedGdeltExport(zip,descriptor(zip));
 assert.equal(r.status,'CANDIDATES_ONLY');assert.equal(r.checksumVerified,true);
 assert.equal(r.rowsRead,3);assert.equal(r.relatedRows,2);assert.equal(r.candidates.length,1);
 assert.equal(r.candidates[0].eventDateHint,'2026-10-08');
 assert.equal(r.candidates[0].firstSeenAt,Date.parse('2026-10-08T15:30:00Z'));
 assert.equal(r.candidates[0].eventAt,null);assert.equal(r.candidates[0].occurrenceVerified,false);
 assert.equal(r.attackCount,null);assert.equal(r.coverageVerified,false);assert.equal(r.productionEligible,false);
});
test('archive rejects wrong checksum and unintended archive file path',()=>{
 const zip=zipEvent(row());
 assert.throws(()=>parseVerifiedGdeltExport(zip,descriptor(zip,'0'.repeat(32))),/CHECKSUM/);
 const traversal=zipEvent(row(),{name:'../evil.export.CSV'});
 assert.throws(()=>parseVerifiedGdeltExport(traversal,descriptor(traversal)),/FILENAME/);
 assert.throws(()=>parseVerifiedGdeltExport(zipEvent(row(),{extraEntry:true}),descriptor(zipEvent(row(),{extraEntry:true}))),/CENTRAL_DIRECTORY/);
});
test('archive rejects broken zip even when its actual MD5 matches',()=>{
 const zip=zipEvent(row());
 const corrupt=Buffer.from(zip);corrupt[corrupt.length-26]^=1;
 assert.throws(()=>parseVerifiedGdeltExport(corrupt,descriptor(corrupt)),/ZIP_/);
});
test('rows must contain all 61 fields and a valid event date',()=>{
 assert.throws(()=>parseGdeltEventsCsv('x\ty'),/COLUMN/);
 assert.throws(()=>parseGdeltEventsCsv(row({day:'20260230'})),/DAY/);
 assert.throws(()=>parseGdeltEventsCsv(row({url:'file:///etc/passwd'})),/SOURCEURL/);
});
test('filter unrelated candidates without inventing 28-day source coverage',()=>{
 const unrelated=row({actor1:'FRA',actor2:'CAN'}).split('\t');
 unrelated[6]='FRANCE';unrelated[16]='CANADA';unrelated[51]='FR';
 const out=parseGdeltEventsCsv(unrelated.join('\t'));
 assert.equal(out.candidates.length,0);assert.equal(out.attackCount,null);assert.equal(out.coverageVerified,false);
});
