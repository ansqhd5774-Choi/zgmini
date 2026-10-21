import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const ui=readFileSync('app/dashboard-ui.tsx','utf8');
const riskDetail=readFileSync('app/inflation/inflation-panel.tsx','utf8');
const marketWriter=readFileSync('worker/market-score-r1.mjs','utf8');

test('risk Inflation dashboard uses the same stored R2 API as its detail page',()=>{
 assert.ok(ui.includes("useStoredIndex<{status:string;score:number|null;methodologyVersion?:string}>('/api/inflation-detail')"));
 assert.ok(riskDetail.includes("useStoredIndex<InflationPayload>('/api/inflation-detail')"));
 assert.ok(ui.includes("diagnosticKeys[index]==='inflationStability'?inflationRisk:"));
 assert.ok(ui.includes("const confirmedScore=diag?.status==='READY'&&validPublicScore(diag.score)?diag.score:null"));
 assert.ok(ui.includes("href:'/inflation/'"));
});
test('risk Inflation never falls back to the separate four-factor Price diagnostic or its arrow history',()=>{
 assert.ok(ui.includes("diagnosticKeys[index]==='inflationStability'||selected.provisional?null:<StoredScoreDirection"));
 assert.ok(marketWriter.includes('diagnostics8:diagnostics8(diagnostic?.snapshot)'));
 assert.ok(ui.includes("diagnosticKeys[index]==='assetBubbleSafety'?assetBubble"));
 assert.ok(ui.includes("diagnosticKeys[index]==='supplyShockSafety'?supplyShock"));
});
