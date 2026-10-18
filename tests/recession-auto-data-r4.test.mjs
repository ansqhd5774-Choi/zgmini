import test from 'node:test';
import assert from 'node:assert/strict';
import {parseReleaseCalendar,recessionReleaseInfo} from '../lib/release-calendar.mjs';
import {buildRecessionSupplementalSources,enrichRecessionSupplementals} from '../worker/projection-builders/recession-supplemental-history.mjs';
test('official ICS unfolding, cancelled events and next event use source dates',()=>{
 const text='BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART:20261029T123000Z\r\nSUMMARY:Personal Income and \r\n Outlays\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nDTSTART:20261020T123000Z\r\nSUMMARY:Personal Income and Outlays\r\nSTATUS:CANCELLED\r\nEND:VEVENT\r\nEND:VCALENDAR';
 const events=parseReleaseCalendar(text,'bea');assert.equal(events.length,1);
 const now=Date.parse('2026-10-19T12:00:00Z'),calendar={events,sources:{bea:{status:'READY',checkedAt:new Date(now).toISOString()}}};
 assert.equal(recessionReleaseInfo('realPce',calendar,'2026-10-19',now).next,'2026-10-29');
 assert.equal(recessionReleaseInfo('realPce',calendar,'2026-10-19',now+49*3600000).basis,'unverified');
 assert.equal(recessionReleaseInfo('realPce',calendar,'2026-10-19',now-1).basis,'unverified');
 calendar.sources.bea.status='SOURCE_FAILED';assert.equal(recessionReleaseInfo('realPce',calendar,'2026-10-19',now).text,'일정 조회 오류');
 assert.throws(()=>parseReleaseCalendar('<html>Error</html>','bea'));
});
test('official HTML calendar dates parse without annual revision or manual dates',()=>{
 const fed=parseReleaseCalendar('<p><strong>2026:</strong>October 16, November 17, November 24 (Annual Revision), December 16</p>','fed');
 assert.deepEqual(fed.map(p=>p.date),['2026-10-16','2026-11-17','2026-12-16']);
 const census=parseReleaseCalendar('<tr><td>Advance Monthly Sales for Retail and Food Services</td><td>November 17, 2026</td></tr>','census');
 assert.equal(census[0].date,'2026-11-17');
 assert.equal(recessionReleaseInfo('hyCreditStress',null,'2026-10-19').cadence,'월간');
});
test('stored histories require raw source parity and preserve zero and missing values',()=>{
 const dates=['2026-08-01','2026-09-01','2026-10-01'];
 const series={DGS10:dates.map((observationDate,i)=>({observationDate,value:4+i})),DGS3MO:dates.map(observationDate=>({observationDate,value:4})),NFCICREDIT:dates.map((observationDate,i)=>({observationDate,value:-i}))};
 const sources=buildRecessionSupplementalSources(series,{cmdiRows:dates.map((observationDate,i)=>({observationDate,hy:i,hyCmdi:99}))},[]);
 const rows=[{id:'yieldCurve',observationDate:dates[2],value:2,score:37},{id:'hyCreditStress',observationDate:dates[2],value:2,score:98},{id:'creditConditions',observationDate:dates[2],value:-2,score:40},{id:'initialClaims',observationDate:dates[2],value:1}];
 const out=enrichRecessionSupplementals(rows,sources,dates[2]);
 assert.equal(out[0].previousValue,1);assert.equal(out[0].trend[0].value,0);assert.equal(out[0].score,37);
 assert.equal(out[1].previousValue,1);assert.equal(out[2].previousValue,-1);assert.equal(out[3].historyStatus,'NOT_CONNECTED');
 assert.equal(enrichRecessionSupplementals([{...rows[0],value:99}],sources,dates[2])[0].historyStatus,'SOURCE_MISMATCH');
 const normalized=buildRecessionSupplementalSources({}, {cmdiRows:[{observationDate:dates[2],hyCmdi:2}]});
 assert.equal(enrichRecessionSupplementals([rows[1]],normalized,dates[2])[0].trend.length,0);
});
