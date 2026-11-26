import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import {secGuardOptionsFromEnv} from '../scripts/pc-writer/sec-guard-runtime-config.mjs';

test('SEC protection remains disabled without explicit operator enable',()=>{
 assert.deepEqual(secGuardOptionsFromEnv({}),{secSharedGuard:false});
 assert.deepEqual(secGuardOptionsFromEnv({ZGMINI_SEC_SHARED_GUARD_ENABLED:'false'}),{secSharedGuard:false});
});
test('invalid explicit SEC enable state fails closed',()=>{
 assert.throws(()=>secGuardOptionsFromEnv({ZGMINI_SEC_SHARED_GUARD_ENABLED:'yes'}),
  e=>e?.code==='SEC_GUARD_ENABLE_FLAG_INVALID');
});
test('enabled SEC protection without a shared root is rejected',()=>{
 assert.throws(()=>secGuardOptionsFromEnv({ZGMINI_SEC_SHARED_GUARD_ENABLED:'true'}),
  e=>e?.code==='SEC_GLOBAL_PERMIT_SCOPE_REQUIRED');
 assert.throws(()=>secGuardOptionsFromEnv({ZGMINI_SEC_SHARED_GUARD_ENABLED:'true',ZGMINI_SEC_SHARED_STATE_ROOT:'relative'}),
  e=>e?.code==='SEC_GLOBAL_PERMIT_SCOPE_REQUIRED');
});
test('multiple collectors select exactly the same canonical SEC root',()=>{
 const root=path.join(os.tmpdir(),'zgmini-sec-common');
 const options={ZGMINI_SEC_SHARED_GUARD_ENABLED:'true',ZGMINI_SEC_SHARED_STATE_ROOT:root};
 assert.deepEqual(secGuardOptionsFromEnv(options),{secSharedGuard:true,secSharedBase:path.resolve(root)});
 assert.equal(secGuardOptionsFromEnv(options).secSharedBase,secGuardOptionsFromEnv(options).secSharedBase);
});
