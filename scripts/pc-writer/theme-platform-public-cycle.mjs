// Prepare the existing public owners for one physical-feed cycle. The 10
// currently approved logical themes share six legacy D1 keys; publishing once
// per logical theme would overwrite the same R37/R88 records repeatedly.
//
// This module is deliberately not wired into a scheduler or CLI. Its callers
// must supply the *existing* approved owner adapters and independently prove
// publication rights, source equivalence and Reader compatibility. In
// particular, an R37 owner publishes its original nine-theme record (which
// includes the AI research sidecar); it must never be rewritten as the eight
// public registry entries below.
import {ensure,validDate} from './theme-config-registry.mjs';
import {buildOperationalRegistry,planPhysicalFeeds} from './theme-platform-operational.mjs';
import {decideThemeAction} from './theme-platform-policy.mjs';

const kinds=['confirmed','provisional'];
// D1 CAS/readback is not proof that the production API/UI has refreshed.
const successful=new Set(['PUBLIC_API_VERIFIED']);
const pending=new Set(['D1_VERIFIED_AWAIT_PUBLIC_API_REFRESH',
 'D1_VERIFIED_PUBLIC_API_PENDING','D1_READBACK_VERIFIED_API_PENDING',
 'D1_READBACK_VERIFIED_PUBLIC_READER_PENDING','WRITTEN_AND_READBACK_VERIFIED',
 'UNCHANGED_READBACK_VERIFIED','UNCHANGED_NO_WRITE']);
const waiting=new Set(['NO_NEW_CONFIRMED_SESSION','NO_NEW_VERIFIED_PROVISIONAL',
 'WAIT_CONFIRMED_SOURCE','WAIT_PROVISIONAL_SOURCE','WAIT_CONFIRMED_REFRESH',
 'UNCHANGED']);

export function planPublicPhysicalCycle({sources,registrations=[]}={}){
 const registry=buildOperationalRegistry({sources,registrations});
 const publicThemes=registry.themes.filter(t=>t.enabled&&t.public);
 const themesById=new Map(publicThemes.map(t=>[t.id,t]));
 const groups=planPhysicalFeeds({themes:publicThemes}).map(group=>{
  const members=group.themeIds.map(id=>themesById.get(id));
  const family=members[0]?.operational?.family;
  ensure(members.length>0&&members.every(t=>t.operational?.owner==='existing-writer'&&
   t.operational.family===family&&t.methodologyVersion===members[0].methodologyVersion&&
   t.operational.physicalFeeds[group.kind]===group.feedKey),
  'THEME_PUBLIC_FEED_OWNER_OR_METHOD_CONFLICT');
  return {...group,family,methodologyVersion:members[0].methodologyVersion};
 });
 // Both phases must have their own legacy key. A mixed-phase key would turn
 // independent confirmed and provisional CAS operations into competing writes.
 ensure(groups.length===new Set(groups.map(g=>g.feedKey)).size,
  'THEME_PUBLIC_FEED_KEY_REUSED_ACROSS_PHASES');
 ensure(publicThemes.every(t=>kinds.every(kind=>
  groups.filter(g=>g.kind===kind&&g.themeIds.includes(t.id)).length===1)),
  'THEME_PUBLIC_PHASE_OWNERSHIP_INCOMPLETE');
 // Confirmed owners run before their corresponding provisional readers. The
 // order within a phase is the existing binding order, never a per-ID loop.
 groups.sort((a,b)=>kinds.indexOf(a.kind)-kinds.indexOf(b.kind));
 return {status:'PUBLIC_PHYSICAL_OWNER_PLAN_NOT_ACTIVATED',
  publicTargetIds:publicThemes.map(t=>t.id),groups,
  publicTargets:publicThemes.map(t=>({id:t.id,label:t.label})),
  publicPhaseCount:publicThemes.length*kinds.length,
  physicalFeedCount:groups.length,providerCalls:0,d1Writes:0,schedulerWrites:0};
}

// Compare an actual post-publication Reader result with the dynamic public
// registry. An owner-reported HTTP success is not by itself proof that the
// whole public list and both observation phases can be read by visitors.
export function verifyPublicPhysicalProjection({plan,feed}={}){
 if(!Array.isArray(plan?.publicTargets)||!plan.publicTargets.length)
  return {status:'PUBLIC_PLAN_REQUIRED'};
 const themes=feed?.themes;
 if(feed?.status!=='READY'||!Array.isArray(themes)||
  !Array.isArray(feed?.provisional?.points)||!feed.provisional.points.length)
  return {status:'PUBLIC_PROJECTION_NOT_READY'};
 const point=feed.provisional.points.at(-1);
 if(!validDate(point?.date)||!point?.scores||typeof point.scores!=='object')
  return {status:'PUBLIC_PROVISIONAL_POINT_INVALID'};
 const byName=new Map();
 for(const theme of themes){
  if(typeof theme?.theme!=='string'||byName.has(theme.theme))
   return {status:'PUBLIC_THEME_LABEL_DUPLICATED'};
  byName.set(theme.theme,theme);
 }
 const failures=[];
 for(const target of plan?.publicTargets??[]){
  const theme=byName.get(target.label);
  const history=theme?.history;
  const last=history?.at(-1);
  const score=theme?.score;
  const provisional=point.scores[target.label];
  if(!Array.isArray(history)||history.length!==252||
   history.some((p,i)=>!validDate(p?.date)||
    (i>0&&p.date<=history[i-1].date)||
    !Number.isFinite(p.score)||p.score<0||p.score>100)||
   !validDate(last?.date)||last.date>=point.date||
   Math.abs(last.score-score)>0.000001||
   !Number.isFinite(score)||score<0||score>100||
   !Number.isFinite(provisional)||provisional<0||provisional>100)
   failures.push({id:target.id,reason:'MISSING_OR_INVALID_CONFIRMED_PROVISIONAL'});
 }
 return {status:failures.length?'PUBLIC_PROJECTION_PARTIAL':'PUBLIC_PROJECTION_VERIFIED',
  publicTargetCount:plan?.publicTargets?.length??0,
  confirmedPhases:plan?.publicTargets?.length-failures.length,
  provisionalDate:point.date,failures};
}

// This opt-in dispatcher does not create D1 credentials, invoke a provider,
// change a scheduler, or claim that an owner has been installed. Only existing
// owner adapters, keyed by their EXACT physical feed keys, may be supplied.
// Unexpected/uncertain writer outcomes stop further writes, pending explicit
// CAS/readback reconciliation; they are never automatically retried.
export async function runPublicPhysicalCycle({sources,registrations=[],grant,
 contextByFeed={},owners={},allowPublish=false,readPublic=null}={}){
 const plan=planPublicPhysicalCycle({sources,registrations});
 if(!allowPublish)return plan;
 ensure(grant?.schema==='ZGMINI_THEME_DELEGATION_V1',
  'THEME_PUBLIC_GRANT_REQUIRED');
 // The six physical owners overlay the existing L7/R178 public Reader; none
 // refreshes its required base. An unavailable base would otherwise allow
 // confirmed D1 writes before R88 encounters a 503 and aborts the cycle.
 // A missing callback is not permission to skip the pre-write guard. The
 // existing R178 base can be stale even when all six owner feeds are valid.
 if(typeof readPublic!=='function')
  return {...plan,status:'PUBLIC_BASE_READER_UNAVAILABLE',
   reason:'PUBLIC_BASE_READER_CALLBACK_REQUIRED',
   completedGroups:0,verifiedGroups:0,results:[],projection:null};
 let baseline;
 try{baseline=await readPublic();}
 catch(error){return {...plan,status:'PUBLIC_BASE_READER_UNAVAILABLE',
  reason:error?.code??'PUBLIC_BASE_READER_QUERY_FAILED',
  completedGroups:0,verifiedGroups:0,results:[],projection:null};}
 if(baseline?.status!=='READY')
  return {...plan,status:'PUBLIC_BASE_READER_UNAVAILABLE',
   reason:baseline?.reason??'PUBLIC_BASE_READER_NOT_READY',
   completedGroups:0,verifiedGroups:0,results:[],projection:null};
 const results=[];
 let d1Writes=0;
 for(const group of plan.groups){
  const context=contextByFeed[group.feedKey]??{};
  const decision=decideThemeAction({action:'publish',grant,context});
  if(decision.decision!=='PROCEED'){
   results.push({...group,status:'BLOCKED',reason:decision.reason,
    d1Writes:0});
   continue;
  }
  const owner=owners[group.feedKey];
  if(typeof owner!=='function'){
   results.push({...group,status:'BLOCKED',reason:'EXISTING_PUBLIC_OWNER_NOT_CONNECTED',
    d1Writes:0});
   continue;
  }
  let report;
  try{
   // Deliberately pass no eight-theme replacement record to the R37 owner.
   // The approved owner retains responsibility for full historic payload,
   // CAS, source SHA, permission checks and public/D1 readback.
   report=await owner({feedKey:group.feedKey,kind:group.kind,
    family:group.family,methodologyVersion:group.methodologyVersion});
  }catch(error){
   results.push({...group,status:'STATE_UNKNOWN',
    reason:error?.code??'PUBLIC_OWNER_EXCEPTION_WRITE_STATE_UNKNOWN'});
   break;
  }
  const writes=report?.d1Writes;
  // A report that hides counts, exceeds one key write or collected a new
  // provider input cannot prove this stored-only physical-feed cycle.
  if(!Number.isSafeInteger(writes)||writes<0||writes>1||
   report?.providerCalls!==0||
   (report?.schedulerWrites!==undefined&&report.schedulerWrites!==0)){
   results.push({...group,status:'STATE_UNKNOWN',reason:'PUBLIC_OWNER_EFFECT_UNVERIFIED'});
   break;
  }
  d1Writes+=writes;
  const status=report.status;
  if(successful.has(status)||pending.has(status)||waiting.has(status)){
   results.push({...group,status:successful.has(status)?'VERIFIED':
    pending.has(status)?'PUBLIC_READBACK_PENDING':'SOURCE_WAIT',
    ownerStatus:status,d1Writes:writes});
   continue;
  }
  results.push({...group,status:'STATE_UNKNOWN',
   ownerStatus:status??null,reason:report?.reason??'PUBLIC_OWNER_OUTCOME_UNRECOGNIZED',
   d1Writes:writes});
  break;
 }
 const unknown=results.some(r=>r.status==='STATE_UNKNOWN');
 const ownersReady=!unknown&&results.length===plan.groups.length&&
  results.every(r=>r.status==='VERIFIED');
 let projection=null;
 if(ownersReady){
  try{projection=verifyPublicPhysicalProjection({plan,feed:await readPublic()});}
  catch(error){projection={status:'PUBLIC_READBACK_ERROR',
   reason:error?.code??'PUBLIC_READER_QUERY_FAILED'};}
 }
 return {status:unknown?'STATE_UNKNOWN_STOPPED':ownersReady&&
  projection?.status==='PUBLIC_PROJECTION_VERIFIED'?
   'PUBLIC_PHYSICAL_OWNER_CYCLE_VERIFIED':ownersReady?
   'PUBLIC_READBACK_PENDING':'PARTIAL_REVIEW_REQUIRED',
  publicTargetIds:plan.publicTargetIds,publicPhaseCount:plan.publicPhaseCount,
  physicalFeedCount:plan.physicalFeedCount,completedGroups:results.length,
  verifiedGroups:results.filter(r=>r.status==='VERIFIED').length,
  results,projection,providerCalls:0,d1Writes,schedulerWrites:0};
}
