import test from 'node:test';
import assert from 'node:assert/strict';
import {
 IRAN_R4_MARITIME_METHOD,calculateR4MaritimeShadow,scoreR4MaritimeRoute
} from '../lib/iran-progress/maritime-official-r4.mjs';
const DAY=86400000,HOUR=3600000,now=Date.parse('2026-10-18T04:00:00Z');
const evidence=()=>[{sourceId:'OFFICIAL_FIXTURE',sourceKind:'OFFICIAL',url:'https://example.invalid/official-fixture',
 verified:true,observedAt:now-2*HOUR,verifiedAt:now-HOUR}];
function route(id){
 return {id,incidentCoverage:{verified:true,eventsDeduplicated:true,complete28Days:true,
  from:now-28*DAY,through:now-HOUR,recentSeverity:0,priorSeverity:0,
  recentMajorIncidentVerified:false,evidence:evidence()},
  restriction:{verified:true,state:'NORMAL_CONFIRMED',officialStateVerified:true,
   observedAt:now-2*HOUR,verifiedAt:now-HOUR,evidence:evidence(),
   restrictionsLiftedVerified:true,normalOperationVerified:true}};
}
const all=()=>({routes:{HORMUZ:route('HORMUZ'),RED_SEA:route('RED_SEA')}});
test('separately assessed Hormuz and Red Sea require complete verified official evidence',()=>{
 const m=calculateR4MaritimeShadow(all(),now);
 assert.equal(m.status,'SHADOW_READY');assert.equal(m.score,100);
 assert.equal(m.method,IRAN_R4_MARITIME_METHOD);
 assert.deepEqual(Object.keys(m.routes),['HORMUZ','RED_SEA']);
});
test('verified significant maritime attack caps one route and therefore the regional H score',()=>{
 const x=all();x.routes.HORMUZ.incidentCoverage.recentSeverity=10;
 x.routes.HORMUZ.incidentCoverage.recentMajorIncidentVerified=true;
 const result=calculateR4MaritimeShadow(x,now);
 assert.equal(result.status,'SHADOW_READY');
 assert.equal(result.routes.HORMUZ.score,25);
 assert.equal(result.score,25);
 assert.equal(result.routes.RED_SEA.score,100);
});
test('a hazard warning cannot masquerade as official closure',()=>{
 const x=all();x.routes.RED_SEA.restriction.officialStateVerified=false;
 const r=calculateR4MaritimeShadow(x,now);
 assert.equal(r.score,null);
 assert.equal(r.missing[0].reason,'OFFICIAL_RESTRICTION_UNVERIFIED');
});
test('no route data never implies safe maritime passage or zero incidents',()=>{
 const x=all();delete x.routes.HORMUZ;
 const r=calculateR4MaritimeShadow(x,now);
 assert.equal(r.status,'SHADOW_PENDING');assert.equal(r.score,null);
});
test('official confirmation of restrictions lifted without normal operations is not normal status',()=>{
 const r=route('HORMUZ');r.restriction.normalOperationVerified=false;
 assert.equal(scoreR4MaritimeRoute(r,now).score,null);
});
test('a stale official observation is not refreshed by the calculation time',()=>{
 const r=route('RED_SEA');r.restriction.verifiedAt=now-5*DAY;
 const result=scoreR4MaritimeRoute(r,now);
 assert.equal(result.status,'SHADOW_PENDING');assert.equal(result.score,null);
});
test('there is no AIS-based input field or third-party vessel-count prerequisite',()=>{
 const a=all();const h=calculateR4MaritimeShadow(a,now);
 assert.equal(h.status,'SHADOW_READY');
 assert.equal('ais' in h,false);assert.equal('vesselCount' in h,false);
 assert.equal('transit' in h,false);
});
