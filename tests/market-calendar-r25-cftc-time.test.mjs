import test from 'node:test';
import assert from 'node:assert/strict';
import {cftcCotReleaseAt} from '../lib/market-calendar-cftc-time.mjs';

test('R25 CFTC published New York 15:30 maps to correct UTC across 2026 DST',()=>{
 assert.equal(cftcCotReleaseAt('2026-03-06'),'2026-03-06T20:30:00.000Z');
 assert.equal(cftcCotReleaseAt('2026-03-13'),'2026-03-13T19:30:00.000Z');
 assert.equal(cftcCotReleaseAt('2026-10-30'),'2026-10-30T19:30:00.000Z');
 assert.equal(cftcCotReleaseAt('2026-11-06'),'2026-11-06T20:30:00.000Z');
});

test('R25 CFTC UTC clock maps to the next KST calendar day',()=>{
 const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 for(const [official,clock] of [['2026-10-30','10/31/2026, 04:30'],['2026-11-06','11/07/2026, 05:30']]){
  const at=cftcCotReleaseAt(official);
  const parts=Object.fromEntries(fmt.formatToParts(new Date(at)).map(p=>[p.type,p.value]));
  const observed=`${parts.month}/${parts.day}/${parts.year}, ${parts.hour}:${parts.minute}`;
  assert.equal(observed,clock);
 }
});

test('R25 rejects invalid dates rather than inferring CFTC releases',()=>{
 for(const value of ['2026-02-30','2026-13-01','2026-00-14','2026-10-30T00:00Z',null,'soon'])
  assert.equal(cftcCotReleaseAt(value),null);
});
