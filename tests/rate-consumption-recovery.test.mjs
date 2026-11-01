import test from 'node:test';
import assert from 'node:assert/strict';
import {rateSentimentCalendarLag} from '../lib/market-score/rate-sentiment-freshness.mjs';
import {storedRateSentimentResponse} from '../worker/rate-sentiment-public.mjs';
import {parseAlfredCurrent} from '../worker/consumption-r3-provider-collector.mjs';
test('calendar week includes weekends and rejects invalid/future observations',()=>{
 assert.equal(rateSentimentCalendarLag('2026-10-02','2026-10-09'),7);
 assert.equal(rateSentimentCalendarLag('2026-10-10','2026-10-09'),null);
 assert.equal(rateSentimentCalendarLag('2026-02-30','2026-10-09'),null);
});
test('API accepts day 7 and rejects day 8 without fabricating data',async()=>{
 const body={status:'READY',version:'RATE_SENTIMENT_R1_RESEARCH',score:55.2,observationDate:'2026-10-02',week:Array.from({length:5},()=>({label:'2026-10-02',value:55.2}))};
 for(const [date,status] of [['2026-10-09',200],['2026-10-10',503]]){
  const now=Date.parse(date+'T12:00:00Z');
  const db={prepare:()=>({bind(){return this},first:async()=>({body:JSON.stringify(body),stored_at:now-1000})})};
  assert.equal((await storedRateSentimentResponse(new Request('https://example.test'),{db,now})).status,status);
 }
});
function zip(files){
 const locals=[],central=[];let offset=0;
 for(const [name,text] of files){
  const n=Buffer.from(name),b=Buffer.from(text),h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50);h.writeUInt32LE(b.length,18);h.writeUInt32LE(b.length,22);h.writeUInt16LE(n.length,26);
  locals.push(h,n,b);const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt32LE(b.length,20);c.writeUInt32LE(b.length,24);c.writeUInt16LE(n.length,28);c.writeUInt32LE(offset,42);central.push(c,n);offset+=h.length+n.length+b.length;
 }
 const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...locals,directory,end]);
}
test('ALFRED split-frequency ZIP selects exact requested vintage; ordinary CSV still works',async()=>{
 const csv='observation_date,HNOCEAQ027S_20260930\n2026-06-30,123\n';
 const bytes=zip([['quarterly.csv','observation_date,HNOCEAQ027S_20251231\n2025-09-30,99'],['quarterly_end.csv',csv]]);
 const out=await parseAlfredCurrent(bytes,'HNOCEAQ027S','2026-09-30');assert.equal(out.rows[0].value,123);assert.equal(out.vintageDate,'2026-09-30');
 assert.deepEqual(await parseAlfredCurrent(Buffer.from(csv),'HNOCEAQ027S','2026-09-30'),out);
 await assert.rejects(parseAlfredCurrent(bytes,'HNOCEAQ027S','2026-06-30'),/CURRENT_COLUMN_MISSING/);
});
