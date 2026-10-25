import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {easternIso,upcomingSchedule,remainingParts,kstDisplay,kstDisplayParts,meetsEarningsMarketCap,SCHEDULE_MAX_ITEMS,EARNINGS_MARKET_CAP_MIN_USD_B} from '../lib/fomc-schedule.mjs';

const file=fs.readFileSync(new URL('../components/fomc-countdown.tsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../components/fomc-countdown.css',import.meta.url),'utf8');

test('original yellow banner and flip clock sizes remain unchanged',()=>{
 assert.match(css,/\.zg-fomc-bar\{position:relative;height:24px;min-height:24px/);
 assert.match(css,/@media\(min-width:1024px\)\{\.zg-fomc-bar\{height:30px;min-height:30px/);
 assert.match(css,/\.zg-fomc-digit\{position:relative;display:inline-block/);
 assert.match(file,/function FlipDigit/);
 assert.match(file,/onClick=\{toggle\}/);
 assert.match(file,/aria-expanded=\{expanded\}/);
 assert.match(file,/hidden=\{!expanded\}/);
});
test('calendar includes verified releases and excludes calls',()=>{
 const now=Date.parse('2026-10-25T03:00:00Z');
 const events=upcomingSchedule(now,null);
 assert.equal(events.length,SCHEDULE_MAX_ITEMS);
 assert.equal(events[0].kind,'실적');
 assert.equal(events[0].name,'코카콜라');
 assert.ok(events.some(e=>e.name==='FOMC 금리 결정'));
 assert.ok(events.filter(e=>e.kind==='실적').length>3);
 assert.ok(events.every(e=>e.kind!=='실적'||e.marketCapUsdB>=EARNINGS_MARKET_CAP_MIN_USD_B));
 assert.ok(events.every(e=>e.kind!=='실적'||typeof e.logoDomain==='string'));
 assert.ok(!events.some(e=>e.kind==='실적'&&e.name==='GE 버노바'));
 assert.deepEqual(events.map(e=>e.at),events.map(e=>e.at).sort());
 assert.ok(events.some(e=>e.name==='알파벳'&&e.estimated));
 // CPI is farther away than the 20 nearest events in late October; it
 // appears automatically after nearer entries expire.
 const later=upcomingSchedule(Date.parse('2026-11-05T03:00:00Z'),null);
 assert.ok(later.some(e=>e.name==='미국 CPI'&&!e.estimated));
 assert.ok(events.filter(e=>e.name==='알파벳').length===1);
 // '코카콜라' is a company name, not an earnings conference call.
 assert.ok(!events.some(e=>/컨퍼런스|실적\\s*콜|콜\\s*일정/.test(e.name)));
});
test('verified macro dates use Eastern daylight saving and standard time',()=>{
 assert.equal(easternIso('2026-10-29',8,30),'2026-10-29T12:30:00.000Z');
 assert.equal(easternIso('2026-11-06',8,30),'2026-11-06T13:30:00.000Z');
 assert.equal(kstDisplay(easternIso('2026-10-28',16)),'10.29 05:00');
});
test('countdown advances each second without day leading zero',()=>{
 const target='2026-10-29T12:30:00Z';
 const a=remainingParts(target,Date.parse('2026-10-26T12:30:02Z'));
 const b=remainingParts(target,Date.parse('2026-10-26T12:30:03Z'));
 assert.equal(a.days,2);
 assert.equal(a.seconds,58);
 assert.equal(b.seconds,57);
 assert.match(file,/\{parts.days\}/);
});
test('310px wraps centered four-column names with unchanged 37px height',()=>{
 assert.match(css,/@media\(max-width:359px\)/);
 assert.match(css,/grid-template-columns:28px minmax\(0,1fr\) 94px 86px/);
 assert.match(css,/\.zg-schedule-name-text\{white-space:normal;word-break:keep-all/);
 assert.match(css,/text-align:center/);
 assert.match(css,/\.zg-schedule-item\{height:37px;min-height:37px;max-height:37px/);
 assert.match(css,/\.zg-schedule-company-logo\{display:block;flex:none;width:14px;height:14px/);
});

test('earnings market-cap threshold is exactly 300 billion USD',()=>{
 assert.equal(EARNINGS_MARKET_CAP_MIN_USD_B,300);
 assert.equal(SCHEDULE_MAX_ITEMS,20);
 assert.equal(meetsEarningsMarketCap(299.99),false);
 assert.equal(meetsEarningsMarketCap(300),true);
 assert.equal(meetsEarningsMarketCap(301),true);
 assert.equal(meetsEarningsMarketCap(null),false);
 assert.equal(meetsEarningsMarketCap(NaN),false);
});
test('estimate labels distinguish before-open from after-close reference',()=>{
 assert.match(file,/session==='beforeOpen'/);
 assert.match(file,/<ScheduleDate at=\{item\.at\} estimated=\{item\.estimated\} session=\{item\.session\}\/>/);
 assert.match(file,/정규장 개장 09:30 ET 기준 예상 시각/);
 assert.match(file,/정규장 마감 16:00 ET 기준 예상 시각/);
 assert.match(css,/\.zg-schedule-ticker-fallback\{display:inline-flex;flex:none/);
});

test('major company logo imagery uses the same 14px slot with safe fallback',()=>{
 assert.match(file,/if\(domain&&!imageFailed\)return <img/);
 assert.match(file,/className="zg-schedule-company-logo"/);
 assert.match(file,/width=\{14\} height=\{14\}/);
 assert.match(file,/onError=\{\(\)=>setImageFailed\(true\)\}/);
 assert.match(file,/className="zg-schedule-ticker-fallback"/);
 assert.match(file,/domain=\{item\.logoDomain\}/);
});

test('KST date weekday uses local day, even across UTC date boundary',()=>{
 assert.deepEqual(kstDisplayParts('2026-10-27T13:30:00Z'),{date:'10.27',weekday:'화',time:'22:30'});
 assert.deepEqual(kstDisplayParts('2026-10-28T16:00:00Z'),{date:'10.29',weekday:'목',time:'01:00'});
 assert.deepEqual(kstDisplayParts('2026-10-28T20:00:00Z'),{date:'10.29',weekday:'목',time:'05:00'});
 assert.deepEqual(kstDisplayParts('2026-11-06T13:30:00Z'),{date:'11.06',weekday:'금',time:'22:30'});
 assert.match(file,/<span className="zg-schedule-weekday" data-day=\{weekday\}>\(\{weekday\}\)<\/span>/);
 const colors=[['일','#ff6a7a'],['월','#83c9ff'],['화','#ffa85e'],['수','#73dcb4'],['목','#f3d46a'],['금','#c3a3ff'],['토','#61d7e1']];
 assert.equal(new Set(colors.map(([,color])=>color)).size,7);
 for(const [weekday,color] of colors)assert.ok(css.includes('.zg-schedule-weekday[data-day="'+weekday+'"]{color:'+color+'}'));
 assert.match(css,/grid-template-columns:30px minmax\(0,1fr\) 94px 86px/);
 assert.match(css,/grid-template-columns:28px minmax\(0,1fr\) 94px 86px/);
});

test('two chevrons show expand/collapse without shifting the existing bar',()=>{
 assert.match(file,/className="zg-fomc-toggle-icon zg-fomc-toggle-left"/);
 assert.match(file,/className="zg-fomc-toggle-icon zg-fomc-toggle-right"/);
 assert.equal((file.match(/d=\{expanded\?'M3 12l9-8 9 8/g)||[]).length,2);
 assert.match(css,/\.zg-fomc-toggle-icon\{position:absolute;top:50%;transform:translateY\(-50%\)/);
 assert.match(css,/pointer-events:none/);
 assert.match(css,/\.zg-fomc-bar\{position:relative;height:24px;min-height:24px/);
 assert.match(css,/@media\(min-width:1024px\)\{\.zg-fomc-bar\{height:30px;min-height:30px/);
});
test('countdown highlights only day digits at D-2 D-1 and D-0',()=>{
 assert.match(file,/function dayUrgencyClass\(days:number\)/);
 assert.match(file,/days<=0\?' zg-fomc-day-0':days===1\?' zg-fomc-day-1':days===2\?' zg-fomc-day-2':''/);
 assert.match(file,/className=\{'zg-schedule-number'\+dayUrgencyClass\(parts\.days\)\}/);
 assert.match(file,/className=\{'zg-fomc-clock'\+dayUrgencyClass\(Number\(event\.days\)\)\}/);
 for(const day of [2,1,0]){
  assert.ok(css.includes('.zg-schedule-number.zg-fomc-day-'+day+'{color:'));
  assert.ok(css.includes('.zg-fomc-clock.zg-fomc-day-'+day+' .zg-fomc-clock-inner>.zg-fomc-pair:first-child .zg-fomc-digit{color:'));
 }
 assert.match(css,/\.zg-schedule-item\{height:37px;min-height:37px;max-height:37px/);
});
