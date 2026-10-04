import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {production2dbImportBoundary,productionHistoryReaders} from '../scripts/production-2db-import-boundary.mjs';

const root=process.cwd();
const plugin=production2dbImportBoundary(root);

test('production env import maps legacy DB to DB_CORE adapter',()=>{
 const id=path.join(root,'app','api','market-score','route.ts');
 const out=plugin.transform("import {env} from 'cloudflare:workers';\nexport const x=env.DB;",id);
 assert.match(out.code,/production-env-2db/);
 assert.doesNotMatch(out.code,/cloudflare:workers/);
});

test('KFG history readers route env.DB to DB_HISTORY',()=>{
 assert.ok(productionHistoryReaders.includes('worker/korea-funds.mjs'));
 const id=path.join(root,'worker','korea-funds.mjs');
 const out=plugin.transform("export const x=env.DB;",id);
 assert.match(out.code,/env\.DB_HISTORY/);
});

test('ordinary modules do not rewrite DB to history',()=>{
 const id=path.join(root,'worker','market-operational-refresh.mjs');
 const out=plugin.transform("export const x=env.DB;",id);
 assert.equal(out,null);
});
