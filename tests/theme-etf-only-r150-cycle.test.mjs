import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('R150 is gated by opt-in and only the core lane',()=>{
 const code=fs.readFileSync('scripts/pc-writer/local-cycle.mjs','utf8');
 assert.match(code,/if\(lane==='core'&&process\.env\.ZGMINI_THEME_ETF_PRIVATE_STAGE_ENABLED==='1'\)/);
 assert.match(code,/theme-etf-only-r150-local-stage\.mjs'\),'--write-local'/);
 assert.match(code,/let themeEtfPrivateStage=\{nonBlocking:true,status:'DISABLED'\}/);
 assert.match(code,/const report=\{at:new Date\(\)\.toISOString\(\),themeEtfPrivateStage,lane,/);
});
test('existing publisher remains after private ETF stage and unchanged',()=>{
 const code=fs.readFileSync('scripts/pc-writer/local-cycle.mjs','utf8');
 assert.ok(code.indexOf("theme-etf-only-r150-local-stage.mjs")<code.indexOf("run-local.mjs"));
 assert.match(code,/const publishAllowed=publishRequested&&!quotaGuarded&&!collectionFailed;/);
 const stage=fs.readFileSync('scripts/pc-writer/theme-etf-only-r150-local-stage.mjs','utf8');
 assert.doesNotMatch(stage,/\bfetch\s*\(/);
 assert.doesNotMatch(stage,/\b\.prepare\s*\(/);
 assert.doesNotMatch(stage,/\bclient\s*\(/);
});
