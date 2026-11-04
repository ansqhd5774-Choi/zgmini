import assert from 'node:assert/strict';
import test from 'node:test';
import {verifyThemeCutover,stageThemeCutover} from '../scripts/pc-writer/theme-platform-cutover.mjs';

const prior={id:'robotics',methodologyVersion:'R32',etfs:['BOTZ'],history:[{date:'2026-10-30',score:42}],
 provisional:{date:'2026-11-02',score:45}};
test('checks every legacy ID while allowing independently registered new IDs',()=>{
 const second={...prior,id:'space-satellite'};
 assert.deepEqual(verifyThemeCutover({legacy:[prior,second],candidates:[prior,{...prior,id:'new-theme'}]}),
  {status:'CUTOVER_BLOCKED',results:[{id:'robotics',status:'VERIFIED'},
   {id:'space-satellite',status:'BLOCKED',reason:'CANDIDATE_MISSING'}]});
});
test('rejects formula, roster and history changes before writer cutover',()=>{
 for(const [candidate,reason] of [
  [{...prior,methodologyVersion:'PAIR50'},'METHODOLOGY_MISMATCH'],
  [{...prior,etfs:['ROBO']},'ROSTER_MISMATCH'],
  [{...prior,history:[{date:'2026-10-30',score:43}]},'CONFIRMED_HISTORY_MISMATCH'],
  [{...prior,provisional:null},'PROVISIONAL_HISTORY_MISMATCH'],
 ]){
  assert.deepEqual(verifyThemeCutover({legacy:[prior],candidates:[candidate]}).results,
   [{id:'robotics',status:'BLOCKED',reason}]);
 }
 assert.throws(()=>verifyThemeCutover({legacy:[prior],candidates:[prior,prior]}),/DUPLICATE_ID/);
});
test('staging preserves rolled-off confirmed points and separate provisional data',()=>{
 const newer={...prior,history:[{date:'2026-11-03',score:49}],provisional:null};
 const result=stageThemeCutover({legacy:[prior],candidates:[newer]});
 assert.equal(result.status,'CUTOVER_INPUTS_VERIFIED');
 assert.deepEqual(result.candidates[0].history,[...prior.history,...newer.history]);
 assert.deepEqual(result.candidates[0].provisional,prior.provisional);
 assert.throws(()=>stageThemeCutover({legacy:[prior],candidates:[{...prior,history:[{...prior.history[0],score:1}]}]}),/CONFIRMED_CONFLICT/);
});
