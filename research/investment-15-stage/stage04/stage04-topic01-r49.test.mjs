import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PUBLISHERS} from './stage04-four-publisher-r37-readonly.mjs';
import {
  ACTIVE_PUBLISHERS,EXCLUDED_PUBLISHERS,excludedBri,comparableMean,
  summarizeR49,runR49
} from './stage04-topic01-r49-three-media.mjs';

const mockResearch=async p=>({
  publisher:p.id,state:'NO_DIRECT_VERIFIED',selected:null,
  search:{engine:'MOCK_OFFICIAL_SEARCH',search_state:'SEARCH_INCOMPLETE',
    catalog_status:'OK',catalog_topic:0,candidate_urls:[],attempts:[]},
  inspections:[],search_ms:1,report_ms:0,ollama_ms:0,total_ms:1
});

test('R49 officially excludes BRI and retains exactly three live publishers',()=>{
  assert.deepEqual(ACTIVE_PUBLISHERS,['TBRC','SkyQuest','Precedence']);
  assert.deepEqual(EXCLUDED_PUBLISHERS,['BRI']);
  assert.equal(PUBLISHERS.length,4);
  const blocked=excludedBri();
  assert.equal(blocked.state,'SOURCE_BLOCKED_EXCLUDED');
  assert.equal(blocked.search.engine,'NO_NETWORK_REQUEST');
  assert.equal(blocked.selected,null);
});

test('R49 missing growth is NULL, not 0 or a fabricated mean',()=>{
  assert.deepEqual(comparableMean([]),{status:'NO_COMPARABLE_SOURCES',mean:null,count:0});
  assert.deepEqual(comparableMean([
    {publisher:'BRI',rate:null,eligible:false,market_basis:null,period:null},
    {publisher:'TBRC',rate:8.3,eligible:false,market_basis:null,period:'2026-2030'}
  ]),{status:'NO_COMPARABLE_SOURCES',mean:null,count:0});
});

test('R49 equal market basis and period use only eligible valid numeric rates',()=>{
  const result=comparableMean([
    {publisher:'A',rate:8,eligible:true,market_basis:'SAME_MARKET',period:'2026-2030'},
    {publisher:'BRI',rate:900,eligible:false,market_basis:'SAME_MARKET',period:'2026-2030'},
    {publisher:'B',rate:10,eligible:true,market_basis:'SAME_MARKET',period:'2026-2030'},
    {publisher:'C',rate:null,eligible:true,market_basis:'SAME_MARKET',period:'2026-2030'}
  ]);
  assert.equal(result.mean,9);
  assert.equal(result.count,2);
  assert.equal(result.status,'RESEARCH_MEAN_ONLY');
});

test('R49 refuses to blend different sector scopes or forecast years',()=>{
  for(const changed of [
    {market_basis:'TELECOM_PLUS_IT',period:'2026-2030'},
    {market_basis:'GICS_INFORMATION_TECHNOLOGY',period:'2027-2031'}
  ]){
    const result=comparableMean([
      {rate:8,eligible:true,market_basis:'GICS_INFORMATION_TECHNOLOGY',period:'2026-2030'},
      {rate:10,eligible:true,...changed}
    ]);
    assert.equal(result.status,'INCOMPATIBLE_MARKET_OR_PERIOD');
    assert.equal(result.mean,null);
  }
});

test('R49 three-publisher runner never invokes BRI and writes TXT/JSON',async()=>{
  const outputPrefix=join(await mkdtemp(join(tmpdir(),'zgmini-r49-test-')),'R49_TOPIC01');
  const invoked=[];
  const runner=await runR49({outputPrefix,
    fetchFn:async()=>{throw Error('UNEXPECTED_LIVE_FETCH');},
    researchFn:async p=>{invoked.push(p.id);return mockResearch(p);}
  });
  assert.equal(runner.rounds.length,4);
  assert.equal(invoked.length,12);
  assert.equal(invoked.includes('BRI'),false);
  assert.deepEqual(new Set(invoked),new Set(ACTIVE_PUBLISHERS));
  assert.equal(runner.summary.active_source_count,3);
  assert.equal(runner.summary.excluded_bri_uncontacted,true);
  assert.equal(runner.summary.active_attempted,true);
  assert.equal(runner.summary.all_four_attempted,false);
  assert.equal(runner.mean.mean,null);
  const txt=await readFile(outputPrefix+'.txt','utf8');
  const json=JSON.parse(await readFile(outputPrefix+'.json','utf8'));
  assert.match(txt,/BRI_NETWORK_REQUESTS=0/);
  assert.match(txt,/RESEARCH_AVERAGE=NULL/);
  assert.equal(json.averageInputs.find(x=>x.publisher==='BRI').rate,null);
  assert.equal(json.summary.unresolved_active_publishers.length,3);
  assert.equal(json.status,'FINISHED_RESEARCH_ONLY');
});

test('R49 rejects any excluded-BRI policy violation in diagnostics',()=>{
  const rounds=[1,2,3,4].map(index=>({warmup:index===1,total_ms:100,
    publishers:PUBLISHERS.map(p=>p.id==='BRI'?{
      ...excludedBri(),state:index===3?'SHOULD_NOT_CONTACT':'SOURCE_BLOCKED_EXCLUDED'
    }:{publisher:p.id,state:'NO_DIRECT_VERIFIED',selected:null,total_ms:1,
      search:{engine:'MOCK',search_state:'SEARCH_INCOMPLETE',catalog_status:'OK',
        catalog_topic:0,candidate_urls:[]},inspections:[]})}));
  assert.equal(summarizeR49(rounds).gate,'EXCLUDED_SOURCE_POLICY_VIOLATION');
});
