import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { executeR72 } from './run-ollama-forecast-r72-safe.mjs';

async function withTemp(run) {
  const dir = await mkdtemp(join(tmpdir(), 'zgmini-r72-test-'));
  try { await run(dir); } finally { await rm(dir, { recursive: true, force: true }); }
}

test('R72 creates both files even when an R71 module import fails', async () => {
  await withTemp(async outputDir => {
    const report = await executeR72({ outputDir,
      loadProgram: async () => { throw Error('ERR_MODULE_NOT_FOUND: run-ollama-forecast-r71.mjs'); } });
    assert.equal(report.run_state, 'EXECUTION_FAILED');
    const json = JSON.parse(await readFile(join(outputDir, 'R72_OLLAMA_FORECAST_PIPELINE_RESULT.json'), 'utf8'));
    const txt = await readFile(join(outputDir, 'R72_OLLAMA_FORECAST_PIPELINE_RESULT.txt'), 'utf8');
    assert.equal(json.results.length, 0);
    assert.match(json.fatal_error, /ERR_MODULE_NOT_FOUND/);
    assert.match(txt, /RUN_STATE=EXECUTION_FAILED/);
  });
});

test('R72 saves confirmed topic output and completion without faking research input', async () => {
  await withTemp(async outputDir => {
    const seen = [];
    const report = await executeR72({ outputDir, args: ['robotics', 'space'],
      loadProgram: async () => ({
        topicsFromArgs: args => args.map((keyword,i) => ({ keyword, id: String(i) })),
        r71Adapters: () => [{ id: 'TBRC' }, { id: 'SkyQuest' }, { id: 'Precedence' }],
        runR71: async topics => {
          seen.push(topics[0].keyword);
          return { results: [{ keyword: topics[0].keyword, mean_pct: null,
            source_count: 0, state: 'INSUFFICIENT_INDEPENDENT_PUBLISHERS',
            publishers: [], warnings: [] }] };
        }
      })
    });
    assert.equal(report.run_state, 'COMPLETED');
    assert.equal(report.topics_done, 2);
    assert.equal(report.means_calculable, 0);
    assert.equal(report.historical_cagr_used, false);
    assert.deepEqual(seen, ['robotics', 'space']);
    const json = JSON.parse(await readFile(join(outputDir, 'R72_OLLAMA_FORECAST_PIPELINE_RESULT.json'), 'utf8'));
    assert.deepEqual(json.configured_publishers, ['TBRC', 'SkyQuest', 'Precedence']);
    assert.equal(json.results.length, 2);
  });
});

test('R72 preserves completed topics when a later topic crashes', async () => {
  await withTemp(async outputDir => {
    let count = 0;
    const report = await executeR72({ outputDir,
      loadProgram: async () => ({
        topicsFromArgs: () => [{ id:'1',keyword:'robotics' },{ id:'2',keyword:'space' }],
        r71Adapters: () => [{id:'TBRC'}],
        runR71: async topics => {
          if (++count === 2) throw Error('SIMULATED_SECOND_TOPIC_FAILURE');
          return {results:[{keyword:topics[0].keyword,mean_pct:null,source_count:0,publishers:[]}]};
        }
      })
    });
    assert.equal(report.run_state, 'PARTIAL_ERROR');
    assert.equal(report.topics_done, 1);
    const json = JSON.parse(await readFile(join(outputDir, 'R72_OLLAMA_FORECAST_PIPELINE_RESULT.json'), 'utf8'));
    assert.equal(json.results[0].keyword,'robotics');
    assert.match(json.fatal_error,/SECOND_TOPIC_FAILURE/);
  });
});
