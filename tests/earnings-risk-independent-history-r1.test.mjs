import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedEarningsRiskTrend,EARNINGS_RISK_HISTORY_KIND} from '../lib/market-score/earnings-recession-history-r1.mjs';
const basis='EARNINGS_RECESSION_DIAGNOSTIC_R1';
const make=(date,score,method=basis)=>({snapshotKey:date,body:{asOfDate:date,diagnostics8:{earningsRecessionDefense:{status:'READY',score,methodologyVersion:method}},domains:[{id:'earnings',methodologyVersion:'E1-R5',score:73.5,trend:[{label:date,value:73.5}]}]}});
test('16 unversioned identical legacy scores are not proof of history',()=>{
 const snapshots=['2026-10-18','2026-10-19','2026-10-20'].map(date=>make(date,84.6875,null));
 assert.deepEqual(verifiedEarningsRiskTrend({snapshots,current:{asOfDate:'2026-10-20',score:84.6875,methodologyVersion:basis}}),{kind:'UNVERIFIED',points:[]});
});
test('risk-only method identity, score and current end-point must match; E1-R5 history cannot be substituted',()=>{
 const snapshots=[make('2026-10-18',64),make('2026-10-19',73),make('2026-10-20',84.6875)];
 const expected=verifiedEarningsRiskTrend({snapshots,current:{asOfDate:'2026-10-20',score:84.6875,methodologyVersion:basis}});
 assert.equal(expected.kind,EARNINGS_RISK_HISTORY_KIND);
 assert.deepEqual(expected.points.map(x=>x.score),[64,73,84.6875]);
 assert.equal(verifiedEarningsRiskTrend({snapshots,current:{asOfDate:'2026-10-20',score:85,methodologyVersion:basis}}).points.length,0);
 assert.equal(verifiedEarningsRiskTrend({snapshots,current:{asOfDate:'2026-10-20',score:73.5,methodologyVersion:'E1-R5'}}).points.length,0);
});
test('foreign methodology, invalid dates, and phantom latest values cannot pad one-year history',()=>{
 const data=[make('2025-09-15',80),make('2026-10-19',40,'EARNINGS_RECESSION_R0'),make('2026-10-20',84.6875)];
 const r=verifiedEarningsRiskTrend({snapshots:data,current:{asOfDate:'2026-10-20',score:84.6875,methodologyVersion:basis}});
 assert.deepEqual(r.points,[{date:'2026-10-20',score:84.6875}]);
 assert.equal(r.kind,EARNINGS_RISK_HISTORY_KIND);
});
