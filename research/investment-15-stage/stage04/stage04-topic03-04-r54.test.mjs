import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PUBLISHERS} from './stage04-four-publisher-r37-readonly.mjs';
import {TOPICS,rankReport,marketScope} from './stage04-topic03-04-r53-parallel.mjs';
import {verifiedAnchor,discoverR54,runR54,R54_METADATA} from './stage04-topic03-04-r54-first-party-anchors.mjs';

const pub=id=>PUBLISHERS.find(x=>x.id===id);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

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
