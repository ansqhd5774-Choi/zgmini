import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PUBLISHERS} from './stage04-four-publisher-r37-readonly.mjs';
import {TOPICS,rankReport,marketScope,inspectR53} from './stage04-topic03-04-r53-parallel.mjs';
import {verifiedAnchor,discoverR54,runR54,R54_METADATA} from './stage04-topic03-04-r54-first-party-anchors.mjs';
import {runR55} from './stage04-topic03-r55-historic-mislabel-recheck.mjs';

const pub=id=>PUBLISHERS.find(x=>x.id===id);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const passengerCarUrl='https://www.thebusinessresearchcompany.com/report/passenger-car-global-market-report';
const tbrcMislabelHtml=`
<h1>Passenger Car Market Report 2026</h1>
<h2>What Is The Passenger Car Market Size and Share 2026?</h2>
<p>The passenger car market size has grown. It will grow from $1644.2 billion in 2025 to $1749.76 billion in 2026 at a compound annual growth rate (CAGR) of 6.4%.</p>
<h2>What Is The Passenger Car Market Growth Forecast?</h2>
<p>It will grow to $2325.31 billion in 2030 at a compound annual growth rate (CAGR) of 7.4%.</p>
<h2>Passenger Car Market Report Forecast Analysis</h2>
<table><tr><td>Market Size Value In 2026</td><td>$1749.76 billion</td></tr>
<tr><td>Revenue Forecast In 2030</td><td>$2325.31 billion</td></tr>
<tr><td>Growth Rate</td><td>CAGR of 6.4% from 2026 to 2030</td></tr></table>`;
const response=(html,status=200)=>({ok:status>=200&&status<300,status,
  headers:{get:()=>null},text:async()=>html});

test('R54 verified anchors all pass first-party URL and topic checks',()=>{
  for(const topic of TOPICS)for(const id of ['TBRC','SkyQuest','Precedence']){
    const url=verifiedAnchor(topic,pub(id));
    assert.ok(url.startsWith('https://'));
    assert.ok(rankReport(topic,url)>0);
  }
  assert.equal(R54_METADATA.bri_requests,0);
});

test('R54 passenger-car market is discretionary submarket, never whole GICS sector',()=>{
  for(const id of ['TBRC','SkyQuest','Precedence']){
    const url=verifiedAnchor(TOPICS[0],pub(id));
    assert.equal(marketScope(TOPICS[0],url,'Passenger Cars Market'),
      'DISCRETIONARY_SUBMARKET_PROXY');
  }
});

test('R54 industrial machinery and machine tools are submarkets, not whole sector',()=>{
  for(const id of ['TBRC','SkyQuest','Precedence']){
    const url=verifiedAnchor(TOPICS[1],pub(id));
    assert.equal(marketScope(TOPICS[1],url,'Industrial Machinery Market'),
      'INDUSTRIALS_SUBMARKET_PROXY');
  }
});

test('R54 direct anchor discovery makes zero network requests',async()=>{
  for(const topic of TOPICS)for(const id of ['TBRC','SkyQuest','Precedence']){
    const out=await discoverR54(topic,pub(id));
    assert.equal(out.candidate_urls.length,1);
    assert.equal(out.live_discovered_count,0);
    assert.equal(out.verified_anchor_count,1);
    assert.equal(out.catalog_status,'NOT_REQUESTED');
    assert.equal(out.search_state,'VERIFIED_STATIC_ANCHOR_NOT_LIVE_SEARCH');
  }
});

test('R55 recognizes independently proven historic-rate repetition without using a false forecast',async()=>{
  const actual=await inspectR53(TOPICS[0],pub('TBRC'),passengerCarUrl,{
    fetchFn:async()=>response(tbrcMislabelHtml),modelQueue:fn=>fn(),
    chooseFn:async()=>({index:0,candidate_id:'C0',scope:'PROXY',elapsed_ms:1})});
  assert.equal(actual.source_audit,'RESOLVED_HISTORIC_RATE_MISLABEL');
  assert.equal(actual.observed_cagr,7.4);
  assert.equal(actual.period,'2026-2030');
  assert.equal(actual.state,'PUBLISHER_PROXY_OBSERVED');
  assert.equal(actual.sector_eligible,false);
});

test('R55 does not repair an arbitrary disagreeing publisher metadata number',async()=>{
  const bad=tbrcMislabelHtml.replace('CAGR of 6.4% from 2026 to 2030',
    'CAGR of 2.1% from 2026 to 2030');
  const actual=await inspectR53(TOPICS[0],pub('TBRC'),passengerCarUrl,{
    fetchFn:async()=>response(bad),modelQueue:fn=>fn(),
    chooseFn:async()=>{throw Error('MODEL_NOT_ALLOWED_ON_SOURCE_CONFLICT');}});
  assert.equal(actual.source_audit,'SOURCE_CONFLICT');
  assert.equal(actual.observed_cagr,null);
});

test('R54 2-topic concurrent run inspects six live publisher URLs and leaves aggregates NULL',async()=>{
  const outdir=await mkdtemp(join(tmpdir(),'zgmini-r54-test-'));
  const prefix=join(outdir,'R54_TEST'),calls=[];
  const result=await runR54({outputPrefix:prefix,
    fetchFn:async()=>{throw Error('NO_NETWORK_IN_UNIT_TEST');},
    inspectFn:async(topic,p,url)=>{
      calls.push({topic:topic.index,id:p.id,url});await sleep(8);
      return {url,state:'PUBLISHER_PROXY_OBSERVED',market_scope:topic.index===3?
        'DISCRETIONARY_SUBMARKET_PROXY':'INDUSTRIALS_SUBMARKET_PROXY',
        observed_cagr:5.0,period:'2026-2033',source_audit:'CONSISTENT',
        sector_eligible:false,report_ms:8,ollama_ms:0};
    }});
  assert.equal(calls.length,24); // 4 rounds x 2 topics x 3 publishers
  assert.equal(result.summary.parallel_observed,true);
  assert.equal(result.summary.bri_uncontacted,true);
  assert.ok(result.rows.every(r=>r.sector_cagr===null));
  assert.deepEqual([...new Set(calls.map(x=>x.topic))],[3,4]);
  assert.deepEqual([...new Set(calls.map(x=>x.id))],['TBRC','SkyQuest','Precedence']);
  const log=await readFile(prefix+'.txt','utf8');
  assert.match(log,/REPORT=R54_STAGE04_/);
  assert.match(log,/BRI_NETWORK_REQUESTS=0/);
  assert.match(log,/VERIFIED_STATIC_ANCHOR_NOT_LIVE_SEARCH/);
});

test('R55 single-report PC mock repeats true future CAGR without contacting other sites',async()=>{
  const prefix=join(await mkdtemp(join(tmpdir(),'zgmini-r55-test-')),'R55_TEST');
  const calls=[];
  const out=await runR55({outputPrefix:prefix,fetchFn:async(url,opts)=>{
    calls.push(url);
    if(url.startsWith('http://127.0.0.1:11434')){
      const body=JSON.parse(opts.body);
      assert.match(body.prompt,/Passenger Car Market/);
      return {ok:true,json:async()=>({response:'{"candidate_id":"C0","scope":"PROXY"}'})};
    }
    assert.equal(url,passengerCarUrl);
    return response(tbrcMislabelHtml);
  }});
  assert.equal(out.summary.state,'SOURCE_EXCEPTION_EXPLAINED_REPEATABLE');
  assert.equal(out.summary.observed_cagr,7.4);
  assert.equal(out.summary.sector_cagr,null);
  assert.equal(out.rounds.length,4);
  assert.equal(calls.filter(x=>x===passengerCarUrl).length,4);
  assert.equal(calls.filter(x=>x.startsWith('http://127.0.0.1:11434')).length,4);
  assert.ok(out.rounds.every(x=>x.source_evidence?.forecast_table_pct===6.4));
  const log=await readFile(prefix+'.txt','utf8');
  assert.match(log,/BRI_NETWORK_REQUESTS=0/);
  assert.match(log,/SUMMARY=SOURCE_EXCEPTION_EXPLAINED_REPEATABLE CAGR=7.4/);
});
