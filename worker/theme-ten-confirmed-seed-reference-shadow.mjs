// PRIVATE / TEST-ONLY: independently checks fresh confirmed overlays without
// using the old L7 snapshot's score/date as a current public anchor.
// This file is intentionally NOT imported from a production route or writer.
import {THEME_NINE_R37_KEY,THEME_NINE_R37_ROSTER,eligibleNineR37}
 from './theme-nine-r37-public.mjs';
import {addVerifiedDcPower} from './theme-data-center-power-r1.mjs';
import {addVerifiedSpaceSatellite} from './theme-space-satellite-r1.mjs';

const SEED_KEY='public:theme-etf-only:r1';
const NAMES=THEME_NINE_R37_ROSTER.filter(x=>x.theme!=='AI·반도체').map(x=>x.theme);
const noPublic=(status,reason)=>({status,reason,publicReady:false,
 providerCalls:0,d1Writes:0,schedulerWrites:0,themes:[]});

async function row(db,table,key){
 try{return await db.prepare(`SELECT body,stored_at FROM ${table} WHERE ${table==='market_public_snapshots_v1'?'snapshot_key=?':"kind='output' AND feed_key=? AND snapshot_key='current'"}`)
  .bind(key).first();}
 catch{return null;}
}
function parsed(source){
 try{return source?JSON.parse(source.body):null;}
 catch{return null;}
}

/**
 * Probe only: must be invoked with the existing production L7 seed validator.
 * A stale but structurally approved seed can be a *reference*, NEVER output.
 * Missing/invalid seed and absent/invalid confirmed sidecars fail closed.
 * This does not confer vendor rights or authorize a new reader/API contract.
 */
export async function buildPrivateTenConfirmedSeedReferenceShadow(db,{now=Date.now(),
 validateLegacySeed}={}){
 if(typeof validateLegacySeed!=='function')
  return noPublic('PRIVATE_SHADOW_BLOCKED','LEGACY_SEED_VALIDATOR_REQUIRED');
 const seedRow=await row(db,'market_public_snapshots_v1',SEED_KEY);
 const seed=parsed(seedRow);
 let approvedSeed=false;
 try{approvedSeed=!!seed&&validateLegacySeed(seed)===true;}
 catch{approvedSeed=false;}
 if(!approvedSeed)
  return noPublic('PRIVATE_SHADOW_BLOCKED','LEGACY_SEED_REFERENCE_UNAVAILABLE');
 // No freshness check on the historical reference and no seed values in output.
 const reference={status:'READY',observationDate:seed.observationDate,
  confirmedObservationDate:seed.observationDate,phase:'CONFIRMED',
  themes:seed.themes.map(t=>({theme:t.theme,history:t.history}))};
 const r37Row=await row(db,'public_feed_snapshots_v1',THEME_NINE_R37_KEY);
 const r37=parsed(r37Row);
 if(r37?.phase!=='CONFIRMED'||!eligibleNineR37(r37,reference,
  {now,storedAt:Number(r37Row?.stored_at),independentAnchor:true}))
  return noPublic('PRIVATE_SHADOW_BLOCKED','R37_CONFIRMED_NOT_ELIGIBLE');
 const r37ByName=new Map(r37.themes.map(t=>[t.theme,t]));
 if(r37ByName.size!==9||NAMES.some(name=>!r37ByName.has(name)))
  return noPublic('PRIVATE_SHADOW_BLOCKED','R37_PUBLIC_EIGHT_NOT_FOUND');
 const base={status:'READY',phase:'CONFIRMED',observationDate:r37.observationDate,
  confirmedObservationDate:r37.observationDate,
  methodologyVersion:r37.methodologyVersion,
  sourceVersion:r37.sourceVersion??r37.version,
  sourceStoredAt:r37.sourceStoredAt,
  themes:NAMES.map(name=>{
   const t=r37ByName.get(name);
   return {theme:name,etfs:[...t.etfs],score:t.score,
    history:t.history.map(p=>({date:p.date,score:p.score}))};
  })};
 // Reuse exact R1/R2 production guards, which handle delayed (>=240 shared
 // dates), source provenance, R2 partial null history, and old R1 fallback.
 const dc=await addVerifiedDcPower(db,base,{now});
 if(dc===base||dc.themes.length!==9)
  return noPublic('PRIVATE_SHADOW_INCOMPLETE','DC_CONFIRMED_NOT_ELIGIBLE');
 const withSpace=await addVerifiedSpaceSatellite(db,dc,{now});
 if(withSpace===dc||withSpace.themes.length!==10||
  withSpace.themes.some((theme,i)=>theme.theme!==[...NAMES,'데이터센터·전력','우주·위성'][i]))
  return noPublic('PRIVATE_SHADOW_INCOMPLETE','SPACE_CONFIRMED_NOT_ELIGIBLE');
 return {status:'PRIVATE_CONFIRMED_SHADOW_VALIDATED_NOT_PUBLIC_READY',
  publicReady:false,phase:'CONFIRMED_ONLY',
  observationDate:r37.observationDate,
  sourceStoredAt:r37.sourceStoredAt,
  methodologyVersion:r37.methodologyVersion,
  riskNotice:'SOURCE_RIGHTS_AND_PRODUCTION_CUTOVER_NOT_INDEPENDENTLY_VERIFIED',
  providerCalls:0,d1Writes:0,schedulerWrites:0,
  themes:withSpace.themes};
}
