import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PUBLISHERS} from './stage04-four-publisher-r37-readonly.mjs';
import {TOPICS,rankReport,marketScope,serialModelQueue,chooseR53,inspectR53,
  discoverR53,runR53} from './stage04-topic03-04-r53-parallel.mjs';

const pub=id=>PUBLISHERS.find(x=>x.id===id);
const third=TOPICS[0],fourth=TOPICS[1];
const industryUrl='https://www.thebusinessresearchcompany.com/report/industrial-machinery-global-market-report';
const skyIndustry='https://www.skyquestt.com/report/industrial-machinery-market';
const tbrcHtml=[
  '<h1>Industrial Machinery Market Report 2026</h1>',
  '<h2>What Is The Industrial Machinery Market Growth Forecast?</h2>',
  '<p>It will grow to $130.6 billion in 2030 at a compound annual growth rate (CAGR) of 6.9%.</p>',
  '<h2>Industrial Machinery Market Report Forecast Analysis</h2>',
  '<table><tr><td>Market Size Value In 2026</td><td>$100 billion</td></tr>',
  '<tr><td>Revenue Forecast In 2030</td><td>$130.6 billion</td></tr>',
  '<tr><td>Growth Rate</td><td>CAGR of 6.9% from 2026 to 2030</td></tr></table>'
].join('\n');
const response=(html,status=200)=>({ok:status>=200&&status<300,status,
  headers:{get:()=>null},text:async()=>html});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

test('R53 fixes topic identity and never confuses proxies with full sectors',()=>{
  assert.deepEqual(TOPICS.map(x=>x.index),[3,4]);
  assert.equal(third.name,'임의소비재(경기소비재)');
  assert.equal(fourth.name,'산업재');
  assert.equal(rankReport(fourth,industryUrl),250);
  assert.equal(rankReport(fourth,skyIndustry),250);
  assert.equal(marketScope(fourth,industryUrl,'Industrial Machinery Market Report'),'INDUSTRIALS_SUBMARKET_PROXY');
  assert.equal(rankReport(third,'https://www.skyquestt.com/report/consumer-staples-market'),0);
  assert.equal(marketScope(third,'https://www.skyquestt.com/report/consumer-durables-market',
    'Consumer Durables Market'),'DISCRETIONARY_SUBMARKET_PROXY');
  assert.equal(marketScope(third,'https://www.skyquestt.com/report/consumer-discretionary-market',
    'Consumer Discretionary Market'),'BROAD_SCOPE_REVIEW');
});

test('R53 constrained model output is candidate label, never literal percent as index',async()=>{
  const v=await chooseR53(fourth,pub('SkyQuest'),'Industrial Machinery Market',[
    {pct:6.9,excerpt:'global industrial machinery CAGR 6.9% forecast 2026-2030'}],
  {fetchFn:async (_url,opts)=>{
    const input=JSON.parse(opts.body);
    assert.deepEqual(input.format.properties.candidate_id.enum,['NONE','C0']);
    assert.match(input.prompt,/ENTIRE GICS Industrials/);
    return {ok:true,json:async()=>({response:'{"candidate_id":"C0","scope":"PROXY"}'})};
  }});
  assert.equal(v.index,0);
  assert.equal(v.candidate_id,'C0');
});

test('R53 TBRC industrial machinery: quoted rate retained but GICS aggregate NULL',async()=>{
  const found=await inspectR53(fourth,pub('TBRC'),industryUrl,{fetchFn:async()=>response(tbrcHtml),
    modelQueue:fn=>fn(),chooseFn:async()=>({index:0,candidate_id:'C0',scope:'DIRECT'})});
  assert.equal(found.state,'PUBLISHER_PROXY_OBSERVED');
  assert.equal(found.source_audit,'CONSISTENT');
  assert.equal(found.observed_cagr,6.9);
  assert.equal(found.period,'2026-2030');
  assert.equal(found.sector_eligible,false);
  assert.match(found.scope_warning,/OVERRIDDEN/);
});

test('R53 does not mistake an unaudited historical TBRC growth rate for forecast',async()=>{
  const html='<h1>Industrial Machinery Market Report</h1><p>Last year historic CAGR was 9.9%.</p>';
  const found=await inspectR53(fourth,pub('TBRC'),industryUrl,{fetchFn:async()=>response(html),
    modelQueue:fn=>fn(),chooseFn:async()=>{throw Error('DO_NOT_SELECT_HISTORIC_RATE');}});
  assert.equal(found.state,'SOURCE_AUDIT_INCOMPLETE');
  assert.equal(found.observed_cagr,null);
});

test('R53 public catalog and both public engines keep discovery separate from seed',async()=>{
  const found=await discoverR53(third,pub('SkyQuest'),null,{
    fetchFn:async()=>response('<a href="https://www.skyquestt.com/report/consumer-durables-market">Consumer Durables</a>'),
    searchFn:async()=>''});
  assert.equal(found.catalog_status,'OK');
  assert.equal(found.live_discovered_count,1);
  assert.equal(found.candidate_urls.length,1);
  assert.equal(found.seed_used,false);
  assert.equal(found.attempts.filter(x=>x.engine==='BING').length,3);
  assert.equal(found.attempts.filter(x=>x.engine==='GOOGLE').length,3);
});

test('R53 403 on an active publisher catalog skips later attempts, without bypass',async()=>{
  const skipped=new Set(),calls=[];
  const fetchFn=async url=>{calls.push(url);return response('',403);};
  const params={fetchFn,searchFn:async()=>'',blockedCatalogs:skipped};
  const first=await discoverR53(third,pub('SkyQuest'),null,params);
  const second=await discoverR53(third,pub('SkyQuest'),null,params);
  assert.match(first.catalog_status,/403/);
  assert.equal(second.catalog_status,'SKIPPED_PREVIOUS_CATALOG_BLOCK');
  assert.equal(calls.length,1);
});

test('R53 shared Ollama queue serializes only model work',async()=>{
  const q=serialModelQueue();let active=0,maxActive=0;
  await Promise.all([1,2,3,4].map(()=>q(async()=>{
    active++;maxActive=Math.max(maxActive,active);await sleep(4);active--;
  })));
  assert.equal(maxActive,1);
});

test('R53 full dual mock run actually overlaps topics and never calls BRI',async()=>{
  const prefix=join(await mkdtemp(join(tmpdir(),'zgmini-r53-test-')),'R53_DUAL');
  const calls=[];
  const result=await runR53({outputPrefix:prefix,
    fetchFn:async()=>{throw Error('UNEXPECTED_NETWORK');},
    researchFn:async(topic,p)=>{
      calls.push([topic.index,p.id]);
      await sleep(14);
      return {publisher:p.id,state:'NO_FORECAST_OBSERVED',
        search:{search_state:'SEED_ONLY_SEARCH_INCOMPLETE',attempts:[],
          live_discovered_count:0,candidate_urls:[]},
        inspections:[],selected:null,search_ms:1,report_ms:0,ollama_ms:0,total_ms:14};
    }});
  assert.equal(result.rounds.length,4);
  assert.deepEqual(new Set(calls.map(x=>x[0])),new Set([3,4]));
  assert.equal(calls.length,24);
  assert.equal(result.summary.bri_uncontacted,true);
  assert.equal(result.summary.parallel_observed,true);
  assert.ok(result.summary.parallel_overlap_ms.every(n=>n>0));
  assert.equal(result.rows.length,2);
  assert.ok(result.rows.every(x=>x.sector_cagr===null));
  const log=await readFile(prefix+'.txt','utf8');
  assert.match(log,/PARALLEL_OBSERVED=true/);
  assert.match(log,/BRI_NETWORK_REQUESTS=0/);
  const stored=JSON.parse(await readFile(prefix+'.json','utf8'));
  assert.equal(stored.status,'FINISHED_RESEARCH_ONLY');
  const history=(await readFile(prefix+'_HISTORY.ndjson','utf8')).trim().split('\n');
  assert.equal(history.length,1);
  assert.equal(JSON.parse(history[0]).rows.length,2);
});
