export const H_TRANSIT_METHOD='H_AIS_RESTRICTION_CONTINUITY_R1_3';
const DAY=86400000;
export const RESTRICTION_SCORES=Object.freeze({STOPPED:0,EMERGENCY_ESCORT_ONLY:25,RESTRICTED_COMMERCIAL:50,MAJOR_RESTRICTIONS_LIFTED:75,NORMAL_CONFIRMED:100});
export function transitContinuity(transit,now){
 if(transit?.method!==H_TRANSIT_METHOD||transit.source!=='hormuz.now'||transit.termsApproved!==true||transit.upstreamTermsVerified!==true)
  return {status:'PENDING',score:null,reason:'TRANSIT_CONTRACT_PENDING'};
 const end=Date.parse(transit.observationDate+'T00:00:00Z'),asOf=end+DAY;
 if(!Number.isSafeInteger(asOf)||asOf>now)return {status:'PENDING',score:null,reason:'INVALID_TRANSIT_OBSERVATION'};
 if(now-asOf>3*DAY)return {status:'STALE',score:null,reason:'TRANSIT_OBSERVATION_STALE',observationAt:asOf};
 const rows=new Map();
 for(const r of transit.rows??[]){if(rows.has(r.date))return {status:'PENDING',score:null,reason:'TRANSIT_DUPLICATE_DAY'};rows.set(r.date,r);}
 const values=[];
 for(let i=6;i>=0;i--){const date=new Date(end-i*DAY).toISOString().slice(0,10),r=rows.get(date);
  if(!r||r.source!=='live'||r.partial!==false||r.qualityVerified!==true||!Number.isSafeInteger(r.value)||r.value<0)
   return {status:'PENDING',score:null,reason:'TRANSIT_WINDOW_INCOMPLETE'};
  values.push(r.value);
 }
 const restriction=transit.restriction;
 if(restriction?.verified!==true||restriction.conflicting===true||restriction.materialPending===true
  ||!Object.hasOwn(RESTRICTION_SCORES,restriction.state)||!Number.isSafeInteger(restriction.lastVerifiedAt)
  ||restriction.lastVerifiedAt>now||now-restriction.lastVerifiedAt>DAY
  ||!Number.isSafeInteger(restriction.effectiveAt)||restriction.effectiveAt>asOf
  ||!Number.isSafeInteger(restriction.coverageThrough)||restriction.coverageThrough<asOf||restriction.coverageThrough>now
  ||!['UKMTO','MARAD'].every(id=>restriction.evidence?.some(e=>e.source===id&&e.verified===true&&typeof e.reference==='string'&&e.reference.length>0)))
  return {status:'PENDING',score:null,reason:'OFFICIAL_RESTRICTION_PENDING'};
 if(restriction.state==='NORMAL_CONFIRMED'&&(restriction.restrictionsLiftedVerified!==true||restriction.normalOperationVerified!==true))
  return {status:'PENDING',score:null,reason:'NORMAL_OPERATION_UNCONFIRMED'};
 const continuity=100*values.filter(n=>n>0).length/7,restrictionScore=RESTRICTION_SCORES[restriction.state];
 return {status:'READY',score:Math.min(restrictionScore,continuity),continuity,restrictionScore,
  dailyAverage:values.reduce((sum,n)=>sum+n,0)/7,observationAt:asOf,method:H_TRANSIT_METHOD,
  attribution:{name:'hormuz.now',url:'https://hormuz.now/data',license:'CC BY 4.0',modified:true},
  limitation:'AIS-visible commercial crossings only; continuity is not normal-volume recovery.'};
}
