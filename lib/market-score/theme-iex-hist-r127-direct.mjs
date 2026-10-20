import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {THEME_IEX_R127_ETFS,THEME_IEX_R127_ATTRIBUTION,THEME_IEX_R127_TERMS} from './theme-iex-hist-r127-contract.mjs';

// Manual PC research reader for direct IEX HIST TOPS1.6 (not Alpaca or IEX via vendors).
// Works on a local file; NEVER downloads, publishes, schedules, or writes to storage.
const CAP=4*1024*1024, EVENT_LIMIT=1_000_000;
const fail=code=>{throw Error('R127_'+code);};
const marketClock=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
function inRegularSession(timestamp,day){
 const dt=new Date(Number(timestamp/1000000n));if(!Number.isFinite(dt.getTime()))fail('BAD_TIMESTAMP');
 const p=Object.fromEntries(marketClock.formatToParts(dt).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 return p.year+'-'+p.month+'-'+p.day===day && Number(p.hour)*60+Number(p.minute)>=570 && Number(p.hour)*60+Number(p.minute)<960;
}
function udpPayload(pkt,link){
 let off=0;
 if(link===1){
  if(pkt.length<14)return null;
  let type=pkt.readUInt16BE(12);off=14;
  while(type===0x8100||type===0x88a8){if(pkt.length<off+4)return null;type=pkt.readUInt16BE(off+2);off+=4;}
  if(type!==0x0800)return null;
 }else if(![12,14,101].includes(link))return null;
 if(pkt.length<off+20||pkt[off]>>4!==4)return null;
 const ihl=(pkt[off]&15)*4;
 if(ihl<20||pkt.length<off+ihl+8||pkt[off+9]!==17)return null;
 if((pkt.readUInt16BE(off+6)&0x3fff)!==0)return null;
 const length=pkt.readUInt16BE(off+2),udp=off+ihl;
 if(length<ihl+8||pkt.length<off+length)return null;
 const udpLength=pkt.readUInt16BE(udp+4);
 if(udpLength<8||udp+udpLength>off+length)return null;
 return pkt.subarray(udp+8,udp+udpLength);
}
export function parseIexTopsPayload(buf,handle){
 if(buf.length<40||buf[0]!==1)return false;
 const count=buf.readUInt16LE(14);let p=40;
 for(let i=0;i<count;i++){
  if(p+2>buf.length)fail('MESSAGE_HEADER_TRUNCATED');
  const size=buf.readUInt16LE(p);p+=2;
  if(p+size>buf.length)fail('MESSAGE_TRUNCATED');
  const b=buf.subarray(p,p+size);p+=size;
  if(size>=38&&(b[0]===84||b[0]===66)){
   handle({kind:b[0]===84?'TRADE':'BREAK',symbol:b.toString('ascii',10,18).replace(/[\x00 ]+$/g,''),
    stamp:b.readBigInt64LE(2),shares:b.readUInt32LE(18),priceFixed:b.readBigInt64LE(22),id:b.readBigInt64LE(30)});
  }
 }
 return true;
}
class Capture{
 constructor(onPacket){this.data=Buffer.alloc(0);this.mode=null;this.endian=null;this.links=[];this.packetCount=0;this.onPacket=onPacket;}
 u32(b,p){return this.endian==='LE'?b.readUInt32LE(p):b.readUInt32BE(p);}
 u16(b,p){return this.endian==='LE'?b.readUInt16LE(p):b.readUInt16BE(p);}
 push(chunk){
  this.data=this.data.length?Buffer.concat([this.data,chunk]):chunk;
  while(true){
   if(!this.mode){if(this.data.length<4)break;const m=this.data.subarray(0,4).toString('hex');
    if(m==='0a0d0d0a')this.mode='pcapng';
    else if(['d4c3b2a1','4d3cb2a1','a1b2c3d4','a1b23c4d'].includes(m)){this.mode='pcap';this.endian=m.startsWith('d4')||m.startsWith('4d')?'LE':'BE';}
    else fail('UNKNOWN_CAPTURE_FORMAT');
   }
   if(this.mode==='pcap'){
    if(!this.links.length){if(this.data.length<24)break;this.links=[this.u32(this.data,20)];this.data=this.data.subarray(24);continue;}
    if(this.data.length<16)break;
    const cap=this.u32(this.data,8),original=this.u32(this.data,12);
    if(cap>CAP||original<cap)fail('PCAP_PACKET_SIZE');
    if(this.data.length<16+cap)break;
    this.onPacket(this.data.subarray(16,16+cap),this.links[0]);this.packetCount++;this.data=this.data.subarray(16+cap);continue;
   }
   if(this.data.length<12)break;
   if(this.endian===null){const bom=this.data.subarray(8,12).toString('hex');this.endian=bom==='4d3c2b1a'?'LE':bom==='1a2b3c4d'?'BE':null;if(!this.endian)fail('PCAPNG_ENDIAN');}
   const kind=this.u32(this.data,0),len=this.u32(this.data,4);
   if(len<12||len>CAP||len%4)fail('PCAPNG_BLOCK_SIZE');
   if(this.data.length<len)break;
   const b=this.data.subarray(0,len);
   if(this.u32(b,len-4)!==len)fail('PCAPNG_BLOCK_TRAILER');
   if(kind===0x0a0d0d0a)this.links=[];
   else if(kind===1){if(len<20)fail('PCAPNG_IDB');this.links.push(this.u16(b,8));}
   else if(kind===6){if(len<32)fail('PCAPNG_EPB');const index=this.u32(b,8),cap=this.u32(b,20);
    if(cap>CAP||28+cap>len-4||this.links[index]===undefined)fail('PCAPNG_FRAME_SIZE');
    this.onPacket(b.subarray(28,28+cap),this.links[index]);this.packetCount++;
   }
   this.data=this.data.subarray(len);
  }
  if(this.data.length>CAP+32)fail('UNBOUNDED_BUFFER');
 }
 finish(){if(!this.mode||!this.packetCount||this.data.length)fail('CAPTURE_TRUNCATED_OR_EMPTY');}
}
export async function parseIexHistDirectStream(input,{date}={}){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date??'')))fail('DATE_REQUIRED');
 const ids=new Set(THEME_IEX_R127_ETFS),records=new Map(THEME_IEX_R127_ETFS.map(t=>[t,new Map()]));
 let messages=0,breaks=0,ignored=0,unmatched=0,accepted=0;
 const capture=new Capture((packet,link)=>{
  const udp=udpPayload(packet,link);if(!udp){ignored++;return;}
  parseIexTopsPayload(udp,x=>{
   if(!ids.has(x.symbol))return;
   if(++messages>EVENT_LIMIT)fail('EVENT_LIMIT_REACHED');
   if(x.shares<=0||x.priceFixed<=0n||!inRegularSession(x.stamp,date))return;
   const m=records.get(x.symbol),id=x.id.toString();
   if(x.kind==='TRADE'){
    const prior=m.get(id);
    if(prior){if(prior.stamp!==x.stamp||prior.shares!==x.shares||prior.priceFixed!==x.priceFixed)fail('TRADE_ID_CONFLICT');return;}
    m.set(id,x);accepted++;
   }else if(m.has(id)){m.delete(id);breaks++;}else unmatched++;
  });
 });
 for await(const chunk of input)capture.push(chunk);
 capture.finish();
 const bars={};let found=0;
 for(const symbol of THEME_IEX_R127_ETFS){
  const arr=[...records.get(symbol).values()].sort((a,b)=>a.stamp<b.stamp?-1:a.stamp>b.stamp?1:0);
  if(!arr.length){bars[symbol]={status:'MISSING_IEX_TRADE',volume:null,close:null,trades:0};continue;}
  found++;let vol=0,turnover=0,hi=0,lo=Infinity;
  for(const t of arr){const price=Number(t.priceFixed)/10000;vol+=t.shares;turnover+=price*t.shares;hi=Math.max(hi,price);lo=Math.min(lo,price);}
  if(!Number.isSafeInteger(vol)||!Number.isFinite(turnover))fail('AGGREGATE_OVERFLOW');
  bars[symbol]={status:'OBSERVED_IEX_ONLY',trades:arr.length,volume:vol,open:Number(arr[0].priceFixed)/10000,high:hi,low:lo,close:Number(arr.at(-1).priceFixed)/10000,turnoverObserved:turnover};
 }
 return {status:'RESEARCH_ONLY_NOT_CONSOLIDATED_OHLCV',provider:'IEX_HIST_DIRECT',feed:'TOPS1.6',
  venue:'IEX_EXCHANGE_ONLY',adjustment:'none',date,sourceAttribution:THEME_IEX_R127_ATTRIBUTION,
  termsUrl:THEME_IEX_R127_TERMS,
  summary:{capturePackets:capture.packetCount,selectedMessages:messages,ignoredPackets:ignored,
   acceptedTrades:accepted,tradeBreaks:breaks,unmatchedTradeBreaks:unmatched,observedETFs:found,missingETFs:17-found},
  bars,restrictions:{notOfficialClosingPrice:true,notConsolidatedVolume:true,notSplitAdjusted:true,
   reference756Verified:false,publicScoresAllowed:false,productionCutoverAllowed:false}};
}
export async function parseIexHistDirectFile(file,{date,maxBytes=512*1024*1024}={}){
 if(!path.isAbsolute(file))fail('ABSOLUTE_FILE_REQUIRED');
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size===0||stat.size>maxBytes)fail('FILE_UNSAFE_OR_OVERSIZE');
 const base=path.basename(file);
 if(!/^\d{8}_IEXTP1_TOPS1\.6\.pcap(?:ng)?(?:\.gz)?$/.test(base))fail('TOPS16_FILE_NAME');
 if(base.slice(0,8)!==String(date).replaceAll('-',''))fail('FILE_DATE_MISMATCH');
 const reader=fs.createReadStream(file,{highWaterMark:128*1024});
 const stream=base.endsWith('.gz')?reader.pipe(zlib.createGunzip()):reader;
 try{return await parseIexHistDirectStream(stream,{date});}
 finally{reader.destroy();if(stream!==reader)stream.destroy();}
}
