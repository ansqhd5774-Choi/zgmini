// Integration wiring guard for the read-only R4-C companion route.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EARNINGS_C_ROUTE,readEarningsCompanionResponse} from '../worker/earnings-companion-c-r4.mjs';

const source=readFileSync(new URL('../worker/index.ts',import.meta.url),'utf8');

test('Earnings R4-C GET is routed before the vinext fallback and reads only stored D1',()=>{
  assert.equal(EARNINGS_C_ROUTE,'/api/earnings-recession-indicators');
  assert.equal(typeof readEarningsCompanionResponse,'function');
  assert.ok(source.includes("import {EARNINGS_C_ROUTE,readEarningsCompanionResponse} from './earnings-companion-c-r4.mjs';"));
  const hook='if (url.pathname === EARNINGS_C_ROUTE) return readEarningsCompanionResponse(request,runtimeEnv.DB);';
  const hookIndex=source.indexOf(hook);
  const fallbackIndex=source.indexOf('return handler.fetch(request, env, ctx);');
  assert.ok(hookIndex>0,'reader hook must exist');
  assert.ok(fallbackIndex>hookIndex,'reader hook must execute before fallback');
  assert.equal(source.split(hook).length,2,'only one public read hook');
});
