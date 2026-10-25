// New-theme acceptance and private pair mixing. Existing approved nine are not
// screened or recalculated by this module. No network, storage, or D1 access.
const MIN_ADAPTIVE_SESSIONS=40;
const SAME_SCORE_SESSIONS=377;
const WEIGHT_RAMP=SAME_SCORE_SESSIONS-MIN_ADAPTIVE_SESSIONS;
const clamp=(x,min,max)=>Math.min(max,Math.max(min,x));

export function chooseNewThemeRoute({legacyQualified=false,adaptiveQualified=false}={}){
 if(typeof legacyQualified!=='boolean'||typeof adaptiveQualified!=='boolean')
  throw Error('THEME_R3_INVALID_ELIGIBILITY');
 // OR, with legacy precedence if both are satisfied.
 if(legacyQualified)return {accepted:true,route:'R188_LEGACY'};
 if(adaptiveQualified)return {accepted:true,route:'ADAPTIVE_R2'};
 return {accepted:false,route:'WATCH_PENDING_REAL_DATA'};
}

export function adaptivePairWeights({firstSessions,secondSessions,firstStatus,secondStatus}={}){
 for(const sessions of [firstSessions,secondSessions]){
  if(!Number.isInteger(sessions)||sessions<MIN_ADAPTIVE_SESSIONS)
   throw Error('THEME_R3_INSUFFICIENT_ACTUAL_SESSIONS');
 }
 for(const status of [firstStatus,secondStatus]){
  if(!['ADAPTIVE_PROVISIONAL','R188_COMPATIBLE'].includes(status))
   throw Error('THEME_R3_INVALID_SCORER_STATUS');
 }
 // Full 252-sample normalization of every metric is exactly R188 from day 377.
 // Do not label a gappy series as equivalent based on age alone.
 const firstAge=firstStatus==='R188_COMPATIBLE'?SAME_SCORE_SESSIONS:
  Math.min(firstSessions,SAME_SCORE_SESSIONS-1);
 const secondAge=secondStatus==='R188_COMPATIBLE'?SAME_SCORE_SESSIONS:
  Math.min(secondSessions,SAME_SCORE_SESSIONS-1);
 const first=clamp(.5+.2*(firstAge-secondAge)/WEIGHT_RAMP,.3,.7);
 return {first,second:1-first,firstEffectiveSessions:firstAge,
  secondEffectiveSessions:secondAge,method:'R3_RELATIVE_MATURITY_70_30_TO_50_50'};
}
