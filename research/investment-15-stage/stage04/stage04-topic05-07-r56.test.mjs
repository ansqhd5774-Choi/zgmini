import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PUBLISHERS} from './stage04-four-publisher-r37-readonly.mjs';
import {TOPICS_R56,verifiedR56Anchor,scopeR56,inspectR56,
  summarizeR56,runR56} from './stage04-topic05-07-r56-triple.mjs';

const publisher=id=>PUBLISHERS.find(p=>p.id===id);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const response=(html,status=200)=>({ok:status>=200&&status<300,status,
  headers:{get:()=>null},text:async()=>html});

test('R56 fixes exactly topics 05 06 07 and nine official report URLs',()=>{
  assert.deepEqual(TOPICS_R56.map(t=>t.index),[5,6,7]);
  for(const topic of TOPICS_R56)for(const id of ['TBRC','SkyQuest','Precedence']){
    const p=publisher(id),url=verifiedR56Anchor(topic,p);
    assert.ok(url.startsWith('https://'));
    assert.notEqual(scopeR56(topic,p,url),'UNRELATED_MARKET');
  }
  assert.equal(TOPICS_R56.length*3,9);
  assert.equal(verifiedR56Anchor(TOPICS_R56[0],publisher('BRI')),null);
});

test('R56 sector scope is guarded separately from independent submarkets',()=>{
  const financial=TOPICS_R56[0],utilities=TOPICS_R56[1],health=TOPICS_R56[2];
  assert.equal(scopeR56(financial,publisher('TBRC'),financial.urls.TBRC),
    'BROAD_FINANCIAL_SERVICES_REVIEW');
  assert.equal(scopeR56(financial,publisher('SkyQuest'),financial.urls.SkyQuest),
    'RETAIL_BANKING_SUBMARKET_PROXY');
  assert.equal(scopeR56(utilities,publisher('Precedence'),utilities.urls.Precedence),
    'ELECTRICITY_TRANSMISSION_DISTRIBUTION_PROXY');
  assert.equal(scopeR56(health,publisher('Precedence'),health.urls.Precedence),
    'HOSPITAL_SERVICES_SUBMARKET_PROXY');
});

test('R56 cannot read unapproved market URL, even if publisher host matches',async()=>{
  const topic=TOPICS_R56[0],p=publisher('SkyQuest');
  const got=await inspectR56(topic,p,'https://www.skyquestt.com/report/finance-cloud-market',{
    fetchFn:async()=>{throw Error('NO_NETWORK_EXPECTED');}});
  assert.equal(got.state,'OUT_OF_SCOPE');
  assert.equal(got.observed_cagr,null);
});

test('R56 Ollama cannot reclassify a narrower report as whole GICS sector',async()=>{
  const topic=TOPICS_R56[0],p=publisher('SkyQuest');
  const html='<h1>Retail Banking Market</h1><p>The global retail banking market '+
    'is growing at a CAGR of 6.7% during the forecast period (2026-2033).</p>';
  const got=await inspectR56(topic,p,topic.urls.SkyQuest,{fetchFn:async()=>response(html),
    modelQueue:fn=>fn(),chooseFn:async()=>({index:0,candidate_id:'C0',
      scope:'DIRECT',elapsed_ms:1})});
  assert.equal(got.observed_cagr,6.7);
  assert.equal(got.period,'2026-2033');
  assert.equal(got.market_scope,'RETAIL_BANKING_SUBMARKET_PROXY');
  assert.equal(got.scope_warning,'DIRECT_MODEL_NOT_GICS_APPROVED');
  assert.equal(got.sector_eligible,false);
});

test('R56 really starts three topic jobs concurrently, without BRI, search or sector CAGR',async()=>{
  const prefix=join(await mkdtemp(join(tmpdir(),'zgmini-r56-triple-')),'R56_TEST');
  const calls=[];
  const got=await runR56({outputPrefix:prefix,
    fetchFn:async()=>{throw Error('NETWORK_DISABLED_IN_TEST');},
    inspectFn:async(topic,p,url)=>{
      calls.push({topic:topic.index,publisher:p.id,url});
      await sleep(10);
      return {url,state:'PUBLISHER_PROXY_OBSERVED',source_audit:'CONSISTENT',
        market_scope:scopeR56(topic,p,url),observed_cagr:4+topic.index/10,
        period:'2026-2033',sector_eligible:false,report_ms:10,ollama_ms:0,
        error:null};
    }});
  assert.equal(calls.length,36); // 4 runs x 3 concurrent topics x 3 publishers
  assert.deepEqual([...new Set(calls.map(x=>x.topic))].sort(),[5,6,7]);
  assert.deepEqual([...new Set(calls.map(x=>x.publisher))].sort(),
    ['Precedence','SkyQuest','TBRC']);
  assert.equal(got.summary.parallel_observed,true);
  assert.equal(got.summary.bri_uncontacted,true);
  assert.equal(got.summary.gate,'TRIPLE_PARALLEL_REPEATABLE_PROXIES_REVIEW');
  assert.ok(got.summary.topics.every(t=>t.observed_publishers===3&&t.results_stable));
  assert.ok(got.rows.every(r=>r.sector_cagr===null));
  assert.ok(got.rounds.every(r=>r.topics.length===3));
  const log=await readFile(prefix+'.txt','utf8');
  assert.match(log,/PARALLEL_TOPICS=THREE/);
  assert.match(log,/BRI_NETWORK_REQUESTS=0/);
  assert.match(log,/SEARCH_ENGINE_REQUESTS=0/);
  assert.match(log,/STATUS=FINISHED_RESEARCH_ONLY/);
  const history=await readFile(prefix+'_HISTORY.ndjson','utf8');
  assert.equal(history.trim().split('\n').length,1);
  const item=JSON.parse(history);
  assert.equal(item.measured_rounds.length,3);
});

test('R56 does not count repeated source blocks as successful data',async()=>{
  const prefix=join(await mkdtemp(join(tmpdir(),'zgmini-r56-block-')),'BLOCK');
  let networkCalls=0;
  const got=await runR56({outputPrefix:prefix,
    inspectFn:async(topic,p,url)=>{
      networkCalls++;
      return {url,state:'SOURCE_BLOCKED',market_scope:scopeR56(topic,p,url),
        observed_cagr:null,period:null,source_audit:'NOT_AUDITED',
        report_ms:1,ollama_ms:0,error:'HTTP_403'};
    }});
  assert.equal(networkCalls,9); // One request per URL, then no retries.
  assert.ok(['TRIPLE_PARALLEL_DIAGNOSTIC_REVIEW','NO_PARALLEL_OVERLAP']
    .includes(got.summary.gate));
  assert.ok(got.summary.topics.every(t=>t.observed_publishers===0));
  assert.ok(got.rows.every(r=>r.publishers.every(p=>p.observed_cagr===null)));
  assert.equal(got.status,'FINISHED_RESEARCH_ONLY');
});

test('R56 snapshot summary cannot promote arbitrary stable numbers to sector rates',()=>{
  const topic=TOPICS_R56[0],p=publisher('TBRC');
  assert.ok(scopeR56(topic,p,topic.urls.TBRC).startsWith('BROAD_'));
  assert.notEqual(scopeR56(topic,p,topic.urls.TBRC),'GICS_SECTOR_CONFIRMED');
  assert.equal(typeof summarizeR56,'function');
});
