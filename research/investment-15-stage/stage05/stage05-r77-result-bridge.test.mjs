import test from 'node:test';
import assert from 'node:assert/strict';
import {readSavedR77Forecast,attachSavedR77ToStage05} from './stage05-r77-result-bridge.mjs';

const saved=()=>({
  report:'STAGE04_OLLAMA_FORECAST_PIPELINE_R72',
  publisher_adapter_revision:'R77_OFFICIAL_SITEMAP_DISCOVERY',
  run_state:'COMPLETED',fatal_error:null,topics_total:5,topics_done:5,
  means_calculable:1,last_updated_at:'2026-10-28T06:00:00Z',
  results:[
    {keyword:'data center',state:'COMPLETED',source_count:2,mean_pct:11.285,
      warnings:['SCOPE_REVIEW'],publishers:[
        {publisher:'SkyQuest',state:'PASS',growth_pct:11.51,
          report_url:'https://www.skyquestt.com/example',source_audit:'PASS'},
        {publisher:'Precedence Research',state:'PASS',growth_pct:11.06,
          report_url:'https://www.precedenceresearch.com/example',source_audit:'PASS'},
      ]},
    ...['nuclear reactor','industrial robot','industrial automation','AI semiconductor']
      .map(keyword=>({keyword,state:'COMPLETED',source_count:1,mean_pct:null,
        warnings:['INSUFFICIENT_SOURCES'],publishers:[]})),
  ],
});

const handoff=()=>({version:'STAGE05_USER_CONFIRMED_HANDOFF_R89',
  status:'BLOCKED_USER_CONFIRMATION_OR_PRIOR_RESULTS',ollamaInput:null});

test('saved R77 results are connected without replacing CAGR with a score',()=>{
  const report=readSavedR77Forecast(saved());
  assert.deepEqual(report.coverage,{topicsDone:5,topicsTotal:5,meansCalculable:1});
  assert.equal(report.topics[0].meanCagrPct,11.285);
  assert.equal(report.topics[0].publishers[0].cagrPct,11.51);
  assert.equal(report.topics[1].meanCagrPct,null);
  assert.equal(report.scoreStatus,'FORECAST_RESEARCH_ONLY');
});

test('Stage05 blocked scores stay blocked; saved forecast evidence remains visible',()=>{
  const result=attachSavedR77ToStage05({handoff:handoff(),savedR77:saved()});
  assert.equal(result.status,'BLOCKED_USER_CONFIRMATION_OR_PRIOR_RESULTS');
  assert.equal(result.ollamaInput,null);
  assert.equal(result.stage04SavedR77Forecast.topics[0].meanCagrPct,11.285);
});

test('ready Stage05 handoff carries R77 research into future Ollama input',()=>{
  const ready={...handoff(),status:'READY_FOR_OLLAMA_RESEARCH',
    ollamaInput:{candidates:[{themeId:'example',stage03Score:80}]}};
  const result=attachSavedR77ToStage05({handoff:ready,savedR77:saved()});
  assert.equal(result.ollamaInput.stage04SavedR77Forecast.coverage.topicsDone,5);
  assert.equal(result.ollamaInput.candidates[0].stage03Score,80);
});

test('incomplete R77 process, forged mean count or duplicate topics are rejected',()=>{
  const partial=saved();partial.run_state='PARTIAL_ERROR';
  assert.throws(()=>readSavedR77Forecast(partial),/NOT_COMPLETE/);
  const wrong=saved();wrong.means_calculable=5;
  assert.throws(()=>readSavedR77Forecast(wrong),/MEAN_COUNT_MISMATCH/);
  const duplicate=saved();duplicate.results[1].keyword='data center';
  assert.throws(()=>readSavedR77Forecast(duplicate),/TOPIC_INVALID/);
});

