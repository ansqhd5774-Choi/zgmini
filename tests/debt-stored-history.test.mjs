import test from 'node:test';
import assert from 'node:assert/strict';
import {debtStoredHistory} from '../worker/projection-builders/debt-stored-history.mjs';
import {requiresDebtHistoryRefresh} from '../scripts/pc-writer/debt-history-refresh.mjs';
const ids=['dsr','debtGdp','rateBurden','creditStress','debtServiceCapacity'];
const series=()=>Object.fromEntries(ids.map(id=>[id,[{observationDate:'2025-01-01',value:40},{observationDate:'2026-01-01',value:60}]]));
test('replays approved five-factor weights and anchors only a matching published current score',()=>{
 const s=series();s.creditStress.push({observationDate:'2026-05-01',value:80});
 const r=debtStoredHistory(s,'2026-06-01',63);
 assert.equal(r.scoreMatch,true);assert.equal(r.recalculatedScore,63);
 assert.deepEqual(r.trend,[{label:'2026-01-01',value:60},{label:'2026-05-01',value:63},{label:'2026-06-01',value:63}]);
});
test('future inputs never enter an earlier reconstructed point or current check',()=>{
 const s=series();s.dsr.push({observationDate:'2027-01-01',value:0});
 assert.equal(debtStoredHistory(s,'2026-06-01',60).recalculatedScore,60);
});
test('missing factor does not get reweighted or replaced by zero',()=>{
 const s=series();s.dsr=[];const r=debtStoredHistory(s,'2026-06-01',60);
 assert.equal(r.scoreMatch,false);assert.equal(r.recalculatedScore,null);assert.deepEqual(r.trend,[]);
});
test('mismatch with public score suppresses reconstructed history',()=>{assert.deepEqual(debtStoredHistory(series(),'2026-06-01',99).trend,[]);});
test('real zero values remain valid and duplicate source dates produce one point',()=>{
 const s=Object.fromEntries(ids.map(id=>[id,[{observationDate:'2026-01-01',value:0},{observationDate:'2026-01-01',value:0}]]));
 assert.deepEqual(debtStoredHistory(s,'2026-01-01',0).trend,[{label:'2026-01-01',value:0}]);
});
test('display refresh is once per history schema, including genuinely empty inputs',()=>{
 const envelope={payload:{status:'READY',methodologyVersion:'DEBT_RISK_R7',trend:[]}};
 assert.equal(requiresDebtHistoryRefresh(envelope),true);
 envelope.payload.historyPolicy='STORED_INPUTS_CURRENT_VINTAGE_LATEST_OBSERVATION_AT_OR_BEFORE_DATE_NO_INTERPOLATION';
 assert.equal(requiresDebtHistoryRefresh(envelope),false);
 assert.equal(requiresDebtHistoryRefresh({payload:{status:'PARTIAL'}}),false);
});
