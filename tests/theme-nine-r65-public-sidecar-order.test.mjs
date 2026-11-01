import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Regression for the 2026-10-29 production incident: a stale branch copy
// omitted the pre-existing Space/DC provisional readers, leaving the R37
// legacy 26/27 Oct score snapshot ineligible and shrinking public theme count.
test('R65 composes all published optional themes and provisional scores before R37',()=>{
 const source=readFileSync(new URL('../worker/theme-etf-only-public.mjs',import.meta.url),'utf8');
 const steps=[
  '=await addVerifiedBiotechTheme(',
  '=await addVerifiedBiotechContinuationR2(',
  '=await addVerifiedBiotechProvisionalR1(',
  '=await addVerifiedDcPower(',
  '=await addVerifiedSpaceSatellite(',
  '=await addVerifiedSpaceProvisionalR1(',
  '=await addVerifiedDcPowerProvisionalR1(',
  'return addVerifiedNineR37(',
 ];
 let previous=-1;
 for(const step of steps){
  const current=source.indexOf(step);
  assert.ok(current>previous,`missing or incorrectly ordered public reader: ${step}`);
  previous=current;
 }
 assert.match(source,/addVerifiedNineR37\(db,withDcProvisional,\{now:opts\.now\}\)/);
});
