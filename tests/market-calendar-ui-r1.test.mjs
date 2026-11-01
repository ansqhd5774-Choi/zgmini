import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const page=readFileSync(new URL('../app/market-calendar/page.tsx',import.meta.url),'utf8');
const client=readFileSync(new URL('../app/market-calendar/market-calendar-client.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../app/market-calendar/market-calendar.css',import.meta.url),'utf8');

test('market calendar is a distinct indexed route with the approved visible name',()=>{
 assert.match(page,/const path='\/market-calendar\/'/);
 assert.match(page,/<h1>시장 캘린더<\/h1>/);
 assert.match(page,/경제지표 · 기업 실적 발표 일정을 한눈에/);
 assert.match(page,/SiteHeader/);
 assert.doesNotMatch(page,/mock-ribbon|시안 R2|통합 발표 캘린더|이번 선택 기간/);
});

test('calendar uses the existing stored official feed and checked manual releases only',()=>{
 assert.match(client,/fetch\('\/api\/release-calendar'/);
 assert.match(client,/release-snapshot\.json/);
 assert.match(client,/checkedAt/);
 assert.match(client,/sourceUrl/);
 assert.match(client,/feed\?\.status!=='READY'/);
 assert.match(client,/공식 일정 저장본 미확정/);
 assert.doesNotMatch(client,/demoEvents|forecast:'[0-9]|삼성전자|마이크로소프트|애플/);
});

test('approved calendar controls, KST countdown and mobile adaptation remain connected',()=>{
 assert.match(client,/kind==='earnings'/);
 assert.match(client,/setView\('week'\)/);
 assert.match(client,/setView\('month'\)/);
 assert.match(client,/setSelected\(today\)/);
 assert.match(client,/Asia\/Seoul/);
 assert.match(client,/D-\$\{daysLeft\}/);
 assert.match(client,/시간 미확정|시각 미정/);
 assert.match(client,/남은 시간/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/\.mc-calendar-strip/);
});

test('a long-open calendar advances KST today and keeps untimed US release dates on the US Eastern calendar',()=>{
 assert.match(client,/const usDay=\(at:Date\)=>dayInZone\(at,'America\/New_York'\)/);
 assert.match(client,/setToday\(kstDay\(current\)\)/);
 assert.match(client,/row\.country==='US'\?usDay\(new Date\(nowMs\)\):today/);
 const dateInZone=(instant,timeZone)=>{
  const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(instant));
  const get=key=>parts.find(part=>part.type===key)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
 };
 const instant='2026-10-26T15:30:00Z';
 assert.equal(dateInZone(instant,'Asia/Seoul'),'2026-10-27');
 assert.equal(dateInZone(instant,'America/New_York'),'2026-10-26');
 assert.equal(dateInZone('2026-07-01T03:30:00Z','America/New_York'),'2026-06-30');
 assert.equal(dateInZone('2026-12-01T04:30:00Z','America/New_York'),'2026-11-30');
});
