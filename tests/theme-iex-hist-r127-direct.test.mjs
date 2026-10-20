import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import {parseIexTopsPayload,parseIexHistDirectStream,parseIexHistDirectFile} from '../lib/market-score/theme-iex-hist-r127-direct.mjs';
const ns=t=>BigInt(Date.parse(t))*1000000n;
function msg(type,sym,id=1n,price=100,shares=5,stamp='2026-10-16T14:00:00Z'){
 const x=Buffer.alloc(38);x[0]=type==='T'?84:66;x.writeBigInt64LE(ns(stamp),2);x.write(sym.padEnd(8,' '),10,'ascii');
 x.writeUInt32LE(shares,18);x.writeBigInt64LE(BigInt(Math.round(price*1e4)),22);x.writeBigInt64LE(BigInt(id),30);return x;
}
function payload(...messages){const b=Buffer.alloc(40+messages.reduce((sum,m)=>sum+2+m.length,0));b[0]=1;b.writeUInt16LE(messages.length,14);let i=40;for(const m of messages){b.writeUInt16LE(m.length,i);i+=2;m.copy(b,i);i+=m.length;}return b;}
function pkt(data){const b=Buffer.alloc(14+20+8+data.length);b.writeUInt16BE(0x0800,12);b[14]=0x45;b.writeUInt16BE(20+8+data.length,16);b[23]=17;b.writeUInt16BE(8+data.length,38);data.copy(b,42);return b;}
function pcap(...pkts){const head=Buffer.alloc(24);Buffer.from('d4c3b2a1','hex').copy(head);head.writeUInt16LE(2,4);head.writeUInt16LE(4,6);head.writeUInt32LE(65535,16);head.writeUInt32LE(1,20);const all=[head];for(const x of pkts){const hdr=Buffer.alloc(16);hdr.writeUInt32LE(x.length,8);hdr.writeUInt32LE(x.length,12);all.push(hdr,x);}return Buffer.concat(all);}
function block(id,body){const pad=Buffer.alloc((4-body.length%4)%4),n=12+body.length+pad.length,h=Buffer.alloc(8),tail=Buffer.alloc(4);h.writeUInt32LE(id);h.writeUInt32LE(n,4);tail.writeUInt32LE(n);return Buffer.concat([h,body,pad,tail]);}
function pcapng(packet){const shb=Buffer.alloc(16);shb.writeUInt32LE(0x1a2b3c4d,0);shb.writeUInt16LE(1,4);shb.writeBigInt64LE(-1n,8);const idb=Buffer.alloc(8);idb.writeUInt16LE(1);idb.writeUInt32LE(65535,4);const epb=Buffer.alloc(20);epb.writeUInt32LE(packet.length,12);epb.writeUInt32LE(packet.length,16);return Buffer.concat([block(0x0a0d0d0a,shb),block(1,idb),block(6,Buffer.concat([epb,packet]))]);}
async function scan(buf){const chunks=[];for(let i=0;i<buf.length;i+=7)chunks.push(buf.subarray(i,i+7));return parseIexHistDirectStream(Readable.from(chunks),{date:'2026-10-16'});}
test('direct TOPS parse returns two target ETF trades and missing not zero',async()=>{
 const r=await scan(pcap(pkt(payload(msg('T','BOTZ',1n,100,3),msg('T','BOTZ',2n,102,4,'2026-10-16T19:45:00Z'),msg('T','ROBO',3n,80,2)))));
 assert.equal(r.bars.BOTZ.volume,7);assert.equal(r.bars.BOTZ.open,100);assert.equal(r.bars.BOTZ.close,102);assert.equal(r.bars.ROBO.volume,2);assert.equal(r.bars.HERO.volume,null);assert.equal(r.restrictions.productionCutoverAllowed,false);
});
test('pcapng fragmented blocks parse',async()=>{
 const r=await scan(pcapng(pkt(payload(msg('T','BOTZ',4n,25,10)))));
 assert.equal(r.summary.observedETFs,1);assert.equal(r.bars.BOTZ.close,25);
});
test('a same-day trade break cancels price and volume, without imputing values',async()=>{
 const r=await scan(pcap(pkt(payload(msg('T','BOTZ',10n,75,8),msg('T','BOTZ',11n,80,10),msg('B','BOTZ',11n,80,10)))));
 assert.equal(r.bars.BOTZ.close,75);assert.equal(r.bars.BOTZ.volume,8);assert.equal(r.summary.tradeBreaks,1);
});
test('conflicting repeated trade ID must stop',async()=>{
 await assert.rejects(scan(pcap(pkt(payload(msg('T','BOTZ',10n,75),msg('T','BOTZ',10n,76))))),/TRADE_ID_CONFLICT/);
});
test('the same repeated trade ID is counted once',async()=>{
 const m=msg('T','BOTZ',9n,12,4);const r=await scan(pcap(pkt(payload(m,m))));assert.equal(r.bars.BOTZ.volume,4);
});
test('regular trading hours filter skips early prints and other dates',async()=>{
 const r=await scan(pcap(pkt(payload(msg('T','BOTZ',1n,10,5,'2026-10-16T13:00:00Z'),msg('T','BOTZ',2n,10,5,'2026-10-19T14:00:00Z')))));
 assert.equal(r.bars.BOTZ.status,'MISSING_IEX_TRADE');
});
test('invalid or truncated PCAP stops without a partial result',async()=>{
 await assert.rejects(scan(Buffer.from('notpcap')),/UNKNOWN_CAPTURE_FORMAT/);
 await assert.rejects(scan(pcap(pkt(payload(msg('T','BOTZ')))).subarray(0,35)),/CAPTURE_TRUNCATED_OR_EMPTY/);
});
test('single local gzip file accepted read-only, oversize rejected',async(t)=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'iex-r127-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const file=path.join(dir,'20261016_IEXTP1_TOPS1.6.pcap.gz');fs.writeFileSync(file,zlib.gzipSync(pcap(pkt(payload(msg('T','BOTZ'))))));
 const r=await parseIexHistDirectFile(file,{date:'2026-10-16'});assert.equal(r.bars.BOTZ.volume,5);
 await assert.rejects(parseIexHistDirectFile(file,{date:'2026-10-16',maxBytes:10}),/FILE_UNSAFE_OR_OVERSIZE/);
 await assert.rejects(parseIexHistDirectFile(file,{date:'2026-10-19'}),/FILE_DATE_MISMATCH/);
});
test('unknown message type in same IEX segment does not fabricate trades',async()=>{
 const m=Buffer.alloc(38);m[0]=0x58;const r=await scan(pcap(pkt(payload(m))));assert.equal(r.summary.observedETFs,0);
});
test('message overrun is blocked',()=>{const p=Buffer.alloc(42);p[0]=1;p.writeUInt16LE(1,14);p.writeUInt16LE(38,40);assert.throws(()=>parseIexTopsPayload(p,()=>{}),/MESSAGE_TRUNCATED/);});
