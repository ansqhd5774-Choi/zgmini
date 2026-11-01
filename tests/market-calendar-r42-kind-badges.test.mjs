import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {earningsDisplaySnapshot,earningsDisplayHtml} from '../lib/earnings-api-display.mjs';
const day='2026-10-29';
const coveredDays=Array.from({length:14},(_,i)=>new Date(Date.parse(day+'T00:00:00Z')+i*86400000).toISOString().slice(0,10));
const event={ticker:'AMZN',company:'Amazon.com, Inc.',date:day,marketSession:'after_market',time:null,priority:true,verification:'VENDOR_UNVERIFIED',source:'earnings-api'};
const data={status:'READY_PRIVATE',scope:'PC_PRIVATE',publicDisplay:false,redistribution:false,publicationStatus:'HELD_UNCONFIRMED',checkedAt:'2026-10-29T02:00:00Z',coveredDays,recordCount:1,priorityCount:1,events:[event]};
test('R42 adds 실적 badge at render without mutating stored HTML',()=>{
 const snap=earningsDisplaySnapshot(data),before=snap.byDay[day][0];
 assert.doesNotMatch(before,/mc-kind/);
 const out=earningsDisplayHtml(snap,{start:day,end:day});
 assert.equal(out.count,1);
 assert.match(out.html,/<span class=mc-country>미국<\/span><span class="mc-kind mc-kind-earnings">실적<\/span><div class=mc-event>/);
 assert.equal(snap.byDay[day][0],before);
});
test('R42 earnings count and importance filter unchanged',()=>{
 const s=earningsDisplaySnapshot(data);
 assert.equal(earningsDisplayHtml(s,{start:day,end:day,importance:[3]}).count,1);
 assert.equal(earningsDisplayHtml(s,{start:day,end:day,importance:[1]}).count,0);
 assert.equal(s.rawVendorJsonExposed,false);
});
test('R42 official header and rows label indicator',()=>{
 const s=fs.readFileSync(new URL('../app/market-calendar/market-calendar-client.tsx',import.meta.url),'utf8');
 assert.match(s,/<span>국가<\/span><span>구분<\/span><span>발표 일정<\/span>/);
 assert.match(s,/<span className="mc-kind mc-kind-indicator">지표<\/span>/);
});
test('R42 distinct badge colors and mobile position',()=>{
 const s=fs.readFileSync(new URL('../app/market-calendar/market-calendar.css',import.meta.url),'utf8');
 assert.match(s,/\.mc-kind-indicator\{background:#453365;color:#DCC1FF\}/);
 assert.match(s,/\.mc-kind-earnings\{background:#174B68;color:#8DDCFF\}/);
 assert.match(s,/\.mc-kind\{grid-column:3\/5;grid-row:2;justify-self:end/);
});
