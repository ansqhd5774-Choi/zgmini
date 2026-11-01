import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../scripts/pc-writer/local-cycle.mjs',import.meta.url),'utf8');
test('V9 shadow runs only in core lane after explicit opt-in, never in Korea lane',()=>{
 assert.match(source,/lane==='core'&&process\.env\.ZGMINI_R10_V9_SHADOW_ENABLED==='1'/);
 assert.match(source,/if\(breadthV9OptIn\)/);
 assert.match(source,/breadth-r10-v9-shadow-r1\.mjs/);
 assert.match(source,/--write-local/);
 assert.match(source,/SKIPPED_KOREA_LANE/);
 assert.match(source,/status:'DISABLED'/);
});
test('V9 shadow cannot gate existing collection or publication',()=>{
 assert.match(source,/researchBreadthR10V9Shadow/);
 assert.match(source,/nonBlocking:true/);
 assert.doesNotMatch(source,/if\(breadthV9ShadowRun\.status!==0\)process\.exitCode=1/);
 assert.match(source,/if\(publication\.status!==0\)process\.exitCode=1/);
});
test('published B1-R5 calculation path is not redirected to the shadow',()=>{
 assert.match(source,/run-local\.mjs/);
 assert.doesNotMatch(source,/publishBreadthR10V9/);
 assert.match(source,/local-breadth-r10-v9-shadow-last-run\.json/);
});
