// Original GDELT 2.0 Event archives: bounded, verified research ingestion only.
// No provider request, scoring, source activation, or combat-event verification.
import {inflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';

const MAX_ZIP=16*1024*1024, MAX_CSV=96*1024*1024, MAX_ROWS=1000000;
const I=Object.freeze({EVENT_ID:0,EVENT_DAY:1,ACTOR1_NAME:6,ACTOR1_COUNTRY:7,
 ACTOR2_NAME:16,ACTOR2_COUNTRY:17,EVENT_CODE:26,EVENT_ROOT:28,QUAD:29,
 ACTION_GEO_COUNTRY:51,DATE_ADDED:59,SOURCE_URL:60});
const relation=new Set(['IRN','ISR','USA']);
const country=new Set(['IR','IS','US']);
const allowedRoots=new Set(['17','18','19','20']);
const falseFacts=()=>({attackCount:null,coverageVerified:false,eventVerified:false,productionEligible:false});
function timestamp(input){
 if(!/^\d{14}$/.test(input))throw Error('GDELT_EVENT_TIME_INVALID');
 const iso=input.slice(0,4)+'-'+input.slice(4,6)+'-'+input.slice(6,8)+'T'+input.slice(8,10)+':'+input.slice(10,12)+':'+input.slice(12,14)+'.000Z';
 const n=Date.parse(iso);
 if(!Number.isSafeInteger(n)||new Date(n).toISOString()!==iso)throw Error('GDELT_EVENT_TIME_INVALID');
 return n;
}
function eventDay(value){
 if(!/^\d{8}$/.test(value))throw Error('GDELT_EVENT_DAY_INVALID');
 const day=value.slice(0,4)+'-'+value.slice(4,6)+'-'+value.slice(6,8);
 const n=timestamp(value+'000000');
 return {day,utc:n};
}
const table=Array.from({length:256},(_,i)=>{
 let c=i;for(let j=0;j<8;j++)c=(c&1)?0xEDB88320^(c>>>1):c>>>1;
 return c>>>0;
});
function crc32(bytes){
 let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);
 return (c^0xffffffff)>>>0;
}
function loadZip(bytes, expectedTimestamp){
 if(!(bytes instanceof Uint8Array)||bytes.length<100||bytes.length>MAX_ZIP)throw Error('GDELT_ZIP_LENGTH_INVALID');
 const b=Buffer.from(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const sig=(i)=>b.readUInt32LE(i),len=b.length;
 let end=-1;
 for(let i=len-22;i>=Math.max(0,len-65557);i--){
  if(sig(i)===0x06054b50&&i+22+b.readUInt16LE(i+20)===len){end=i;break;}
 }
 if(end<0||b.readUInt16LE(end+4)!==0||b.readUInt16LE(end+6)!==0
   ||b.readUInt16LE(end+8)!==1||b.readUInt16LE(end+10)!==1)throw Error('GDELT_ZIP_CENTRAL_DIRECTORY_INVALID');
 const centralLength=b.readUInt32LE(end+12),offset=b.readUInt32LE(end+16);
 if(offset+centralLength!==end||offset+46>len||sig(offset)!==0x02014b50)throw Error('GDELT_ZIP_CENTRAL_DIRECTORY_INVALID');
 const flags=b.readUInt16LE(offset+8),method=b.readUInt16LE(offset+10),crc=b.readUInt32LE(offset+16);
 const compressed=b.readUInt32LE(offset+20),uncompressed=b.readUInt32LE(offset+24);
 const nameSize=b.readUInt16LE(offset+28),extra=b.readUInt16LE(offset+30),comment=b.readUInt16LE(offset+32);
 const localOffset=b.readUInt32LE(offset+42);
 if((flags&1)!==0||![0,8].includes(method)||compressed>MAX_ZIP||uncompressed>MAX_CSV
   ||compressed===0||localOffset+30>offset||offset+46+nameSize+extra+comment!==end
   ||sig(localOffset)!==0x04034b50)throw Error('GDELT_ZIP_ENTRY_INVALID');
 const name=b.subarray(offset+46,offset+46+nameSize).toString('utf8');
 if(name!==expectedTimestamp+'.export.CSV'||nameSize!==b.readUInt16LE(localOffset+26)
   ||b.subarray(localOffset+30,localOffset+30+nameSize).toString('utf8')!==name
   ||b.readUInt16LE(localOffset+8)!==method)throw Error('GDELT_ZIP_FILENAME_INVALID');
 const start=localOffset+30+b.readUInt16LE(localOffset+26)+b.readUInt16LE(localOffset+28);
 if(start+compressed>offset)throw Error('GDELT_ZIP_ENTRY_INVALID');
 let plain;
 try{plain=method===0?b.subarray(start,start+compressed):inflateRawSync(b.subarray(start,start+compressed),{maxOutputLength:MAX_CSV});}
 catch{throw Error('GDELT_ZIP_DECOMPRESSION_FAILED');}
 if(plain.length!==uncompressed||crc32(plain)!==crc)throw Error('GDELT_ZIP_INTEGRITY_FAILED');
 return plain;
}
export function parseGdeltEventsCsv(text,{maxCandidates=5000}={}){
 if(typeof text!=='string'||Buffer.byteLength(text)>MAX_CSV||!Number.isSafeInteger(maxCandidates)||maxCandidates<1||maxCandidates>10000)throw Error('GDELT_CSV_INPUT_INVALID');
 const rows=text.trimEnd().split('\n');
 if(rows.length>MAX_ROWS)throw Error('GDELT_EVENT_ROW_LIMIT');
 const found=new Map();let rowsRead=0,relatedRows=0;
 for(const line of rows){
  if(!line)continue;rowsRead++;
  const f=line.replace(/\r$/,'').split('\t');
  if(f.length!==61)throw Error('GDELT_EVENT_COLUMN_MISMATCH');
  const id=f[I.EVENT_ID];
  if(!/^\d{1,20}$/.test(id))throw Error('GDELT_EVENT_ID_INVALID');
  const day=eventDay(f[I.EVENT_DAY]).day,firstSeenAt=timestamp(f[I.DATE_ADDED]);
  let url;try{url=new URL(f[I.SOURCE_URL]);}catch{throw Error('GDELT_EVENT_SOURCEURL_INVALID');}
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error('GDELT_EVENT_SOURCEURL_INVALID');
  const root=f[I.EVENT_ROOT];
  const related=[f[I.ACTOR1_COUNTRY],f[I.ACTOR2_COUNTRY]].some(x=>relation.has(x))
    ||country.has(f[I.ACTION_GEO_COUNTRY])
    ||[f[I.ACTOR1_NAME],f[I.ACTOR2_NAME]].some(x=>/\bIRAN\b|\bISRAEL\b|\bUNITED STATES\b/i.test(x));
  if(!related||!allowedRoots.has(root))continue;
  relatedRows++;if(!found.has(id)){
   if(found.size>=maxCandidates)throw Error('GDELT_CANDIDATE_LIMIT');
   found.set(id,{id:'GDELT:'+id,source:'GDELT_2_EVENTS',sourceUrl:url.href,sourceDomain:url.hostname,
    firstSeenAt,eventDateHint:day,eventAt:null,actor1:f[I.ACTOR1_NAME].slice(0,180),
    actor2:f[I.ACTOR2_NAME].slice(0,180),eventCode:f[I.EVENT_CODE],
    eventRoot:root,quadClass:f[I.QUAD],actionCountry:f[I.ACTION_GEO_COUNTRY],
    status:'DISCOVERED',occurrenceVerified:false,actorVerified:false,
    connectionVerified:false,duplicateChecked:false,sourceIndependentVerified:false});
  }
 }
 return {status:'CANDIDATES_ONLY',rowsRead,relatedRows,candidates:[...found.values()],...falseFacts()};
}
export function parseVerifiedGdeltExport(zip,{archive,expectedBytes,reportedMd5,maxCandidates=5000}={}){
 if(!archive||archive.type!=='export.CSV.zip'||typeof archive.url!=='string')throw Error('GDELT_EXPORT_CONTRACT_INVALID');
 const match=archive.url.match(/^https?:\/\/data\.gdeltproject\.org\/gdeltv2\/(\d{14})\.export\.CSV\.zip$/);
 if(!match||!Number.isSafeInteger(expectedBytes)||expectedBytes<100||expectedBytes>MAX_ZIP
   ||zip.length!==expectedBytes||typeof reportedMd5!=='string'||!/^[a-f0-9]{31,32}$/.test(reportedMd5))
  throw Error('GDELT_EXPORT_SOURCE_INVALID');
 const digest=createHash('md5').update(zip).digest('hex');
 // GDELT legacy manifests have sometimes omitted a leading zero.
 if(digest!==reportedMd5.padStart(32,'0'))throw Error('GDELT_EXPORT_CHECKSUM_MISMATCH');
 const plain=loadZip(zip,match[1]),parsed=parseGdeltEventsCsv(plain.toString('utf8'),{maxCandidates});
 return {...parsed,archiveTime:timestamp(match[1]),archiveBytes:zip.length,
  checksumVerified:true,source:'ORIGINAL_GDELT_2_EVENTS',...falseFacts()};
}
