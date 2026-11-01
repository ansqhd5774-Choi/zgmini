import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('R151 preserves original PC core runner: no ETF stage injected into live cycle',()=>{
 const code=fs.readFileSync('scripts/pc-writer/local-cycle.mjs','utf8');
 assert.doesNotMatch(code,/theme-etf-only-r150-local-stage\.mjs/);
 assert.doesNotMatch(code,/ZGMINI_THEME_ETF_PRIVATE_STAGE_ENABLED/);
 assert.match(code,/const publishAllowed=publicationPolicy\.publishAllowed;/);
 assert.match(code,/--collection-degraded/);
 assert.match(code,/const publication=spawnSync\(process\.execPath,\[path\.join\(here,'run-local\.mjs'\)/);
});
test('R150 staging remains a standalone opt-in script without provider or DB access',()=>{
 const code=fs.readFileSync('scripts/pc-writer/theme-etf-only-r150-local-stage.mjs','utf8');
 assert.match(code,/ZGMINI_THEME_ETF_PRIVATE_STAGE_ENABLED==='1'/);
 assert.match(code,/if\(!enabled\)report\.status='DISABLED'/);
 assert.match(code,/assertApprovedPcHome\(base\)/);
 assert.doesNotMatch(code,/\bfetch\s*\(/);
 assert.doesNotMatch(code,/\b\.prepare\s*\(/);
});
