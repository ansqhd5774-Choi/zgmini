import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const core=fs.readFileSync(
  new URL('../scripts/pc-writer/local-cycle.mjs',import.meta.url),'utf8');
const cycle=fs.readFileSync(
  new URL('../scripts/pc-writer/us-breadth-paid-r2-cycle.mjs',import.meta.url),'utf8');

test('US paid R2 uses existing Core publish lane after paid storage, no new Task',()=>{
  assert.match(core,/if\(lane==='core'&&process\.argv\.includes\('--publish'\)\)\{/);
  assert.match(core,/runPaidUsR2StoredCycle\(base,\{publish:true\}\)/);
  assert.match(core,/US_BREADTH_PAID_R2/);
  assert.ok(core.indexOf("collectPaidCurrent(base)")<
    core.indexOf("runPaidUsR2StoredCycle(base"));
  assert.ok(core.indexOf("runPaidBreadthCycle(base")<
    core.indexOf("runPaidUsR2StoredCycle(base"));
  assert.doesNotMatch(core,/--us-breadth-paid-r2/);
  assert.match(core,/CHECK_STORED_RESULT_BEFORE_RETRY/);
});
test('R2 Archive backfill reuses current Core paid collector budget and only publish lane',()=>{
  assert.match(core,/let paidCurrentResult=null/);
  assert.match(core,/paidCurrentResult=await collectPaidCurrent\(base\)/);
  assert.match(core,/planStoredPaidUsR2Backfill\(base\)/);
  assert.match(core,/checkApprovedPcRuntime\(base\)/);
  assert.match(core,/const budget=40-paidCurrentResult\.downloaded/);
  assert.match(core,/assetTypes:\['stock_daily'\]/);
  assert.match(core,/maxFiles:budget/);
  assert.match(core,/PAID_R2_BACKFILL_BUDGET_EXHAUSTED/);
  assert.match(core,/PAID_R2_CURRENT_COLLECTION_UNVERIFIED/);
  const historical=core.indexOf('planStoredPaidUsR2Backfill(base)');
  const current=core.indexOf('paidCurrentResult=await collectPaidCurrent(base)');
  const derived=core.indexOf('runPaidUsR2StoredCycle(base,{publish:true})');
  assert.ok(current>=0&&current<historical&&historical<derived);
  assert.equal(core.includes('--us-breadth-paid-r2-backfill'),false);
  assert.match(cycle,/export function checkApprovedPcRuntime\(base\)/);
});

test('unapproved Writer is checked before 250-day source scan',()=>{
  assert.match(cycle,/const installed=publish\?checkApprovedPcRuntime\(base\):null/);
  assert.match(cycle,/if\(publish&&!installed\.ok\)return stop\(installed\.status\)/);
  assert.ok(cycle.indexOf('const installed=publish?')<
    cycle.indexOf('calculateStoredPaidUsBreadthR2(base'));
  assert.match(cycle,/connection\?\.plan!=='full'/);
  assert.match(cycle,/config\.source!==source/);
  assert.match(cycle,/US_PAID_R2_LATEST_SESSION_NOT_STORED/);
});
