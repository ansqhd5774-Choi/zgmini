import test from 'node:test';
import assert from 'node:assert/strict';
import {auditInputs} from '../scripts/iran-progress/input-audit-r14.mjs';
import {hash} from '../scripts/iran-progress/store.mjs';
const now=Date.parse('2026-10-09T00:00:00Z');
test('missing checkpoints stay pending and are not interpreted as zero',()=>{
 const r=auditInputs({},now);assert.equal(r.score,null);assert.deepEqual(r.missing,['D','C','M','H','N']);
 assert.equal(r.inputPresent,false);assert.equal(r.aisPolicyPresent,false);
});
test('AIS daily verification requires matching immutable row hash',()=>{
 const row={date:'2026-10-07',value:12,source:'live',partial:false,qualityVerified:false};
 const ais={rows:[row],observationDate:row.date},before=JSON.stringify(ais);
 const policy={upstreamTermsVerified:true,days:{[row.date]:{verified:true,rowHash:'wrong'}}};
 assert.equal(auditInputs({ais,policy},now).ais.qualityVerifiedRows,0);
 policy.days[row.date].rowHash=hash(row);
 const r=auditInputs({ais,policy},now);assert.equal(r.ais.qualityVerifiedRows,1);assert.equal(r.score,null);
 assert.equal(JSON.stringify(ais),before);
});
test('latest revision supersedes an older material pending review',()=>{
 const events=[{eventId:'A',revision:1,verifiedAt:now-2,status:'PENDING_REVIEW',material:true},
 {eventId:'A',revision:2,verifiedAt:now-1,status:'REJECTED',material:false}];
 assert.deepEqual(auditInputs({events},now).events.materialPending,[]);
});
