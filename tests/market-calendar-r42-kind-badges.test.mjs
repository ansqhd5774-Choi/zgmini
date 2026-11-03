import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {earningsDisplaySnapshot,earningsDisplayHtml} from '../lib/earnings-api-display.mjs';
import {ER1_METHOD,ER1_STAR3_THRESHOLD} from '../lib/market-calendar-er1-earnings-score.mjs';
const day='2026-10-29';
const coveredDays=Array.from({length:14},(_,i)=>new Date(Date.parse(day+'T00:00:00Z')+i*86400000).toISOString().slice(0,10));
const event={ticker:'AMZN',company:'Amazon.com, Inc.',date:day,marketSession:'after_market',time:null,priority:true,verification:'VENDOR_UNVERIFIED',source:'earnings-api'};
const data={status:'READY_PRIVATE',scope:'PC_PRIVATE',publicDisplay:false,redistribution:false,publicationStatus:'HELD_UNCONFIRMED',checkedAt:'2026-10-29T02:00:00Z',coveredDays,recordCount:1,priorityCount:1,events:[event]};
const verifiedER1={status:'READY_ER1_PUBLIC',method:ER1_METHOD,
 asOf:new Date().toISOString().slice(0,10),threshold:ER1_STAR3_THRESHOLD,
 coverage:{inputSymbols:1,observedIssuers:1,scoreableIssuers:1,unscoreableReasons:{}},
 recordCount:1,star3Count:1,
 scores:[{issuerId:'AMZN',tickers:['AMZN'],score:ER1_STAR3_THRESHOLD}]};
test('R42 adds 실적 badge at render without mutating stored HTML',()=>{
 const snap=earningsDisplaySnapshot(data),before=snap.byDay[day][0];
 assert.doesNotMatch(before,/mc-kind/);
 const out=earningsDisplayHtml(snap,{start:day,end:day});
 assert.equal(out.count,1);
 assert.match(out.html,/<span class=mc-country>미국<\/span><span class="mc-kind mc-kind-earnings">실적<\/span><div class=mc-event>/);
 assert.equal(snap.byDay[day][0],before);
});
test('R42 earnings importance filter requires a validated ER1 score',()=>{
 const s=earningsDisplaySnapshot(data),before=s.byDay[day][0];
 const star3={start:day,end:day,importance:[3]};
 // Priority/FHS/R43 flags alone cannot substitute for the public ER1 score.
 const missing=earningsDisplayHtml(s,star3);
 assert.equal(missing.count,0);
 assert.doesNotMatch(missing.html,/★★★/);
 // An internally inconsistent ER1 snapshot must also fail closed.
 assert.equal(earningsDisplayHtml(s,star3,{...verifiedER1,star3Count:0}).count,0);
 // A verified score at the approved threshold is the sole three-star path.
 const verified=earningsDisplayHtml(s,star3,verifiedER1);
 assert.equal(verified.count,1);
 assert.match(verified.html,/aria-label="기업 실적 점수 97\.00점"[^>]*>★★★<\/div>/);
 assert.equal(earningsDisplayHtml(s,{start:day,end:day,importance:[1]},verifiedER1).count,0);
 assert.equal(earningsDisplayHtml(s,{start:day,end:day}).count,1);
 assert.equal(s.byDay[day][0],before);
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
