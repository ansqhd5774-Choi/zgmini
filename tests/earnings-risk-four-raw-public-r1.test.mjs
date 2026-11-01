import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RISK_R4_RAW_ROUTE,readRiskFourRawResponse}
 from '../worker/earnings-risk-four-raw-r1.mjs';

const route=readFileSync(new URL('../worker/candidate-r52.ts',import.meta.url),'utf8');
const guard=readFileSync(new URL('../worker/candidate-2db-guard.mjs',import.meta.url),'utf8');
const ui=readFileSync(new URL('../app/earnings-recession/earnings-risk-only-panel.tsx',import.meta.url),'utf8');

test('stored-only SEC raw reader precedes app fallback and is bound to read-only D1',()=>{
 assert.equal(RISK_R4_RAW_ROUTE,'/api/earnings-recession-risk-four-raw');
 assert.equal(typeof readRiskFourRawResponse,'function');
 const hook='if(path===RISK_R4_RAW_ROUTE)return readRiskFourRawResponse(request,env.DB_CORE);';
 assert.ok(route.includes("import {RISK_R4_RAW_ROUTE,readRiskFourRawResponse} from './earnings-risk-four-raw-r1.mjs';"));
 assert.equal(route.split(hook).length,2);
 assert.ok(route.indexOf(hook)<route.indexOf('return handler.fetch(request,env,ctx);'));
 assert.ok(guard.includes('readOnlyDatabase(native.DB_CORE)'));
});

test('desktop and mobile use raw percentages only on exact D1/diagnostic parity',()=>{
 assert.ok(ui.includes('useStoredIndex<RiskFourRawPayload>("/api/earnings-recession-risk-four-raw")'));
 assert.ok(ui.includes('riskRawUsable(riskRawPayload,payload)'));
 assert.ok(ui.includes('risk.riskFactorsSource==="E1_R4_STORED_PC_REPLAY"'));
 assert.ok(ui.includes('Math.abs(raw.diagnosticScore-risk.score)<1e-7'));
 assert.ok(ui.includes('Math.abs(row.score-raw.scoreFactors[index].score)<1e-7'));
 assert.ok(ui.includes('riskRawFormat(raw.previousValue)'));
 assert.ok(ui.includes('riskRawFormat(raw.value)'));
 assert.ok(ui.includes('CostSpark history={rawHistory}'));
 assert.equal((ui.match(/data-source=\{raw\?"sec-stored-r4-raw"/g)??[]).length,2);
 assert.ok(ui.includes('진단 점수'));
 assert.ok(ui.includes('사후 재구성'));
});
