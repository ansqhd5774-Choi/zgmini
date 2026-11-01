import fs from "node:fs";
import {inflateRawSync} from "node:zlib";

function findEocd(fd,size){
  const tailSize=Math.min(size,65558);
  const tail=Buffer.alloc(tailSize);
  fs.readSync(fd,tail,0,tailSize,size-tailSize);
  for(let i=tailSize-22;i>=0;i--){
    if(tail.readUInt32LE(i)===0x06054b50)return {buffer:tail,offset:i,fileOffset:size-tailSize+i};
  }
  throw new Error("SEC_ZIP_EOCD_MISSING");
}
export function readZipIndex(file){
  const fd=fs.openSync(file,"r");
  try{
    const size=fs.fstatSync(fd).size;
    const eocd=findEocd(fd,size);
    const count=eocd.buffer.readUInt16LE(eocd.offset+10);
    const directorySize=eocd.buffer.readUInt32LE(eocd.offset+12);
    const directoryOffset=eocd.buffer.readUInt32LE(eocd.offset+16);
    if(!count||directoryOffset+directorySize>size)throw new Error("SEC_ZIP_DIRECTORY_INVALID");
    const directory=Buffer.alloc(directorySize);
    fs.readSync(fd,directory,0,directorySize,directoryOffset);
    const entries=new Map();
    let p=0;
    for(let i=0;i<count;i++){
      if(directory.readUInt32LE(p)!==0x02014b50)throw new Error("SEC_ZIP_CENTRAL_INVALID");
      const method=directory.readUInt16LE(p+10);
      const compressedSize=directory.readUInt32LE(p+20);
      const uncompressedSize=directory.readUInt32LE(p+24);
      const nameLen=directory.readUInt16LE(p+28);
      const extraLen=directory.readUInt16LE(p+30);
      const commentLen=directory.readUInt16LE(p+32);
      const localOffset=directory.readUInt32LE(p+42);
      const name=directory.subarray(p+46,p+46+nameLen).toString("utf8");
      entries.set(name.toLowerCase(),{name,method,compressedSize,uncompressedSize,localOffset});
      p+=46+nameLen+extraLen+commentLen;
    }
    return {file,size,entries};
  }finally{fs.closeSync(fd)}
}
export function findZipEntry(index,baseName){
  const wanted=String(baseName).toLowerCase();
  const direct=index.entries.get(wanted);
  if(direct)return direct;
  const matches=[...index.entries.values()].filter(item=>item.name.toLowerCase().split("/").at(-1)===wanted);
  if(matches.length!==1)throw new Error(matches.length?"SEC_ZIP_ENTRY_NOT_UNIQUE":"SEC_ZIP_ENTRY_MISSING");
  return matches[0];
}
export function readZipEntryBuffer(index,entry,{maxBytes=160_000_000}={}){
  if(entry.uncompressedSize>maxBytes)throw new Error("SEC_ZIP_ENTRY_TOO_LARGE");
  const fd=fs.openSync(index.file,"r");
  try{
    const local=Buffer.alloc(30);
    fs.readSync(fd,local,0,30,entry.localOffset);
    if(local.readUInt32LE(0)!==0x04034b50)throw new Error("SEC_ZIP_LOCAL_INVALID");
    const nameLen=local.readUInt16LE(26),extraLen=local.readUInt16LE(28);
    const start=entry.localOffset+30+nameLen+extraLen;
    const compressed=Buffer.alloc(entry.compressedSize);
    fs.readSync(fd,compressed,0,entry.compressedSize,start);
    let raw;
    if(entry.method===0)raw=compressed;
    else if(entry.method===8)raw=inflateRawSync(compressed);
    else throw new Error("SEC_ZIP_COMPRESSION_UNSUPPORTED");
    if(entry.uncompressedSize&&raw.length!==entry.uncompressedSize)throw new Error("SEC_ZIP_SIZE_MISMATCH");
    return raw;
  }finally{fs.closeSync(fd)}
}
export function readZipEntryText(index,baseName,options){
  return readZipEntryBuffer(index,findZipEntry(index,baseName),options).toString("utf8");
}
export function parseTsv(text){
  const lines=String(text??"").replace(/^\uFEFF/,"").split(/\r?\n/).filter(Boolean);
  if(!lines.length)return [];
  const headers=lines[0].split("\t").map(x=>x.trim());
  return lines.slice(1).map(line=>{
    const parts=line.split("\t");
    const row={};
    for(let i=0;i<headers.length;i++)row[headers[i]]=parts[i]??"";
    return row;
  });
}
