import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const local=fs.readFileSync(new URL('../scripts/pc-writer/local-cycle.mjs',import.meta.url),'utf8');
const writer=fs.readFileSync(new URL('../scripts/pc-writer/run-local.mjs',import.meta.url),'utf8');

test('Core publishes the observed IEX 15m slot before slower general collection, through the existing Writer',()=>{
  const slot=local.indexOf("path.join(here,'us-breadth-provisional-cycle.mjs')");
  const general=local.indexOf("path.join(here,'collect-local.mjs')");
  const early=local.indexOf("path.join(here,'run-local.mjs')");
  const progressive=local.indexOf('await progressivePublication(');
  assert.ok(slot>0&&slot<early&&early<general&&general<progressive,
    'IEX input and early Writer readback must precede general Core collection');
  const guard=local.lastIndexOf("if(lane==='core')",slot);
  assert.ok(guard>0&&guard<slot);
  assert.match(local.slice(slot,general),/EXECUTION_NOT_VERIFIED/);
  assert.match(local.slice(slot,general),/--us-provisional-only/);
  assert.match(local.slice(slot,general),/--publish/);
});

test('provisional collector runs only once per Core invocation, remains independent of confirmed and Korea lanes',()=>{
  assert.equal(local.match(/path\.join\(here,'us-breadth-provisional-cycle\.mjs'\)/g)?.length,1);
  assert.match(local,/const lane=process\.argv\.includes\('--korea'\)\?'korea':'core';/);
  assert.match(local,/let usProvisional=null;/);
  assert.match(local,/let usProvisionalEarlyPublication=null;/);
  assert.match(local,/const report=\{at:.*?,usProvisional,usProvisionalEarlyPublication,sectorFearGreed,/);
  assert.match(local,/if\(publication\.status!==0\)process\.exitCode=1/);
  assert.doesNotMatch(local,/if\(usProvisional\?\.status!==.*?\)process\.exitCode=/);
  assert.doesNotMatch(local,/if\(usProvisionalEarlyPublication\?\.status!==.*?\)process\.exitCode=/);
});

test('provisional-only Writer keeps its normal approval gates and skips full SQLite/market work',()=>{
  const gate=writer.indexOf('if(publish){');
  const early=writer.indexOf("if(process.argv.includes('--us-provisional-only'))");
  const seed=writer.indexOf("const seed=read(path.join(base,'local-seed-progress.json'))");
  assert.ok(gate>0&&gate<early&&early<seed,
    'provisional-only Writer must be gated yet avoid lengthy full Writer calculations');
  const code=writer.slice(early,seed);
  assert.match(code,/prepareUsProvisional\(base\)/);
  assert.match(code,/publishUsProvisional\(remote,config\.core,prepared\)/);
  assert.match(code,/local-us-breadth-provisional-early-last-run\.json/);
  assert.doesNotMatch(code,/local-publication-ledger\.json|local-writer-last-run\.json/);
});
