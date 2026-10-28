import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BEA_MFG_ROUTE,readBeaMfgResponse} from '../worker/earnings-bea-manufacturing-profit-r1.mjs';

const candidate=readFileSync(new URL('../worker/candidate-r52.ts',import.meta.url),'utf8');
const guard=readFileSync(new URL('../worker/candidate-2db-guard.mjs',import.meta.url),'utf8');

test('BEA manufacturing stored-only route is wired before public app fallback',()=>{
  assert.equal(BEA_MFG_ROUTE,'/api/earnings-recession-bea-manufacturing-profit');
  assert.equal(typeof readBeaMfgResponse,'function');
  const importLine="import {BEA_MFG_ROUTE,readBeaMfgResponse} from './earnings-bea-manufacturing-profit-r1.mjs';";
  const hook='if(path===BEA_MFG_ROUTE)return readBeaMfgResponse(request,env.DB_CORE);';
  assert.ok(candidate.includes(importLine));
  assert.equal(candidate.split(hook).length,2,'only one BEA manufacturing hook');
  assert.ok(candidate.indexOf(hook)>candidate.indexOf('const http=candidate2dbWorker('));
  assert.ok(candidate.indexOf('return handler.fetch(request,env,ctx);')>candidate.indexOf(hook));
  assert.ok(guard.includes('readOnlyDatabase(native.DB_CORE)'),'candidate D1 binding must remain read-only');
});
