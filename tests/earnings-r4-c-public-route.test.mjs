// Production candidate route guard for the read-only R4-C companion.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EARNINGS_C_ROUTE,readEarningsCompanionResponse} from '../worker/earnings-companion-c-r4.mjs';

const source=readFileSync(new URL('../worker/candidate-r52.ts',import.meta.url),'utf8');
const guard=readFileSync(new URL('../worker/candidate-2db-guard.mjs',import.meta.url),'utf8');

test('R4-C public GET uses deployed candidate read-only DB_CORE before fallback',()=>{
  assert.equal(EARNINGS_C_ROUTE,'/api/earnings-recession-indicators');
  assert.equal(typeof readEarningsCompanionResponse,'function');
  assert.ok(source.includes("import {EARNINGS_C_ROUTE,readEarningsCompanionResponse} from './earnings-companion-c-r4.mjs';"));
  const hook='if(path===EARNINGS_C_ROUTE)return readEarningsCompanionResponse(request,env.DB_CORE);';
  const hookIndex=source.indexOf(hook);
  const fallbackIndex=source.indexOf('return handler.fetch(request,env,ctx);');
  assert.ok(hookIndex>0,'public reader must be registered on deployed candidate');
  assert.ok(fallbackIndex>hookIndex,'public reader must execute before fallback');
  assert.equal(source.split(hook).length,2,'exactly one public reader hook');
  assert.ok(source.includes('const http=candidate2dbWorker('),'candidate write guard must wrap route');
  assert.ok(guard.includes('DB_CORE:core'),'candidate read-only DB_CORE contract');
  assert.ok(guard.includes('readOnlyDatabase(native.DB_CORE)'),'native DB_CORE must be read-only');
});
