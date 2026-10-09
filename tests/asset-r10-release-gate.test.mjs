import test from 'node:test';import assert from 'node:assert/strict';
import {assetR10PublicationDryRun} from '../lib/diagnostic-layer/asset-bubble-r10-release-gate.mjs';
import {ASSET_BUBBLE_R10_WEIGHTS} from '../lib/diagnostic-layer/asset-bubble-r10-candidate.mjs';
const ready=()=>({methodologyVersion:'ASSET_BUBBLE_R10_CANDIDATE',status:'READY',score:0,indicators:Object.keys(ASSET_BUBBLE_R10_WEIGHTS).map(id=>({id,status:'READY',score:0})),sourceVersion:'fixture',sourceStoredAt:1,rightsStatus:'CLEARED_FOR_DERIVED_PUBLICATION',lookAheadSafe:true,productionEligible:true});
test('valid zero score passes dry run without sending',()=>assert.deepEqual(assetR10PublicationDryRun(ready()),{status:'PASS',reasons:[],sent:false,providerRequests:0,dbWrites:0}));
test('null score never becomes zero',()=>assert.ok(assetR10PublicationDryRun({...ready(),score:null}).reasons.includes('COMPOSITE_NOT_READY')));
test('missing breadth is blocked',()=>{const p=ready();p.indicators.pop();assert.equal(assetR10PublicationDryRun(p).status,'BLOCKED');});
test('rights and time validation are separate gates',()=>{const p=ready();p.rightsStatus='RIGHTS_PENDING';p.lookAheadSafe=false;assert.deepEqual(assetR10PublicationDryRun(p).reasons,['RIGHTS_PENDING','AS_OF_VALIDATION_PENDING']);});
test('mismatched weighted total is blocked',()=>assert.ok(assetR10PublicationDryRun({...ready(),score:50}).reasons.includes('COMPOSITE_MISMATCH')));
test('out of range component is blocked',()=>{const p=ready();p.indicators[0].score=101;assert.equal(assetR10PublicationDryRun(p).status,'BLOCKED');});
test('explicit approved current vintage retains the unverified evidence labels',()=>{
 const p={...ready(),publicationPolicy:'USER_APPROVED_CURRENT_VINTAGE_UNVERIFIED_SOURCES',historyMode:'CURRENT_VINTAGE_ONLY',rightsStatus:'USER_ACCEPTED_UNVERIFIED',lookAheadSafe:false,priceQuality:'PROVIDER_DECLARED_WITH_QUARANTINE',scoreObservationQuarter:'2026-Q2',diagnosticQuarter:'2026-Q4',notes:['Latest complete quarter only','Not a point in time backtest']};
 assert.equal(assetR10PublicationDryRun(p).status,'PASS');
 assert.equal(assetR10PublicationDryRun({...p,notes:[]}).status,'BLOCKED');
 assert.equal(assetR10PublicationDryRun({...p,historyMode:'PIT'}).status,'BLOCKED');
 assert.equal(assetR10PublicationDryRun({...p,score:null}).status,'BLOCKED');
});
