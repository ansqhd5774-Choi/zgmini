import test from 'node:test';
import assert from 'node:assert/strict';
import {buildProvisionalR4AnchorBackcast,rebuildVerifiedR4DailyHistory} from '../lib/iran-progress/retrospective-backcast-r4.mjs';
const DAY=86400000,HOUR=3600000;
const r3History=[
 {date:'2026-10-12',value:48.1,delta:-1.9},
 {date:'2026-10-13',value:47.3,delta:-.8},
 {date:'2026-10-14',value:43.4,delta:-3.9},
 {date:'2026-10-15',value:41.0,delta:-2.4},
 {date:'2026-10-16',value:39.5,delta:-1.5},
 {date:'2026-10-17',value:39.1,delta:-.4},
 {date:'2026-10-18',value:36.7,delta:-2.4},
];
const preview=()=>buildProvisionalR4AnchorBackcast({asOfDate:'2026-10-18',anchorScore:18,
 anchorReason:'Analyst provisional range 15 to 22',r3History});
test('18-point anchor reverses prior recorded differences without filling the arbitrary 50-point initialization',()=>{
 const result=preview();
 assert.equal(result.status,'ILLUSTRATIVE_ONLY');
 assert.equal(result.productionReady,false);assert.equal(result.cannotPublish,true);
 assert.deepEqual(result.history.slice(0,7).map(p=>p.value),Array(7).fill(null));
 assert.deepEqual(result.history.slice(7).map(p=>p.value),[29.4,28.6,24.7,22.3,20.8,20.4,18]);
 assert.equal(result.history.at(-1).date,'2026-10-18');
 assert.equal(result.history.at(-1).measured,false);
 assert.match(result.historyMode,/R3_NEWS_CHANGE_PROXY/);
 assert.match(result.notice,/not R4 historical truth/);
});
test('R3 initialization 50 is never reconstructed into a claim about earlier historical dates',()=>{
 const one=buildProvisionalR4AnchorBackcast({asOfDate:'2026-10-18',anchorScore:18,
  anchorReason:'Provisional independent analyst benchmark',r3History:r3History.slice(-2)});
 assert.equal(one.history.find(p=>p.date==='2026-10-16').value,null);
 assert.equal(one.history.find(p=>p.date==='2026-10-17').value,20.4);
});
test('retroactive estimates require an anchor-day event and valid chronological deltas',()=>{
 const t=buildProvisionalR4AnchorBackcast({asOfDate:'2026-10-18',anchorScore:18,
  anchorReason:'Provisional analyst point assessment',r3History:r3History.slice(0,-1)});
 assert.equal(t.status,'INSUFFICIENT_EVENT_DATE');
 assert.ok(t.history.every(p=>p.value===null));
 assert.throws(()=>buildProvisionalR4AnchorBackcast({asOfDate:'2026-10-18',anchorScore:18,
  anchorReason:'Provisional analyst point assessment',r3History:[r3History[1],r3History[0]]}),/INVALID/);
 assert.throws(()=>buildProvisionalR4AnchorBackcast({asOfDate:'2026-10-18',anchorScore:111,
  anchorReason:'Provisional analyst point assessment',r3History}),/INVALID/);
});
test('each genuine R4 backdated point must have a separately verified point-in-time input',()=>{
 const endDate='2026-10-18';
 const result=rebuildVerifiedR4DailyHistory({asOfDate:endDate,snapshots:[]});
 assert.equal(result.status,'REPLAY_PARTIAL');
 assert.equal(result.missingDates.length,14);
 assert.ok(result.history.every(p=>p.value===null&&!p.measured));
 assert.equal(result.anchoredToAnalystEstimate,false);
});
test('invalid snapshot never turns a missing R4 phase observation into historical 50 or 18',()=>{
 const date='2026-10-17',asOf=Date.parse(date+'T22:00:00Z');
 const out=rebuildVerifiedR4DailyHistory({asOfDate:'2026-10-18',
  snapshots:[{date,asOf,input:{}}]});
 assert.equal(out.status,'REPLAY_PARTIAL');
 const p=out.history.find(x=>x.date===date);
 assert.equal(p.value,null);assert.equal(p.measured,false);
 assert.equal(out.missingDates.length,14);
 assert.throws(()=>rebuildVerifiedR4DailyHistory({asOfDate:'2026-10-18',
  snapshots:[{date,asOf,input:{}},{date,asOf,input:{}}]}),/DUPLICATE/);
});
const refs=now=>[{sourceId:'FIXTURE',sourceKind:'OFFICIAL',url:'https://example.invalid/fixture',verified:true,observedAt:now-2*HOUR,verifiedAt:now-HOUR}];
const front=(id,now)=>({id,phase:'ACTIVE_COMBAT',phaseVerified:true,
 phaseObservedAt:now-2*HOUR,phaseVerifiedAt:now-HOUR,phaseEvidence:refs(now),coverageThrough:now-HOUR,
 diplomacyStage:1,ceasefireStatus:'ACTIVE_COMBAT',
 military:{verified:true,eventsDeduplicated:true,fullCoverageVerified:true,
 coverageFrom:now-28*DAY,coverageThrough:now-HOUR,coverageEvidence:refs(now),recentSeverity:7,priorSeverity:21}});
const route=(id,now)=>({id,incidentCoverage:{verified:true,eventsDeduplicated:true,complete28Days:true,
 from:now-28*DAY,through:now-HOUR,recentSeverity:2,priorSeverity:6,evidence:refs(now)},
 restriction:{verified:true,state:'MAJOR_RESTRICTIONS',officialStateVerified:true,
 observedAt:now-2*HOUR,verifiedAt:now-HOUR,evidence:refs(now)}});
function verifiedFixture(now){return{
 fronts:Object.fromEntries(['IRN_USA','IRN_ISR','YEMEN_HOUTHI'].map(id=>[id,front(id,now)])),
 maritime:{routes:Object.fromEntries(['HORMUZ','RED_SEA'].map(id=>[id,route(id,now)]))},
 nuclear:{verified:true,score:20,observedAt:now-2*HOUR,verifiedAt:now-HOUR,evidence:refs(now)},
};}
test('only independently verified daily R4 inputs may construct R4 retrospective scores',()=>{
 const date='2026-10-17',asOf=Date.parse(date+'T22:00:00Z');
 const result=rebuildVerifiedR4DailyHistory({asOfDate:'2026-10-18',
 snapshots:[{date,asOf,input:verifiedFixture(asOf)}]});
 assert.equal(result.status,'REPLAY_PARTIAL');
 const p=result.history.find(x=>x.date===date);
 assert.equal(p.measured,true);assert.ok(p.value>=25&&p.value<=39);
 assert.equal(result.history.find(x=>x.date==='2026-10-18').value,null);
 assert.equal(result.missingDates.length,13);
});
