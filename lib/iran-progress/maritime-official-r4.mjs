/**
 * R4 maritime SHADOW: verified official restrictions + deduplicated verified incidents.
 * NO AIS / traffic count / hormuz.now / PortWatch calls or imports.
 * This is a pure, unapproved candidate formula and never triggers collection.
 */
export const IRAN_R4_MARITIME_METHOD='R4_OFFICIAL_INCIDENT_RESTRICTION_SHADOW_NO_AIS';
export const IRAN_R4_MARITIME_ROUTES=Object.freeze(['HORMUZ','RED_SEA']);
export const IRAN_R4_RESTRICTION_SCORES=Object.freeze({
 SHIPPING_SUSPENDED:0,EMERGENCY_ONLY:25,MAJOR_RESTRICTIONS:50,
 LARGELY_REOPENED:75,NORMAL_CONFIRMED:100,
});
const DAY=86400000;
const HOUR=3600000;
const time=n=>Number.isSafeInteger(n)&&n>0;
const validSources=(items,now)=>{
 if(!Array.isArray(items)||!items.length)return false;
 return items.every(x=>{
  try{const u=new URL(x.url);return x.verified===true&&
   ['OFFICIAL','INDEPENDENT_REPORT'].includes(x.sourceKind)&&typeof x.sourceId==='string'&&x.sourceId.length>0
   &&u.protocol==='https:'&&!u.username&&!u.password&&!u.port
   &&time(x.observedAt)&&time(x.verifiedAt)&&x.observedAt<=x.verifiedAt
   &&x.verifiedAt<=now&&now-x.verifiedAt<=72*HOUR;
  }catch{return false;}
 });
};
const pending=(route,reason)=>({status:'SHADOW_PENDING',score:null,route,reason,verified:false});
export function scoreR4MaritimeRoute(route,now){
 if(!route||!IRAN_R4_MARITIME_ROUTES.includes(route.id))return pending(route?.id??null,'ROUTE_UNSUPPORTED');
 const c=route.incidentCoverage,r=route.restriction;
 if(c?.verified!==true||c.eventsDeduplicated!==true||c.complete28Days!==true
  ||!time(c.from)||c.from>now-28*DAY||!time(c.through)||c.through>now||now-c.through>DAY
  ||![c.recentSeverity,c.priorSeverity].every(x=>Number.isFinite(x)&&x>=0)
  ||!validSources(c.evidence,now))return pending(route.id,'INCIDENT_COVERAGE_INCOMPLETE');
 if(r?.verified!==true||!Object.hasOwn(IRAN_R4_RESTRICTION_SCORES,r.state)
  ||!time(r.observedAt)||!time(r.verifiedAt)||r.observedAt>r.verifiedAt
  ||r.verifiedAt>now||now-r.verifiedAt>72*HOUR
  ||r.officialStateVerified!==true||!validSources(r.evidence,now))
  return pending(route.id,'OFFICIAL_RESTRICTION_UNVERIFIED');
 if(r.state==='NORMAL_CONFIRMED'&&(r.restrictionsLiftedVerified!==true||r.normalOperationVerified!==true))
  return pending(route.id,'NORMAL_OPERATION_NOT_VERIFIED');
 const a7=c.recentSeverity/7,a21=c.priorSeverity/21;
 const safety=100*Math.exp(-(0.7*a7+0.3*a21)/3);
 const restrictions=IRAN_R4_RESTRICTION_SCORES[r.state];
 // No ship-count inference; only verified safety and official navigational status.
 const raw=0.60*safety+0.40*restrictions;
 const cap=c.recentMajorIncidentVerified===true?25:c.recentSeverity>0?50:100;
 const score=Number(Math.min(raw,cap).toFixed(2));
 return {status:'SHADOW_READY',verified:true,route:route.id,score,safety:Number(safety.toFixed(2)),
  restrictionScore:restrictions,cap,observedAt:Math.min(c.through,r.observedAt),
  verifiedAt:Math.min(c.evidence[0].verifiedAt,r.verifiedAt),
  evidence:[...c.evidence,...r.evidence],method:IRAN_R4_MARITIME_METHOD};
}
export function calculateR4MaritimeShadow(input,now){
 const results=IRAN_R4_MARITIME_ROUTES.map(id=>scoreR4MaritimeRoute(input?.routes?.[id],now));
 const invalid=results.filter(r=>r.status!=='SHADOW_READY'||r.route!==IRAN_R4_MARITIME_ROUTES[results.indexOf(r)]);
 if(invalid.length)return {status:'SHADOW_PENDING',score:null,verified:false,
  missing:invalid.map(r=>({route:r.route,reason:r.reason??'INVALID_ROUTE_ID'})),method:IRAN_R4_MARITIME_METHOD};
 const score=Math.min(...results.map(x=>x.score));
 return {status:'SHADOW_READY',verified:true,score,method:IRAN_R4_MARITIME_METHOD,
  observedAt:Math.min(...results.map(x=>x.observedAt)),verifiedAt:Math.min(...results.map(x=>x.verifiedAt)),
  evidence:results.flatMap(x=>x.evidence),routes:Object.fromEntries(results.map(x=>[x.route,{score:x.score,safety:x.safety,
    restrictionScore:x.restrictionScore,cap:x.cap}]))};
}
