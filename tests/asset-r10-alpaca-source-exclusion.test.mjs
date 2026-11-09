import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {assertR10BreadthSourceAllowed} from '../scripts/pc-writer/build-asset-r10-release.mjs';
import {additionalCollectionEntries} from '../scripts/pc-writer/additional-collection-health.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const script=path.resolve(here,'../scripts/pc-writer/build-asset-r10-release.mjs');

test('R10 excludes saved Alpaca B and refuses unapproved substitute sources',()=>{
 assert.throws(()=>assertR10BreadthSourceAllowed('ALPACA_IEX'),/R10_ALPACA_SOURCE_EXCLUDED/);
 assert.throws(()=>assertR10BreadthSourceAllowed('OTHER_UNAPPROVED'),/R10_BREADTH_SOURCE_NOT_APPROVED/);
});

test('R10 release cannot read or publish legacy Alpaca inputs',()=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'r10-source-exclusion-'));
 const run=spawnSync(process.execPath,[script,'--run-r10-release'],{
  encoding:'utf8',env:{...process.env,ZGMINI_PC_HOME:base},timeout:15_000,
 });
 assert.notEqual(run.status,0);
 assert.match(run.stderr,/R10_ALPACA_SOURCE_EXCLUDED/);
 assert.deepEqual(fs.readdirSync(base),[]);
});

test('R10 automatic Core no longer calls an Alpaca collector or activates its health job',()=>{
 const cycle=fs.readFileSync(path.resolve(here,'../scripts/pc-writer/local-cycle.mjs'),'utf8');
 assert.doesNotMatch(cycle,/collectAlpacaIncremental/);
 assert.match(cycle,/alpacaIncremental=\{status:'EXCLUDED_BY_USER',runRequests:0\}/);
 assert.equal(additionalCollectionEntries({alpaca:{status:'BLOCKED'}}).some(x=>x.id==='job:assetR10Alpaca'),false);
});
