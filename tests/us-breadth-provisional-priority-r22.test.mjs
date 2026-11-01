import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const local=fs.readFileSync(new URL('../scripts/pc-writer/local-cycle.mjs',import.meta.url),'utf8');

test('existing Core 5m task attempts IEX 15m collection ahead of slower general collection and publication',()=>{
  const slot=local.indexOf("path.join(here,'us-breadth-provisional-cycle.mjs')");
  const general=local.indexOf("path.join(here,'collect-local.mjs')");
  const early=local.indexOf('await progressivePublication(');
  const writer=local.indexOf("path.join(here,'run-local.mjs')");
  assert.ok(slot>0&&slot<general&&general<early&&early<writer,
    'IEX input must precede general collector and earliest possible run-local publication');
  const guard=local.lastIndexOf("if(lane==='core')",slot);
  assert.ok(guard>0&&guard<slot);
  assert.match(local.slice(slot,general),/EXECUTION_NOT_VERIFIED/);
});

test('provisional collector runs only once per Core invocation, remains independent of confirmed and Korea lanes',()=>{
  assert.equal(local.match(/path\.join\(here,'us-breadth-provisional-cycle\.mjs'\)/g)?.length,1);
  assert.match(local,/const lane=process\.argv\.includes\('--korea'\)\?'korea':'core';/);
  assert.match(local,/let usProvisional=null;/);
  assert.match(local,/const report=\{at:.*?,usProvisional,sectorFearGreed,/);
  assert.match(local,/if\(publication\.status!==0\)process\.exitCode=1/);
  assert.doesNotMatch(local,/if\(usProvisional\?\.status!==.*?\)process\.exitCode=/);
});
