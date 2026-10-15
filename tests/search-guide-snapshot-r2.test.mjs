import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const snapshot=JSON.parse(readFileSync('app/guides/release-snapshot.json','utf8'));
const calendar=readFileSync('app/guides/release-calendar.tsx','utf8');

test('search-guide official snapshot is current through 2026-10-16',()=>{
  assert.equal(snapshot.checkedAt,'2026-10-16');
  const cpiEvent=snapshot.events.find(event=>event.id==='cpi');
  assert.deepEqual(cpiEvent,{
    id:'cpi',
    name:'CPI・2026년 10월분',
    at:'2026-11-10T13:30:00Z',
    source:'https://www.bls.gov/schedule/2026/11_sched_list.htm',
  });
  const cpi=snapshot.releases.find(row=>row.name==='전체 CPI');
  const core=snapshot.releases.find(row=>row.name==='근원 CPI');
  assert.equal(cpi.period,'2026년 9월');
  assert.equal(cpi.previous,0.4);
  assert.equal(cpi.actual,0.6);
  assert.equal(cpi.publishedAt,'2026-10-14');
  assert.match(cpi.source,/cpi_10142026\.htm$/);
  assert.equal(core.period,'2026년 9월');
  assert.equal(core.previous,0.3);
  assert.equal(core.actual,0.3);
  assert.equal(core.publishedAt,'2026-10-14');
});

test('inflation release table exposes each row period instead of implying one shared month',()=>{
  assert.match(calendar,/CPI와 PCE는 발표 주기가 달라 기준월이 서로 다를 수 있습니다/);
  assert.match(calendar,/지표·기준월·단위/);
  assert.match(calendar,/\{row\.period\} · \{row\.unit\}/);
  assert.doesNotMatch(calendar,/2026년 8월분 공식 발표값/);
});

test('unchanged PCE and FOMC official snapshot values remain preserved',()=>{
  const pce=snapshot.releases.find(row=>row.name==='전체 PCE 물가지수');
  const corePce=snapshot.releases.find(row=>row.name==='근원 PCE 물가지수');
  assert.deepEqual([pce.period,pce.previous,pce.actual,pce.publishedAt],['2026년 8월',0.1,0.3,'2026-09-30']);
  assert.deepEqual([corePce.period,corePce.previous,corePce.actual,corePce.publishedAt],['2026년 8월',0.1,0.2,'2026-09-30']);
  assert.equal(snapshot.fed.period,'2026-09-16 결정');
  assert.equal(snapshot.fed.targetRange,'3.75~4.00%');
  assert.equal(snapshot.fed.change,'+0.25%p');
});
