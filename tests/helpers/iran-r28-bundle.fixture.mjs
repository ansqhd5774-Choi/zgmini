// R28 is an immutable historical PC package. Later collector revisions must
// verify that archive, not pretend the moving source tree is still R28.
import {mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {inflateRawSync} from 'node:zlib';

function withHistoricalPackage(root,name,prefix,expectedCount,callback){
 const zip=readFileSync(join(root,name));
 const dir=mkdtempSync(join(tmpdir(),prefix));
 try{
  let at=0,count=0;
  while(zip.readUInt32LE(at)===0x04034b50){
   const flags=zip.readUInt16LE(at+6),method=zip.readUInt16LE(at+8);
   const size=zip.readUInt32LE(at+18),uncompressed=zip.readUInt32LE(at+22);
   const nameSize=zip.readUInt16LE(at+26),extraSize=zip.readUInt16LE(at+28);
   if(flags!==0||![0,8].includes(method))throw Error('HISTORICAL_ARCHIVE_FORMAT_UNSUPPORTED');
   const name=zip.subarray(at+30,at+30+nameSize).toString('utf8');
   if(!/^[\w./-]+$/.test(name)||name.includes('..')||name.startsWith('/'))
    throw Error('HISTORICAL_ARCHIVE_ENTRY_UNSAFE');
   const start=at+30+nameSize+extraSize,end=start+size;
   if(end>zip.length)throw Error('HISTORICAL_ARCHIVE_ENTRY_TRUNCATED');
   const bytes=method===8?inflateRawSync(zip.subarray(start,end)):
    zip.subarray(start,end);
   if(bytes.length!==uncompressed)throw Error('HISTORICAL_ARCHIVE_ENTRY_SIZE_DRIFT');
   const target=join(dir,name);
   mkdirSync(dirname(target),{recursive:true});
   writeFileSync(target,bytes,{flag:'wx'});
   at=end;count++;
  }
  if(count!==expectedCount)throw Error('HISTORICAL_ARCHIVE_ENTRY_COUNT_DRIFT');
  return callback(dir);
 }finally{rmSync(dir,{recursive:true,force:true});}
}

export function withHistoricalR28Package(root,callback){
 return withHistoricalPackage(root,'IRAN_NEWS_R28_OFFLINE_PACKAGE.zip',
  'iran-r28-history-',9,callback);
}

export function withHistoricalR32Package(root,callback){
 return withHistoricalPackage(root,'IRAN_NEWS_R32_HISTORICAL_RETRY_PACKAGE.zip',
  'iran-r32-history-',6,callback);
}
