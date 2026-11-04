import test from 'node:test';
import assert from 'node:assert/strict';
import {ECI_RELEASE_PAGE_URL,parseEciReleasePage,resolveEciNextRelease} from '../lib/inflation-eci-release-fallback.mjs';

const now=Date.parse('2026-11-04T19:05:04Z');
const checkedAt='2026-11-04T19:05:04Z';
const today='2026-11-04';
const fixture=(rows=[
  ['Third Quarter 2026','Oct. 30, 2026','08:30 AM'],
  ['Fourth Quarter 2026','Jan. 29, 2027','08:30 AM'],
  ['First Quarter 2027','Apr. 30, 2027','08:30 AM'],
])=>`<!doctype html><html><h2>Schedule of Releases for the Employment Cost Index</h2>
  <table class="release-list"><thead><tr><th>Reference Month</th><th>Release Date</th><th>Release Time</th></tr></thead>
  <tbody>${rows.map(cells=>`<tr class="release-list-odd-row">${cells.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></html>`;
const calendar=events=>({sources:{bls:{status:'READY',checkedAt}},events});

test('parse official ECI release-list table, not hardcoded calendar dates',()=>{
  const rows=parseEciReleasePage(fixture());
  assert.deepEqual(rows.map(x=>x.date),['2026-10-30','2027-01-29','2027-04-30']);
  assert.equal(rows[1].sourceUrl,ECI_RELEASE_PAGE_URL);
  assert.equal(rows[1].releaseTimeEt,'08:30 AM');
  const varied=parseEciReleasePage(fixture([
    ['Second Quarter 2028','Jul. 28, 2028','08:30 AM'],
  ]));
  assert.equal(varied[0].date,'2028-07-28');
});

test('a malformed historical ECI row cannot discard a valid future official date',()=>{
 const html=fixture([
  ['Third Quarter 2025','Feb. 31, 2026','08:30 AM'],
  ['Fourth Quarter 2026','Jan. 29, 2027','08:30 AM'],
 ]);
 const parsed=parseEciReleasePage(html,{today});
 assert.deepEqual(parsed.map(x=>x.date),['2027-01-29']);
 const resolved=resolveEciNextRelease({calendar:calendar([]),today,now,pageHtml:html,pageCheckedAt:checkedAt});
 assert.equal(resolved.status,'CONFIRMED');
 assert.equal(resolved.date,'2027-01-29');
});

test('a malformed possible future row cannot cause selection of a later future release',()=>{
 const html=fixture([
  ['Fourth Quarter 2026','Feb. 31, 2027','08:30 AM'],
  ['First Quarter 2027','Apr. 30, 2027','08:30 AM'],
 ]);
 assert.throws(()=>parseEciReleasePage(html,{today}),/ECI_SCHEDULE_ROW_INVALID/);
 const result=resolveEciNextRelease({calendar:calendar([]),today,now,pageHtml:html,pageCheckedAt:checkedAt});
 assert.equal(result.status,'FALLBACK_PARSE_FAILED');
 assert.equal(result.date,null);
 const contradictoryPeriod=fixture([
  ['Fourth Quarter 2027','Feb. 31, 2026','08:30 AM'],
  ['First Quarter 2027','Apr. 30, 2027','08:30 AM'],
 ]);
 assert.throws(()=>parseEciReleasePage(contradictoryPeriod,{today}),/ECI_SCHEDULE_ROW_INVALID/);
});

test('ECI header order or semantically equivalent reference title does not block a valid date',()=>{
 const reordered=fixture([
  ['Fourth Quarter 2026','Jan. 29, 2027','08:30 AM'],
 ]).replace('<th>Reference Month</th><th>Release Date</th>',
  '<th>Release Date</th><th>Reference Period</th>')
  .replace('<td>Fourth Quarter 2026</td><td>Jan. 29, 2027</td>',
   '<td>Jan. 29, 2027</td><td>Fourth Quarter 2026</td>');
 assert.equal(parseEciReleasePage(reordered)[0].date,'2027-01-29');
});

test('fresh existing ICS future event wins; fallback is skipped, even if page invalid',()=>{
  const result=resolveEciNextRelease({calendar:calendar([
    {id:'eci',source:'bls',date:'2027-01-29',sourceUrl:'https://www.bls.gov/schedule/'},
  ]),today,now,pageHtml:'NOT HTML',pageCheckedAt:checkedAt});
  assert.equal(result.date,'2027-01-29');
  assert.equal(result.basis,'official-ics');
  assert.equal(result.needsFallback,false);
});

test('missing future ICS requests official fallback, then accepts fresh parsed future page',()=>{
  const saved=calendar([{id:'eci',source:'bls',date:'2026-10-30'}]);
  assert.deepEqual(resolveEciNextRelease({calendar:saved,today,now}).status,'FALLBACK_REQUIRED');
  const result=resolveEciNextRelease({calendar:saved,today,now,pageHtml:fixture(),pageCheckedAt:checkedAt});
  assert.equal(result.status,'CONFIRMED');
  assert.equal(result.date,'2027-01-29');
  assert.equal(result.basis,'official-eci-page');
});

test('same-day release is accepted; elapsed calendar dates are never returned',()=>{
  const releaseNow=Date.parse('2027-01-29T13:00:00Z');
  const release=resolveEciNextRelease({calendar:calendar([]),today:'2027-01-29',now:releaseNow,
    pageHtml:fixture(),pageCheckedAt:releaseNow});
  assert.equal(release.date,'2027-01-29');
  const expiredNow=Date.parse('2028-01-01T17:00:00Z');
  const expired=resolveEciNextRelease({calendar:calendar([]),today:'2028-01-01',now:expiredNow,
    pageHtml:fixture(),pageCheckedAt:expiredNow});
  assert.equal(expired.status,'NO_FUTURE_RELEASE');
  assert.equal(expired.date,null);
});

test('HTML identity, table, schema, malformed dates and duplicate releases fail closed',()=>{
  const cases=[
    '<html><h2>Schedule of Releases for Unemployment</h2></html>',
    '<html><h2>Schedule of Releases for the Employment Cost Index</h2></html>',
    fixture().replace('Release Time','Unknown Header'),
    fixture([['Fourth Quarter 2026','Feb. 30, 2027','08:30 AM']]),
    fixture([['Fourth Quarter 2026','Jan. 29, 2027','INVALID']]),
    fixture([['Fourth Quarter 2026','Jan. 29, 2027','08:30 AM'],['First Quarter 2027','Jan. 29, 2027','08:30 AM']]),
  ];
  for(const html of cases){
    assert.throws(()=>parseEciReleasePage(html),/ECI_SCHEDULE_/);
    const resolved=resolveEciNextRelease({calendar:calendar([]),today,now,pageHtml:html,pageCheckedAt:checkedAt});
    assert.equal(resolved.status,'FALLBACK_PARSE_FAILED');
    assert.equal(resolved.date,null);
  }
});

test('stale, missing or future-dated page observations never become confirmed',()=>{
  for(const pageCheckedAt of [null,'2026-11-01T00:00:00Z','2026-11-05T00:00:00Z','n/a']){
    const result=resolveEciNextRelease({calendar:calendar([]),today,now,pageHtml:fixture(),pageCheckedAt});
    assert.equal(result.status,'FALLBACK_STALE');
    assert.equal(result.date,null);
  }
  assert.equal(resolveEciNextRelease({calendar:calendar([]),today:'not-a-date',now,pageHtml:fixture(),pageCheckedAt:checkedAt}).status,'INVALID_REFERENCE');
  assert.equal(resolveEciNextRelease({calendar:calendar([]),today:'2026-11-05',now,pageHtml:fixture(),pageCheckedAt:checkedAt}).status,'INVALID_REFERENCE');
});

test('stale ICS future event is not accepted without fresh official fallback evidence',()=>{
  const old={sources:{bls:{status:'READY',checkedAt:'2026-10-01T00:00:00Z'}},events:[
    {id:'eci',source:'bls',date:'2027-01-29'},
  ]};
  const result=resolveEciNextRelease({calendar:old,today,now});
  assert.equal(result.status,'FALLBACK_REQUIRED');
  assert.equal(result.date,null);
});
