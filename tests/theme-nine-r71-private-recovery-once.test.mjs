import {test} from 'node:test';
import assert from 'node:assert/strict';
import {r71Preflight,r71LogChange} from
  '../scripts/pc-writer/theme-nine-r71-private-recovery-once.mjs';

test('R71 rejects incomplete installed R48 chain before any provider call',()=>{
  const result=r71Preflight({root:'E:/fake',exists:path=>path.includes('R48_PRIVATE_CYCLE'),
    now:new Date('2026-10-29T06:00:00Z')});
  assert.equal(result.allRequiredPresent,false);
  assert.equal(result.canRun,false);
});

test('R71 avoids overlapping private and public Windows schedule times',()=>{
  const always=()=>true;
  assert.equal(r71Preflight({exists:always,now:new Date('2026-10-29T02:20:00Z')}).canRun,false);
  assert.equal(r71Preflight({exists:always,now:new Date('2026-10-29T04:45:00Z')}).canRun,false);
  assert.equal(r71Preflight({exists:always,now:new Date('2026-10-29T06:00:00Z')}).canRun,true);
});

test('R71 only attributes newly written logs to a new one-shot execution',()=>{
  const old={modifiedAt:'2026-10-28T17:16:15.465Z'};
  assert.equal(r71LogChange(old,old,'2026-10-29T05:00:00.000Z'),false);
  assert.equal(r71LogChange(old,{modifiedAt:'2026-10-29T05:00:03.000Z'},
    '2026-10-29T05:00:00.000Z'),true);
  assert.equal(r71LogChange(old,{modifiedAt:'2026-10-29T04:50:00.000Z'},
    '2026-10-29T05:00:00.000Z'),false);
});
