import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RISK_R4_RAW_ROUTE,readRiskFourRawResponse}
 from '../worker/earnings-risk-four-raw-r1.mjs';

const route=readFileSync(new URL('../worker/candidate-r52.ts',import.meta.url),'utf8');
const guard=readFileSync(new URL('../worker/candidate-2db-guard.mjs',import.meta.url),'utf8');

test('stored-only SEC raw reader precedes app fallback and is bound to read-only D1',()=>{
 assert.equal(RISK_R4_RAW_ROUTE,'/api/earnings-recession-risk-four-raw');
 assert.equal(typeof readRiskFourRawResponse,'function');
 const hook='if(path===RISK_R4_RAW_ROUTE)return readRiskFourRawResponse(request,env.DB_CORE);';
 assert.ok(route.includes("import {RISK_R4_RAW_ROUTE,readRiskFourRawResponse} from './earnings-risk-four-raw-r1.mjs';"));
 assert.equal(route.split(hook).length,2);
 assert.ok(route.indexOf(hook)<route.indexOf('return handler.fetch(request,env,ctx);'));
 assert.ok(guard.includes('readOnlyDatabase(native.DB_CORE)'));
});
