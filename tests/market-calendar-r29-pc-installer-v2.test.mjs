import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runR29} from '../scripts/pc-writer/market-calendar-r29-pc-apply-v2.mjs';

test('V2 refuses an unknown scheduled Core identity before any file mutation',()=>{
 const r=runR29({apply:true,getRoot:()=>null,getTask:()=>'',dataRoot:'/not-pc'});
 assert.equal(r.decision,'EXACT_CORE_ORIGIN_CHANGED_STOP');
 assert.deepEqual(r.changedFiles,[]);
 assert.equal(r.backupCreated,false);
 assert.equal(r.forcedCollection,false);
 assert.equal(r.publisherExecuted,false);
 assert.equal(r.gitPushed,false);
});

test('V2 stages only a private source hook on top of byte-verified R27 collector',()=>{
 const original=fs.readFileSync(new URL('../staging/market-calendar/r27-tic/scripts/pc-writer/release-calendar.mjs',import.meta.url),'utf8');
 const candidate=fs.readFileSync(new URL('../staging/market-calendar/r29-private/scripts/pc-writer/release-calendar.mjs',import.meta.url),'utf8');
 const expected=original
  .replace('// R27 PC-only candidate: preserve installed R26, add independent TIC events.\n// No new scheduler, collection trigger, publisher, or DB schema.\n',
   '// R29 PC private earnings extension; R27 official events remain unchanged.\n// No new task, DB table, forced collection or public vendor feed output.\n')
  .replace("import {marketOperationalStore} from '../../worker/market-operational-store.mjs';\n",
   "import {marketOperationalStore} from '../../worker/market-operational-store.mjs';\nimport {collectEarningsApiLocal} from './earnings-api-local.mjs';\n")
  .replace(' const store=publicFeedStore(db),locks=marketOperationalStore(db),key=RELEASE_CALENDAR_KEY;\n',
   " const store=publicFeedStore(db),locks=marketOperationalStore(db),key=RELEASE_CALENDAR_KEY;\n // PC private vendor raw inputs are independent from the R27 public calendar.\n try{\n  await collectEarningsApiLocal({db,apiKey:globalThis.__zgminiLocalProviderEnv?.EARNINGS_API_KEY,\n   now,fetchImpl});\n }catch{ /* Never let an optional vendor block official release collection. */ }\n");
 assert.equal(candidate,expected);
 assert.equal((candidate.match(/collectEarningsApiLocal\(/g)??[]).length,1);
 assert.ok(!candidate.includes('source=\'earnings\''));
});
