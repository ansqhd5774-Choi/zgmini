import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PUBLISHERS} from './stage04-four-publisher-r37-readonly.mjs';
import {TARGET,topicRank,classifyScope,headlineForecastConflict,chooseForecast,inspectR50,discoverR50,
  summarizeR50,runR50} from './stage04-topic02-r50-three-media.mjs';
import {excludedBri} from './stage04-topic01-r49-three-media.mjs';

const pub=id=>PUBLISHERS.find(x=>x.id===id);
const TBRC='https://www.thebusinessresearchcompany.com/report/telecom-global-market-report';
const SKY='https://www.skyquestt.com/report/telecommunication-market';
const PRE='https://www.precedenceresearch.com/telecommunication-market';
const response=(html,status=200)=>({ok:status>=200&&status<300,status,
  headers:{get:()=>null},text:async()=>html});
const tbrcHtml=`<h1>Telecom Market Report 2026</h1>
  <h2>What Is The Telecom Market Growth Forecast?</h2>
  <p>The telecom market size is expected to see growth in the next few years.
  It will grow to $3918.79 billion in 2030 at a compound annual growth rate (CAGR) of 5.3%.</p>
  <h2>Telecom Market Report Forecast Analysis</h2><table>
  <tr><td>Market Size Value In 2026</td><td>$3193.18 billion</td></tr>
  <tr><td>Revenue Forecast In 2030</td><td>$3918.79 billion</td></tr>
  <tr><td>Growth Rate</td><td>CAGR of 5.3% from 2026 to 2030</td></tr>
  </table>`;
const skyHtml=`<h1>Telecommunication Market Size and Industry Forecast</h1>
  <p>Global Telecommunication Market size was valued at USD 1917.56 Billion in 2024,
  is poised to grow from USD 2036.45 Billion in 2025 to USD 3295.1 Billion by 2033,
  growing at a CAGR of 6.2% in the forecast period (2026–2033).</p>`;

test('R50 advances only to topic 02 and preserves GICS vs telecom boundary',()=>{
  assert.equal(TARGET.name,'커뮤니케이션');assert.equal(TARGET.index,2);
  assert.equal(topicRank(TBRC),1000);assert.equal(topicRank(SKY),1000);
  assert.equal(topicRank(PRE),1000);
  assert.equal(classifyScope(TBRC,'Telecom Market Report 2026'),'TELECOM_SUBMARKET');
  assert.equal(classifyScope(SKY,'Telecommunication Market Forecast'),'TELECOM_SUBMARKET');
  assert.equal(classifyScope(PRE,'Telecommunication Market Forecast'),'TELECOM_SUBMARKET');
  assert.equal(classifyScope('https://www.skyquestt.com/report/communication-services-market',
    'Communication Services Market','telecom, media and entertainment'), 'BROAD_SCOPE_REVIEW');
});

test('R50 model chooses token C0, never the numeric forecast rate as an index',async()=>{
  const x=await chooseForecast(pub('SkyQuest'),'Telecommunication Market Forecast',[
    {pct:6.2,excerpt:'Global Telecommunication Market grows at CAGR 6.2% in forecast period 2026-2033.'}
  ],{fetchFn:async(_url,init)=>{
    const body=JSON.parse(init.body);
    assert.deepEqual(body.format.properties.candidate_id.enum,['NONE','C0']);
    assert.match(body.prompt,/PROXY/);
    return {ok:true,json:async()=>({response:'{"candidate_id":"C0","scope":"PROXY"}'})};
  }});
  assert.equal(x.index,0);assert.equal(x.candidate_id,'C0');assert.equal(x.scope,'PROXY');
});

test('R50 reports TBRC publisher forecast but never labels telecom as GICS sector',async()=>{
  const found=await inspectR50(pub('TBRC'),TBRC,{fetchFn:async()=>response(tbrcHtml),
    chooseFn:async()=>({index:0,candidate_id:'C0',scope:'PROXY',elapsed_ms:1})});
  assert.equal(found.state,'PUBLISHER_PROXY_OBSERVED');
  assert.equal(found.source_audit,'CONSISTENT');
  assert.equal(found.observed_cagr,5.3);
  assert.equal(found.period,'2026-2030');
  assert.equal(found.eligible,false);
});

test('R50 telecom-only SkyQuest remains proxy with official future year window',async()=>{
  const found=await inspectR50(pub('SkyQuest'),SKY,{fetchFn:async()=>response(skyHtml),
    chooseFn:async()=>({index:0,candidate_id:'C0',scope:'PROXY',elapsed_ms:1})});
  assert.equal(found.state,'PUBLISHER_PROXY_OBSERVED');
  assert.equal(found.observed_cagr,6.2);
  assert.equal(found.period,'2026-2033');
  assert.equal(found.eligible,false);
});

test('R50 detects same-year forecast-size conflict before asking local model',async()=>{
  const title='Telecommunication Market Size to Hit USD 4.21 Tn by 2035';
  const html=`<h1>${title}</h1><p>The global telecommunication market size is estimated at
    USD 2.46 trillion in 2025 and is predicted to increase from USD 2.61 trillion
    in 2026 to approximately USD 4.42 trillion by 2035, expanding at a CAGR
    of 6.03% during 2026 to 2035.</p>`;
  assert.match(headlineForecastConflict(title,html),/HEADLINE_BODY_SAME_YEAR_SIZE_CONFLICT:2035/);
  assert.equal(headlineForecastConflict(title,html.replace('USD 4.42 trillion','USD 4.21 trillion')),null);
  const found=await inspectR50(pub('Precedence'),PRE,{fetchFn:async()=>response(html),
    chooseFn:async()=>{throw Error('MODEL_MUST_NOT_RUN_WHEN_SOURCE_CONFLICT');}});
  assert.equal(found.state,'SOURCE_CONFLICT');
  assert.equal(found.source_audit,'SOURCE_CONFLICT');
  assert.equal(found.observed_cagr,null);
});

test('R50 official catalog and two independent public engines retain live vs seed',async()=>{
  const discovered=await discoverR50(pub('SkyQuest'),SKY,{
    fetchFn:async()=>response(`<a href="${SKY}">report</a>`),
    searchFn:async()=>'<html>no relevant official report</html>'});
  assert.equal(discovered.catalog_status,'OK');
  assert.equal(discovered.search_state,'LIVE_REPORT_CANDIDATES');
  assert.equal(discovered.live_discovered_count,1);
  assert.equal(discovered.candidate_urls.length,1);
  assert.equal(discovered.attempts.filter(x=>x.engine==='BING').length,2);
  assert.equal(discovered.attempts.filter(x=>x.engine==='GOOGLE').length,2);
});

test('R50 records prior 429 without repeating same search engine',async()=>{
  const blocked=new Set();const attempts=[];
  await discoverR50(pub('TBRC'),TBRC,{
    fetchFn:async()=>response('unavailable'),blockedSearchEngines:blocked,
    searchFn:async url=>{attempts.push(url);
      if(url.includes('google.com'))throw Error('SEARCH_HTTP_429');return '';}
  });
  assert.equal(attempts.filter(url=>url.includes('google.com')).length,1);
  assert.equal(attempts.filter(url=>url.includes('bing.com')).length,2);
  assert.equal(blocked.has('GOOGLE'),true);
});

test('R50 stable research status can be partial, never success if numeric rates are proxies',()=>{
  const rounds=[0,500,520,510].map((total_ms,i)=>({warmup:i===0,total_ms,
    publishers:PUBLISHERS.map(p=>p.id==='BRI'?excludedBri():{
      publisher:p.id,state:'PUBLISHER_PROXY_OBSERVED',total_ms:3,
      search:{engine:'OFFICIAL',search_state:'LIVE_REPORT_CANDIDATES',catalog_status:'OK',candidate_urls:[]},
      selected:{observed_cagr:6.2,period:'2026-2033',scope:'TELECOM_SUBMARKET',url:SKY}
    })}));
  const summary=summarizeR50(rounds);
  assert.equal(summary.speed_stable,true);
  assert.equal(summary.results_stable,true);
  assert.equal(summary.gate,'PARTIAL_RESEARCH_REVIEW_REQUIRED');
});

test('R50 full mock run never invokes BRI and always keeps sector average NULL',async()=>{
  const prefix=join(await mkdtemp(join(tmpdir(),'zgmini-r50-test-')),'R50_TOPIC02');
  const calls=[];
  const result=await runR50({outputPrefix:prefix,
    fetchFn:async()=>{throw Error('UNEXPECTED_NETWORK');},
    researchFn:async p=>{calls.push(p.id);return {
      publisher:p.id,state:'PUBLISHER_PROXY_OBSERVED',
      search:{engine:'MOCK',search_state:'LIVE_REPORT_CANDIDATES',catalog_status:'OK',
        candidate_urls:[SKY],attempts:[],live_discovered_count:1},
      inspections:[],selected:{url:SKY,observed_cagr:6.2,period:'2026-2033',
        scope:'TELECOM_SUBMARKET',eligible:false},
      uninspected:0,search_ms:2,report_ms:3,ollama_ms:1,total_ms:6
    };}
  });
  assert.equal(result.rounds.length,4);
  assert.deepEqual(new Set(calls),new Set(['TBRC','SkyQuest','Precedence']));
  assert.equal(calls.length,12);
  assert.equal(result.mean.mean,null);
  assert.equal(result.summary.bri_uncontacted,true);
  assert.equal(result.rows.find(x=>x.publisher==='BRI').observed_cagr,null);
  const txt=await readFile(prefix+'.txt','utf8');
  const json=JSON.parse(await readFile(prefix+'.json','utf8'));
  assert.match(txt,/BRI_NETWORK_REQUESTS=0/);
  assert.match(txt,/GICS_COMMUNICATION_CAGR=NULL/);
  const history=await readFile(prefix+'_HISTORY.ndjson','utf8');
  const first=JSON.parse(history.trim());
  assert.equal(first.sector_cagr,null);
  assert.equal(first.warmup_count,1);
  assert.equal(first.measured_count,3);
  assert.equal(first.observations.find(x=>x.publisher==='BRI').cagr,null);
  assert.equal(json.topic.name,'커뮤니케이션');
  assert.equal(json.status,'FINISHED_RESEARCH_ONLY');
});
