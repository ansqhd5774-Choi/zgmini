import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {auditR10PitIdentityLabels,R10_IDENTITY_EVIDENCE} from '../scripts/pc-writer/asset-r10-pit-identity-audit-r1.mjs';

const baseSymbols=Array.from({length:499},(_,i)=>`T${String(i).padStart(3,'0')}`);
const add=(symbol)=>[...baseSymbols,symbol];
const eventDigest='a'.repeat(64);
// This explicitly synthetic date grid has 501 weekday dates between the real
// overlap endpoints. It does NOT claim to reconstruct NYSE holidays or the
// approved artifact's exact 501 dates: production proof requires raw input.
function synthetic501Dates(){
 const weekdays=[];
 for(let ms=Date.parse('2024-10-07T00:00:00Z');ms<=Date.parse('2026-10-05T00:00:00Z');ms+=86400000){
  const d=new Date(ms),w=d.getUTCDay();
  if(w!==0&&w!==6)weekdays.push(d.toISOString().slice(0,10));
 }
 assert.equal(weekdays.length,521);
 const omitted=new Set(Array.from({length:20},(_,i)=>1+i*25));
 return weekdays.filter((_,i)=>!omitted.has(i));
}
function fixtures(dates,{approvedSymbol='PSKY',officialSymbol='SKYD'}={}){
 const approvedPit={verifiedThrough:dates.at(-1),eligibleUniverses:dates.map(tradeDate=>
  ({tradeDate,memberCount:500,members:add(approvedSymbol)}))};
 const officialPit={status:'READY',membershipLookAheadSafe:true,
  currentUniverseSurvivorshipBiasRemoved:true,publicMutation:false,eventDigest,
  universes:dates.map(tradeDate=>({tradeDate,memberCount:500,members:add(officialSymbol)}))};
 return {approvedPit,officialPit};
}
function readonly(result){
 assert.equal(result.canPromote,false);
 assert.equal(result.productionEligible,false);
 assert.equal(result.pcWrites,0);
 assert.equal(result.d1Writes,0);
 assert.equal(result.providerCalls,0);
 assert.equal(result.originalsPreserved,true);
}

test('official Nasdaq corporate-action CUSIPs and effective dates remain distinct',()=>{
 assert.equal(R10_IDENTITY_EVIDENCE.legacyClassB.ticker,'PARA');
 assert.equal(R10_IDENTITY_EVIDENCE.legacyClassB.cusip,'92556H206');
 assert.equal(R10_IDENTITY_EVIDENCE.legacyClassB.lastTradeDate,'2025-08-06');
 assert.equal(R10_IDENTITY_EVIDENCE.mergedClassB.ticker,'PSKY');
 assert.equal(R10_IDENTITY_EVIDENCE.mergedClassB.cusip,'69932A204');
 assert.equal(R10_IDENTITY_EVIDENCE.mergedClassB.firstTradeDate,'2025-08-07');
 assert.equal(R10_IDENTITY_EVIDENCE.renamedClassB.firstTradeDate,'2026-10-06');
 assert.notEqual(R10_IDENTITY_EVIDENCE.legacyClassB.cusip,R10_IDENTITY_EVIDENCE.mergedClassB.cusip);
});

test('pre-merger 2024-10-07 through 2025-08-06 remains unresolved, not PARA auto-backfill',()=>{
 const input=fixtures(['2024-10-07','2025-08-06']);
 const original=structuredClone(input);
 const result=auditR10PitIdentityLabels(input);
 readonly(result);
 assert.equal(result.status,'PIT_LABEL_IDENTITY_AUDITED_NOT_PROMOTABLE');
 assert.deepEqual(result.counts,{exact:0,preMerger:2,backcast:0,postRename:0,other:0});
 assert.ok(result.requires.includes('OFFICIAL_SP500_PRE_MERGER_MEMBERSHIP_AND_CUSIP'));
 assert.equal(result.samples[0].membershipRepaired,false);
 assert.deepEqual(input,original);
});

test('August 7, 2025 PSKY first trading and October 5, 2026 classify candidate SKYD backcast only',()=>{
 const result=auditR10PitIdentityLabels(fixtures(['2025-08-07','2026-10-05']));
 readonly(result);
 assert.equal(result.counts.backcast,2);
 assert.equal(result.counts.preMerger,0);
 assert.ok(result.samples.every(x=>x.kind==='RENAME_LABEL_BACKCAST_SUSPECT'));
 assert.ok(result.samples.every(x=>x.priceContinuityAllowed===false));
});

test('post-rename approved PSKY mismatch remains non-promotable',()=>{
 const result=auditR10PitIdentityLabels(fixtures(['2026-10-06']));
 readonly(result);
 assert.equal(result.counts.postRename,1);
 assert.equal(result.samples[0].kind,'APPROVED_PSKY_LABEL_AFTER_SKYD_RENAME');
});

test('any independent membership difference triggers strict halt',()=>{
 const input=fixtures(['2025-09-15']);
 input.officialPit.universes[0].members[7]='OTHER';
 const result=auditR10PitIdentityLabels(input);
 readonly(result);
 assert.equal(result.status,'PIT_ADDITIONAL_MEMBERSHIP_DRIFT');
 assert.equal(result.counts.other,1);
 assert.equal(result.samples[0].kind,'OTHER_MEMBERSHIP_DRIFT');
});

test('matching rows are still research diagnostics, not grant of production authority',()=>{
 const result=auditR10PitIdentityLabels(fixtures(['2025-12-31'],{officialSymbol:'PSKY'}));
 readonly(result);
 assert.equal(result.status,'PIT_LABEL_IDENTITY_AUDITED_NOT_PROMOTABLE');
 assert.equal(result.counts.exact,1);
});

test('duplicate members and invalid dates are rejected before comparison',()=>{
 const input=fixtures(['2025-09-15']);
 input.approvedPit.eligibleUniverses[0].members[0]='T001';
 const result=auditR10PitIdentityLabels(input);
 readonly(result);
 assert.equal(result.status,'PIT_ROW_INTEGRITY_INVALID');
 const bad=fixtures(['2025-02-30']);
 readonly(auditR10PitIdentityLabels(bad));
 assert.equal(auditR10PitIdentityLabels(bad).status,'R10_APPROVED_PIT_CONTRACT_INVALID');
});

test('official PIT trust flags, digest, and empty overlap fail closed',()=>{
 const input=fixtures(['2025-09-15']);
 input.officialPit.membershipLookAheadSafe=false;
 const result=auditR10PitIdentityLabels(input);
 readonly(result);
 assert.equal(result.status,'R7_OFFICIAL_PIT_CONTRACT_INVALID');
 const noOverlap=fixtures(['2025-09-15']);
 noOverlap.officialPit.universes[0].tradeDate='2025-09-16';
 const missing=auditR10PitIdentityLabels(noOverlap);
 readonly(missing);
 assert.equal(missing.status,'PIT_OVERLAP_MISSING');
});

test('mixed windows report exact boundaries and deterministic fingerprints without rewriting',()=>{
 const dates=['2024-10-07','2025-08-06','2025-08-07','2026-10-05','2026-10-06'];
 const input=fixtures(dates),snapshot=structuredClone(input);
 const a=auditR10PitIdentityLabels(input);
 const b=auditR10PitIdentityLabels(input);
 readonly(a);
 assert.deepEqual(a.counts,{exact:0,preMerger:2,backcast:2,postRename:1,other:0});
 assert.equal(a.overlapFirst,dates[0]);assert.equal(a.overlapLast,dates.at(-1));
 assert.equal(a.overlapDays,5);
 assert.equal(a.approvedMemberSeriesHash,b.approvedMemberSeriesHash);
 assert.equal(a.officialMemberSeriesHash,b.officialMemberSeriesHash);
 assert.deepEqual(input,snapshot);
});

test('source-event digest is retained separately from raw universe fingerprints',()=>{
 const input=fixtures(['2025-09-15']);
 const outcome=auditR10PitIdentityLabels(input);
 readonly(outcome);
 assert.equal(outcome.sourceEventDigest,input.officialPit.eventDigest);
 assert.notEqual(outcome.approvedMemberSeriesHash,outcome.officialMemberSeriesHash);
 assert.notEqual(outcome.approvedMemberSeriesHash,outcome.sourceEventDigest);
 assert.notEqual(outcome.officialMemberSeriesHash,outcome.sourceEventDigest);
 assert.equal(createHash('sha256').update(JSON.stringify('PSKY')).digest('hex'),
  'd1efa6c73ec39ec0fae1fc8e708e103a4ae4480b1acb60193ac7377cea2cc1e5');
 assert.equal(createHash('sha256').update(JSON.stringify('SKYD')).digest('hex'),
  '6035f1a40a98ea6d76d50d68e397912e031db5ce74c142a74d65f3690bc12f66');
});

test('raw series fingerprints do not depend on input row ordering',()=>{
 const original=fixtures(['2025-08-06','2025-08-07','2025-09-15']);
 const reversed=structuredClone(original);
 reversed.approvedPit.eligibleUniverses.reverse();
 reversed.officialPit.universes.reverse();
 const a=auditR10PitIdentityLabels(original),b=auditR10PitIdentityLabels(reversed);
 readonly(a);readonly(b);
 assert.equal(a.approvedMemberSeriesHash,b.approvedMemberSeriesHash);
 assert.equal(a.officialMemberSeriesHash,b.officialMemberSeriesHash);
 assert.deepEqual(a.counts,b.counts);
});

test('synthetic 501-date overlap diagnoses only PSKY versus SKYD with true endpoint bounds',()=>{
 const dates=synthetic501Dates();
 assert.equal(dates.length,501);
 const result=auditR10PitIdentityLabels(fixtures(dates));
 readonly(result);
 assert.equal(result.overlapDays,501);
 assert.equal(result.overlapFirst,'2024-10-07');
 assert.equal(result.overlapLast,'2026-10-05');
 assert.equal(result.counts.preMerger+result.counts.backcast,501);
 assert.equal(result.counts.exact,0);
 assert.equal(result.counts.other,0);
 assert.equal(result.counts.postRename,0);
});

test('independent third-symbol drift in synthetic 501-date overlap fails closed',()=>{
 const input=fixtures(synthetic501Dates());
 input.officialPit.universes[250].members[3]='UNRELATED';
 const result=auditR10PitIdentityLabels(input);
 readonly(result);
 assert.equal(result.status,'PIT_ADDITIONAL_MEMBERSHIP_DRIFT');
 assert.equal(result.counts.other,1);
 assert.equal(result.overlapDays,501);
 assert.equal(result.counts.preMerger+result.counts.backcast,500);
});

test('even exact 501-date synthetic universe match cannot override operational gates',()=>{
 const input=fixtures(synthetic501Dates(),{officialSymbol:'PSKY'});
 const result=auditR10PitIdentityLabels(input);
 readonly(result);
 assert.equal(result.overlapDays,501);
 assert.equal(result.counts.exact,501);
 assert.equal(result.status,'PIT_LABEL_IDENTITY_AUDITED_NOT_PROMOTABLE');
 assert.equal(result.approvedMemberSeriesHash,result.officialMemberSeriesHash);
});
