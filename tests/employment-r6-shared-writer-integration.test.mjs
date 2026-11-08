import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');

const r6=[
 'lib/market-score/employment-r4-bed-provider.mjs',
 'lib/market-score/employment-r4-shadow-store.mjs',
 'lib/market-score/employment-r6-collector.mjs',
 'lib/market-score/employment-r6-contract.mjs',
 'lib/market-score/employment-r6-feature-engine.mjs',
 'lib/market-score/employment-r6-observation-reader.mjs',
 'lib/market-score/employment-r6-provider.mjs',
 'lib/market-score/employment-r6-scheduler.mjs',
 'lib/market-score/employment-r6-store.mjs',
 'scripts/pc-writer/collect-local.mjs',
 'scripts/pc-writer/run-local.mjs',
 'lib/market-score/employment-r6-one-year-read-model.mjs',
 'lib/market-score/employment-r6-window.mjs',
 'scripts/pc-writer/employment-r6-auto-collection.mjs',
 'scripts/pc-writer/employment-r6-auto-publication.mjs',
 'scripts/pc-writer/employment-r6-candidate-locator.mjs',
 'scripts/pc-writer/employment-r6-one-year-stage.mjs',
 'scripts/pc-writer/employment-r6-pit-coverage.mjs',
 'worker/employment-r6-public-display.mjs',
];
const inflation=[
 'lib/inflation-causal-candidates-public-7-catalog.mjs',
 'worker/inflation-causal-candidates-public-7-r1.mjs',
 'worker/inflation-causal-candidates-public-7-writer-r1.mjs',
 'scripts/pc-writer/inflation-causal-candidates-public-7-preview-r1.mjs',
 'scripts/pc-writer/inflation-causal-candidates-public-7-auto-publication-r1.mjs',
 'scripts/pc-writer/independent-publication.mjs',
 'scripts/pc-writer/run-local.mjs',
];
const files=[...new Set([...r6,...inflation])];

test('R6 and inflation7 share exactly one run-local target in one 25-file overlay',()=>{
 assert.equal(r6.length,19);
 assert.equal(inflation.length,7);
 assert.equal(files.length,25);
 assert.equal(r6.filter(file=>inflation.includes(file)).join(), 'scripts/pc-writer/run-local.mjs');
 for(const file of files)assert.ok(fs.statSync(path.join(root,file)).isFile(),file);
});

test('R6 opt-ins do not replace inflation19, inflation7 or latest ER1 publication guards',()=>{
 const run=read('scripts/pc-writer/run-local.mjs');
 const collect=read('scripts/pc-writer/collect-local.mjs');
 const independent=read('scripts/pc-writer/independent-publication.mjs');
 for(const token of [
  'inflation-19-publication','inflation-7-publication',
  'employment-r6-one-year-publication','market-calendar-er1-future',
  'er1MonthlyD1Readback','retainRecentER1Readback',
  'assertER1ReadbackConsistent','er1FeedReadbacks',
 ])assert.ok(run.includes(token),'run-local missing '+token);
 for(const token of [
  'employmentR6OneYearAutoPublication===true',
  "import('./employment-r6-auto-publication.mjs')",
 ])assert.ok(run.includes(token),'R6 publication missing '+token);
 for(const token of [
  'employmentR6AutoCollection===true',
  "import('./employment-r6-auto-collection.mjs')",
 ])assert.ok(collect.includes(token),'R6 collection missing '+token);
 for(const token of [
  'retainRecentER1Readback','assertER1ReadbackConsistent',
  'LOCAL_FEED_PUBLICATION_MISMATCH','BODY_MISMATCH',
 ])assert.ok(independent.includes(token),'ER1 guard missing '+token);
});

test('all literal relative imports in the 25-file source candidate exist in latest-main tree',()=>{
 const missing=[];
 for(const file of files){
  const content=read(file);
  const pattern=/\b(?:from\s*|import\s*\(|require\s*\()\s*['"]((?:\.\/|\.\.\/)[^'"]+)['"]/g;
  for(const match of content.matchAll(pattern)){
   const target=path.resolve(root,path.dirname(file),match[1]);
   if(!target.startsWith(root+path.sep)||!fs.existsSync(target))missing.push({file,reference:match[1]});
  }
 }
 assert.deepEqual(missing,[]);
});
