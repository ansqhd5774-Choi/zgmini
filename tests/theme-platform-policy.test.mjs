import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {decideThemeAction,explainThemeBarrier,ROUTINE_ACTIONS} from '../scripts/pc-writer/theme-platform-policy.mjs';
const grant=JSON.parse(fs.readFileSync(new URL('../config/theme-platform-delegation.json',import.meta.url)));
test('routine approved operations do not demand repeated approvals',()=>{
 for(const action of ROUTINE_ACTIONS)assert.equal(decideThemeAction({action,grant,context:{existingBranch:true,branch:grant.workBranch}}).decision,'PROCEED');
});
test('delegation cannot substitute formula/input/rights/publication evidence',()=>{
 const base={selectionVerified:true,formulaVerified:true,inputVerified:true,rightsEvidenceValid:true,publicationApprovalValid:true,readerCompatible:true};
 assert.equal(decideThemeAction({action:'publish',grant,context:base}).decision,'PROCEED');
 for(const k of Object.keys(base))assert.notEqual(decideThemeAction({action:'publish',grant,context:{...base,[k]:false}}).decision,'PROCEED');
});
test('automation limitation supplies a manual path; lease/budget are waits, not runtime failure',()=>{
 assert.equal(decideThemeAction({action:'inspect',grant,context:{automationUnavailable:true}}).decision,'MANUAL_PATH');
 assert.equal(decideThemeAction({action:'collect',grant,context:{runningLease:true}}).decision,'WAIT');
 assert.equal(explainThemeBarrier('PROVIDER_BUDGET_EXHAUSTED').classification,'WAIT');
});
test('no broad authorization bypasses money, consent, secrets, deletion or protected branch',()=>{
 for(const flag of ['paidResourceChange','accountConsent','secretRequired','destructive'])
  assert.equal(decideThemeAction({action:'calculate',grant,context:{[flag]:true}}).decision,'NEEDS_USER');
 assert.equal(decideThemeAction({action:'push-existing-branch',grant,context:{existingBranch:true,protectedBranch:true}}).decision,'NEEDS_USER');
 assert.equal(decideThemeAction({action:'push-existing-branch',grant,context:{existingBranch:true,branch:'another-work'}}).decision,'NEEDS_USER');
});
