import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeCorePce,periodData,parseBeaCalendar,releaseDDay} from '../lib/pce/data.mjs';
test('monthly normalization rejects invalid, duplicate and future actual dates',()=>{
 for(const rows of [[{date:'05',value:100}],[{date:'2026-10-01',value:100}],[{date:'2026-07-01',value:NaN}],[{date:'2026-07-01',value:100},{date:'2026-07-01',value:100}]])assert.throws(()=>normalizeCorePce(rows,rows,'2026-09-09'));
});
test('calendar periods retain full year keys without increasing period length',()=>{
 const rows=Array.from({length:15},(_,i)=>{const d=new Date(Date.UTC(2025,4+i,1));return {date:d.toISOString().slice(0,7),value:i,status:'actual'};});
 for(const n of [1,3,6,12]){const filtered=periodData(rows,n);assert.equal(filtered.length,n);assert.equal(filtered.at(-1).date,'2026-07');}
 assert.equal(periodData(rows,1)[0].date,'2026-07');
});
test('official ICS UTC dates convert to KST day boundaries without fixed ET offset',()=>{
 const ics='BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:Personal Income and Outlays\\, Example\nDTSTART:20261125T133000Z\nEND:VEVENT\nEND:VCALENDAR';
 const {next}=parseBeaCalendar(ics,'2026-11-24T16:00:00Z');assert.equal(next.utc,'2026-11-25T13:30:00Z');assert.equal(releaseDDay(next.utc,'2026-11-24T16:00:00Z'),'D-DAY');
});
