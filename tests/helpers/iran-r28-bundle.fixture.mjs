// R28 is an immutable historical PC package. Later collector revisions must
// verify that archive, not pretend the moving source tree is still R28.
import {mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {inflateRawSync} from 'node:zlib';

export function withHistoricalR28Package(root,callback){
 const zip=readFileSync(join(root,'IRAN_NEWS_R28_OFFLINE_PACKAGE.zip'));
 const dir=mkdtempSync(join(tmpdir(),'iran-r28-history-'));
 try{
  let at=0,count=0;
  while(zip.readUInt32LE(at)===0x04034b50){
   const flags=zip.readUInt16LE(at+6),method=zip.readUInt16LE(at+8);
   const size=zip.readUInt32LE(at+18),uncompressed=zip.readUInt32LE(at+22);
   const nameSize=zip.readUInt16LE(at+26),extraSize=zip.readUInt16LE(at+28);
   if(flags!==0||![0,8].includes(method))throw Error('R28_ARCHIVE_FORMAT_UNSUPPORTED');
   const name=zip.subarray(at+30,at+30+nameSize).toString('utf8');
   if(!/^[\w./-]+$/.test(name)||name.includes('..')||name.startsWith('/'))
    throw Error('R28_ARCHIVE_ENTRY_UNSAFE');
   const start=at+30+nameSize+extraSize,end=start+size;
   if(end>zip.length)throw Error('R28_ARCHIVE_ENTRY_TRUNCATED');
   const bytes=method===8?inflateRawSync(zip.subarray(start,end)):
    zip.subarray(start,end);
   if(bytes.length!==uncompressed)throw Error('R28_ARCHIVE_ENTRY_SIZE_DRIFT');
   const target=join(dir,name);
   mkdirSync(dirname(target),{recursive:true});
   writeFileSync(target,bytes,{flag:'wx'});
   at=end;count++;
  }
  if(count!==9)throw Error('R28_ARCHIVE_ENTRY_COUNT_DRIFT');
  return callback(dir);
 }finally{rmSync(dir,{recursive:true,force:true});}
}
