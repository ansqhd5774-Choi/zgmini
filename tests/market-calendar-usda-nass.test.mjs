import test from 'node:test';
import assert from 'node:assert/strict';
import {parseNassReportSchedule,collectNassReportSchedule,
 NASS_REPORT_SCHEDULE_URL,NASS_OFFICIAL_SOURCE_KEY,NASS_SOURCE_SPEC}
 from '../lib/market-calendar-usda-nass.mjs';

// These rows are an isolated reproduction of the publicly documented markup,
// NOT a live provider request, PC collection receipt, or production proof.
const report=(name,year,days)=>'<div class="nass-report-catalogue__report">'+
 '<h3><a href="https://www.nass.usda.gov/">'+name+'</a></h3><details>'+
 '<summary>'+year+' release dates for '+name+'</summary>'+
 '<ul class="nass-report-catalogue__dates">'+days.map(day=>
 '<li><time datetime="'+day+'">Official date</time></li>').join('')+'</ul></details></div>';
const page=(...parts)=>'<html><title>USDA-NASS National Agricultural Statistics Service</title><main>'+
 parts.join('')+'</main></html>';
const sourceHtml=()=>page(
 report('Crop Production',2026,['2026-01-12','2026-02-10','2026-11-10','2026-12-10']),
 report('Crop Progress',2026,['2026-04-06','2026-11-16']),
 report('Prospective Plantings',2026,['2026-03-31'])
);
test('only explicitly printed official crop dates become stable five-field events',()=>{
 const events=parseNassReportSchedule(sourceHtml());
 assert.equal(events.length,7);
 assert.equal(new Set(events.map(e=>e.id+':'+e.date)).size,7);
 assert.deepEqual([...new Set(events.map(e=>e.id))].sort(),[
  'usda-nass-crop-production','usda-nass-crop-progress',
  'usda-nass-prospective-plantings'].sort());
 for(const event of events){
  assert.deepEqual(Object.keys(event),['id','date','title','source','sourceUrl']);
  assert.equal(event.source,NASS_OFFICIAL_SOURCE_KEY);
  assert.equal(event.sourceUrl,NASS_REPORT_SCHEDULE_URL);
 }
 assert.equal(NASS_SOURCE_SPEC.format,'nass-report-dates');
 assert.equal(NASS_REPORT_SCHEDULE_URL,'https://www.nass.usda.gov/publications/reports-by-release-day');
 assert.equal(NASS_SOURCE_SPEC.url,NASS_REPORT_SCHEDULE_URL);
});
test('published next-year dates are included; unpublished years are never projected',()=>{
 const data=page(report('Crop Production',2026,['2026-12-10']),
  report('Crop Progress',2026,['2026-11-16']),
  report('Crop Production',2027,['2027-01-12']));
 // A provider reporting separate same-title yearly blocks is rejected until
 // the official catalogue contract is adapted, rather than pretending to know 2027.
 assert.throws(()=>parseNassReportSchedule(data),/NASS_REPORT_SECTION_DUPLICATE/);
 const data2=page('<div class="nass-report-catalogue__report"><h3>'+
  '<a href="https://www.nass.usda.gov/">Crop Production</a></h3>'+
  '<details><summary>2026 release dates for Crop Production</summary><ul class="nass-report-catalogue__dates">'+
  '<li><time datetime="2026-12-10">Thu</time></li></ul></details>'+
  '<details><summary>2027 release dates for Crop Production</summary><ul class="nass-report-catalogue__dates">'+
  '<li><time datetime="2027-01-12">Tue</time></li></ul></details></div>');
 assert.deepEqual(parseNassReportSchedule(data2).map(e=>e.date),['2026-12-10','2027-01-12']);
 assert.deepEqual(parseNassReportSchedule(data2,{fromDate:'2027-01-01'}).map(e=>e.date),['2027-01-12']);
});
test('invalid year/date and duplicate official event stop rather than invent replacements',()=>{
 const base=()=>report('Crop Production',2026,['2026-12-10']);
 assert.throws(()=>parseNassReportSchedule(page(report('Crop Production',2026,['2027-12-10']))),
  /NASS_RELEASE_DATE_INVALID/);
 assert.throws(()=>parseNassReportSchedule(page(report('Crop Production',2026,['2026-02-30']))),
  /NASS_RELEASE_DATE_INVALID/);
 assert.throws(()=>parseNassReportSchedule(page(report('Crop Production',2026,['2026-12-10','2026-12-10']))),
  /NASS_RELEASE_DATE_DUPLICATE/);
 assert.throws(()=>parseNassReportSchedule(page(base().replace('2026 release dates','2025 release dates'))),
  /NASS_RELEASE_DATE_INVALID/);
});
test('unrelated/empty pages and oversized input cannot claim a READY source',()=>{
 assert.throws(()=>parseNassReportSchedule('no catalogue'),/NASS_INPUT_INVALID/);
 assert.throws(()=>parseNassReportSchedule(page(report('Unrelated Stock Tips',2026,['2026-12-10']))),
  /NASS_CROP_PRODUCTION_DATES_MISSING/);
 assert.throws(()=>parseNassReportSchedule(sourceHtml().repeat(5000)),
  /NASS_INPUT_INVALID/);
});
test('collector uses one official GET, saves private HTML, reparses readback and retains prior history',async()=>{
 const html=sourceHtml(),inputs=new Map();const calls=[];
 const store={async writeInput(k,v){inputs.set(k,v);},
  async readInput(k){return {body:inputs.get(k)};}};
 const prior={body:{events:[
  {source:NASS_OFFICIAL_SOURCE_KEY,id:'usda-nass-crop-production',
   date:'2025-02-10',title:'prior',sourceUrl:NASS_REPORT_SCHEDULE_URL},
  {source:NASS_OFFICIAL_SOURCE_KEY,id:'usda-nass-crop-production',
   date:'2026-12-11',title:'old amended',sourceUrl:NASS_REPORT_SCHEDULE_URL},
  {source:'usda',id:'usda-wasde',date:'2026-11-11'}
 ]}};
 const now=Date.parse('2026-11-15T12:00:00Z');
 const result=await collectNassReportSchedule({store,key:'release-calendar',now,previous:prior,
  countRequest:()=>calls.push('quota'),
  fetchImpl:async url=>{calls.push(url);return new Response(html,{status:200,
   headers:{'content-type':'text/html; charset=utf-8'}});}});
 assert.deepEqual(calls,['quota',NASS_REPORT_SCHEDULE_URL]);
 assert.equal(inputs.get('release-calendar:usda_nass').text,html);
 assert.equal(result.state.status,'READY');
 assert.deepEqual(result.state.coveredYears,['2026']);
 assert.equal(result.events.length,8);
 assert.equal(result.events.some(e=>e.date==='2025-02-10'),true);
 assert.equal(result.events.some(e=>e.date==='2026-12-11'),false);
 assert.equal(result.events.some(e=>e.source==='usda'),false);
});
test('same-count tampering of a saved official date fails exact readback comparison',async()=>{
 const now=Date.parse('2026-11-15T12:00:00Z');
 const html=sourceHtml();
 const store={
  async writeInput(){},
  async readInput(){return {body:{text:html.replace('2026-12-10','2026-12-11')}};}
 };
 await assert.rejects(collectNassReportSchedule({store,key:'release-calendar',now,
  fetchImpl:async()=>new Response(html,{status:200,headers:{'content-type':'text/html'}})}),
  /NASS_STORED_EVENTS_MISMATCH/);
});

test('HTTP/content-type/store readback failure cannot claim collection success',async()=>{
 const now=Date.parse('2026-11-15T12:00:00Z');
 const store={async writeInput(){},async readInput(){return {body:{text:'not official'}}}};
 const base={store,key:'release-calendar',now};
 await assert.rejects(collectNassReportSchedule({...base,fetchImpl:async()=>new Response('blocked',{status:403})}),
  /NASS_HTTP_403/);
 await assert.rejects(collectNassReportSchedule({...base,fetchImpl:async()=>new Response(sourceHtml(),{
  status:200,headers:{'content-type':'application/json'}})}),/NASS_CONTENT_TYPE_INVALID/);
 await assert.rejects(collectNassReportSchedule({...base,fetchImpl:async()=>new Response(sourceHtml(),{
  status:200,headers:{'content-type':'text/html'}})}),/NASS_INPUT_INVALID|NASS_CATALOGUE_IDENTITY_INVALID/);
});

test('market calendar UI accepts only matching USDA-NASS provider identities',async()=>{
 const {readFileSync}=await import('node:fs');
 const client=readFileSync(new URL('../app/market-calendar/market-calendar-client.tsx',import.meta.url),'utf8');
 assert.match(client,/usda_nass:'USDA NASS'/);
 assert.match(client,/const nassEvent=item\.source==='usda_nass'/);
 assert.match(client,/if\(item\.id\.startsWith\('usda-nass-'\)&&!nassEvent\)continue/);
 assert.match(client,/\|\|usdaEvent\|\|nassEvent\|\|cftcEvent/);
 assert.match(client,/item\.source==='usda_nass'\?'원자재'/);
});
