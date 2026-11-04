import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INFLATION_RESEARCH_RELEASE_MAPPING,
  inflationResearchReleaseInfo,
} from '../lib/inflation-research-release-calendar.mjs';

const NOW=Date.parse('2026-11-05T12:00:00Z');
const TODAY='2026-11-05';
const CHECKED=new Date(NOW-60*60*1000).toISOString();
const EVENTS=[
  {id:'ppi',source:'bls',date:'2026-11-17'},
  {id:'ppi',source:'bls',date:'2026-12-15'},
  {id:'employment',source:'bls',date:'2026-11-06'},
  {id:'eci',source:'bls',date:'2026-11-13'},
  {id:'productivity',source:'bls',date:'2026-11-12'},
  {id:'import-export-prices',source:'bls',date:'2026-11-16'},
  {id:'pce',source:'bea',date:'2026-11-25'},
  {id:'eia-epm',source:'eia_epm',date:'2026-11-24'},
  {id:'nyfed-gscpi',source:'nyfed',date:'2026-11-09'},
  {id:'nyfed-sce',source:'nyfed',date:'2026-11-10'},
];
const sample=(sourceStates={},events=EVENTS)=>({
  status:'READY',
  sources:{bls:{status:'READY',checkedAt:CHECKED},bea:{status:'READY',checkedAt:CHECKED},...sourceStates},
  events,
});

test('all 16 mapped research IDs select their matching official BLS/BEA/EIA/NYFed event',()=>{
  const expectations={
    '5':'2026-11-17','6':'2026-11-17','7':'2026-11-17','8':'2026-11-17',
    '9':'2026-11-17','10':'2026-11-17','11':'2026-11-17',
    '12':'2026-11-06','13':'2026-11-13','14':'2026-11-12',
    '19':'2026-11-16','25':'2026-11-17','26':'2026-11-25',
    '4':'2026-11-24','21':'2026-11-09','31':'2026-11-10',
  };
  assert.equal(Object.keys(INFLATION_RESEARCH_RELEASE_MAPPING).length,16);
  const withFutureSources=sample({
    eia_epm:{status:'READY',checkedAt:CHECKED},
    nyfed:{status:'READY',checkedAt:CHECKED},
  });
  for(const [id,expected] of Object.entries(expectations)){
    const actual=inflationResearchReleaseInfo(id,withFutureSources,TODAY,NOW);
    assert.equal(actual.status,'CONFIRMED',`research #${id}`);
    assert.equal(actual.nextReleaseDate,expected,`research #${id}`);
    assert.equal(actual.basis,'official',`research #${id}`);
    assert.equal(actual.sourceUrl?.startsWith('https://'),true,`research #${id}`);
  }
});

test('confirmed date is the earliest future date of exactly the matched event and source',()=>{
  const calendar=sample({},[
    {id:'ppi',source:'bls',date:'2026-11-04'},
    {id:'ppi',source:'bls',date:'2026-12-01'},
    {id:'ppi',source:'bea',date:'2026-11-07'},
    {id:'cpi',source:'bls',date:'2026-11-08'},
    {id:'ppi',source:'bls',date:'2026-11-05'},
  ]);
  assert.equal(inflationResearchReleaseInfo('5',calendar,TODAY,NOW).nextReleaseDate,TODAY);
  assert.equal(inflationResearchReleaseInfo('5',calendar,'2026-11-06',NOW).nextReleaseDate,'2026-12-01');
});

test('READY source without any future matching event does not invent a date',()=>{
  const answer=inflationResearchReleaseInfo('14',sample({},[{id:'productivity',source:'bls',date:'2026-11-04'}]),TODAY,NOW);
  assert.equal(answer.status,'NO_CONFIRMED');
  assert.equal(answer.nextReleaseDate,null);
});

test('source failure preserves a previously verified future event but clearly labels it as last known',()=>{
  const answer=inflationResearchReleaseInfo('14',sample({bls:{status:'SOURCE_FAILED',checkedAt:CHECKED}},EVENTS),TODAY,NOW);
  assert.equal(answer.status,'LAST_CONFIRMED_SOURCE_FAILED');
  assert.equal(answer.nextReleaseDate,'2026-11-12');
  assert.equal(answer.basis,'last-official-source-failed');
  assert.match(answer.text,/마지막 확인.*조회 실패/);
  assert.doesNotMatch(answer.text,/· 공식$/);
});

test('48h freshness is a warning, not a hard delete of valid future official events',()=>{
  const exact=new Date(NOW-48*60*60*1000).toISOString();
  const old=new Date(NOW-48*60*60*1000-1).toISOString();
  const future=new Date(NOW+1000).toISOString();
  assert.equal(inflationResearchReleaseInfo('5',sample({bls:{status:'READY',checkedAt:exact}}),TODAY,NOW).status,'CONFIRMED');
  const preserved=inflationResearchReleaseInfo('5',sample({bls:{status:'READY',checkedAt:old}}),TODAY,NOW);
  assert.equal(preserved.status,'LAST_CONFIRMED_STALE');
  assert.equal(preserved.nextReleaseDate,'2026-11-17');
  assert.equal(preserved.basis,'last-official-stale');
  assert.match(preserved.text,/마지막 확인.*갱신 지연/);
  for(const checkedAt of [future,null,'not-a-date']){
    const answer=inflationResearchReleaseInfo('5',sample({bls:{status:'READY',checkedAt}}),TODAY,NOW);
    assert.equal(answer.status,'SOURCE_STALE');
    assert.equal(answer.nextReleaseDate,null);
  }
});

test('expired events, missing prior verification, and mismatched sources never masquerade as last known dates',()=>{
  const old=new Date(NOW-49*3600000).toISOString();
  const events=[{id:'ppi',source:'bls',date:'2026-11-04'},
    {id:'ppi',source:'bea',date:'2026-11-17'}];
  for(const status of ['READY','SOURCE_FAILED']){
    const answer=inflationResearchReleaseInfo('5',sample({bls:{status,checkedAt:old}},events),TODAY,NOW);
    assert.equal(answer.nextReleaseDate,null);
    assert.equal(answer.status,status==='READY'?'SOURCE_STALE':'SOURCE_FAILED');
  }
  const withoutChecked=inflationResearchReleaseInfo('5',sample({bls:{status:'SOURCE_FAILED',checkedAt:null}}),TODAY,NOW);
  assert.equal(withoutChecked.status,'SOURCE_FAILED');
  assert.equal(withoutChecked.nextReleaseDate,null);
});

test('missing calendar, source state, malformed event and reference dates never create fake official dates',()=>{
  assert.equal(inflationResearchReleaseInfo('14',null,TODAY,NOW).status,'SOURCE_UNVERIFIED');
  assert.equal(inflationResearchReleaseInfo('14',{events:EVENTS,sources:{}},TODAY,NOW).status,'SOURCE_UNVERIFIED');
  assert.equal(inflationResearchReleaseInfo('14',sample({},[{id:'productivity',source:'bls',date:'2026-02-30'}]),TODAY,NOW).status,'NO_CONFIRMED');
  assert.equal(inflationResearchReleaseInfo('14',sample(),'2026-02-30',NOW).status,'INVALID_REFERENCE_DATE');
});

test('three daily/spot rows and three currently missing optional sources are explicitly distinguished',()=>{
  const cases={
    '1':'UNSCHEDULED_SPOT','3':'UNSCHEDULED_DAILY','18':'UNSCHEDULED_DAILY',
    '4':'SOURCE_NOT_CONNECTED','21':'SOURCE_NOT_CONNECTED','31':'SOURCE_NOT_CONNECTED',
  };
  for(const [id,status] of Object.entries(cases)){
    const answer=inflationResearchReleaseInfo(id,sample(),TODAY,NOW);
    assert.equal(answer.status,status,`research #${id}`);
    assert.equal(answer.nextReleaseDate,null,`research #${id}`);
  }
  assert.equal(inflationResearchReleaseInfo('999',sample(),TODAY,NOW).status,'UNKNOWN_RESEARCH_ID');
});

test('future EIA/NYFed source activation needs no code mapping change',()=>{
  const events=[
    {id:'eia-epm',source:'eia_epm',date:'2026-11-24'},
    {id:'nyfed-gscpi',source:'nyfed',date:'2026-11-09'},
    {id:'nyfed-sce',source:'nyfed',date:'2026-11-10'},
  ];
  const states={
    eia_epm:{status:'READY',checkedAt:CHECKED},
    nyfed:{status:'READY',checkedAt:CHECKED},
  };
  for(const [id,expected] of [['4','2026-11-24'],['21','2026-11-09'],['31','2026-11-10']]){
    const missing=inflationResearchReleaseInfo(id,sample(),TODAY,NOW);
    assert.equal(missing.status,'SOURCE_NOT_CONNECTED');
    assert.equal(missing.text,'공식 일정 자동 연결 전');
    const connected=inflationResearchReleaseInfo(id,sample(states,events),TODAY,NOW);
    assert.equal(connected.status,'CONFIRMED');
    assert.equal(connected.nextReleaseDate,expected);
    assert.equal(connected.basis,'official');
  }
});

test('newly linked sources preserve only previously verified dates and label failure or staleness',()=>{
  const failed=sample({nyfed:{status:'SOURCE_FAILED',checkedAt:CHECKED}});
  const oldNyfed=inflationResearchReleaseInfo('21',failed,TODAY,NOW);
  assert.equal(oldNyfed.status,'LAST_CONFIRMED_SOURCE_FAILED');
  assert.equal(oldNyfed.nextReleaseDate,'2026-11-09');
  const stale=sample({eia_epm:{status:'READY',checkedAt:new Date(NOW-49*3600000).toISOString()}});
  const oldEia=inflationResearchReleaseInfo('4',stale,TODAY,NOW);
  assert.equal(oldEia.status,'LAST_CONFIRMED_STALE');
  assert.equal(oldEia.nextReleaseDate,'2026-11-24');
  const readyNoEvents=sample({nyfed:{status:'READY',checkedAt:CHECKED}},[]);
  assert.equal(inflationResearchReleaseInfo('31',readyNoEvents,TODAY,NOW).status,'NO_CONFIRMED');
});
