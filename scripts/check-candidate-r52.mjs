import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {candidateBranchGate} from './candidate-branch-gate.mjs';
candidateBranchGate();
const c=JSON.parse(readFileSync('dist/server/wrangler.json'));
assert.equal(c.name,'zgmini-migration-candidate-r5');
assert.equal(c.account_id,'6e9b57e718b247330a6efa42a9516e95');
assert.equal(c.workers_dev,true);
assert.deepEqual(c.routes,[]);assert.deepEqual(c.triggers.crons,[]);assert.deepEqual(c.d1_databases.map(({binding,database_id})=>({binding,database_id})),[{binding:'DB_CORE',database_id:'d7a25e98-8d52-47a4-9e37-695e4d84d18b'},{binding:'DB_HISTORY',database_id:'55f17650-dc84-46c9-829a-d448ca1b2417'}]);assert.deepEqual(c.vars,{});
assert.equal(c.images,undefined);assert.deepEqual(c.services,[]);
const bundle=readFileSync('dist/server/index.js','utf8');
assert(bundle.includes('CANDIDATE_WRITE_DISABLED')&&bundle.includes('DB_HISTORY')&&bundle.includes('DB_CORE'));
assert(!bundle.includes('zg-r55-gauge-ring'));
for(const file of readdirSync('dist/client/assets').filter(x=>x.endsWith('.css')))assert(!readFileSync('dist/client/assets/'+file,'utf8').includes('zg-r55-gauge-ring'));
await import('./check-production-source-identity.mjs');
console.log('PASS: R5 deployment contract, immutable Production application source, write guard, gauge DOM/CSS removal.');

assert.equal(c.queues.producers.length,1);assert.equal(c.queues.producers[0].binding,'PUBLIC_PROJECTION_QUEUE');assert.equal(c.queues.producers[0].queue,'zgmini-public-projection-r1');assert.equal(c.queues.consumers.length,1);assert.equal(c.queues.consumers[0].queue,'zgmini-public-projection-r1');
console.log('PASS R515C candidate Queue contract: no temporary cron/routes/runtime secrets');
