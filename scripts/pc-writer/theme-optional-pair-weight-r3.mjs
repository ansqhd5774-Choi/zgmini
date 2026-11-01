// New-theme acceptance and private pair mixing. Existing approved nine are not
// screened or recalculated by this module. No network, storage, or D1 access.
const MIN_ADAPTIVE_SESSIONS=40;
const SAME_SCORE_SESSIONS=377;
const FULL_HISTORY_SESSIONS=628;
const WEIGHT_RAMP=SAME_SCORE_SESSIONS-MIN_ADAPTIVE_SESSIONS;

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
 // The approved rule covers one fully seasoned (628+) ETF plus one young ETF.
 // Both-short, only partially compatible, and gappy series have NO approved mix.
 const firstLong=firstSessions>=FULL_HISTORY_SESSIONS&&firstStatus==='R188_COMPATIBLE';
 const secondLong=secondSessions>=FULL_HISTORY_SESSIONS&&secondStatus==='R188_COMPATIBLE';
 const firstParity=firstSessions>=SAME_SCORE_SESSIONS&&firstStatus==='R188_COMPATIBLE';
 const secondParity=secondSessions>=SAME_SCORE_SESSIONS&&secondStatus==='R188_COMPATIBLE';
 const ages=[Math.min(firstSessions,SAME_SCORE_SESSIONS),
  Math.min(secondSessions,SAME_SCORE_SESSIONS)];
 if((firstLong&&secondParity)||(secondLong&&firstParity)){
  return {first:.5,second:.5,firstEffectiveSessions:ages[0],
   secondEffectiveSessions:ages[1],method:'R3_APPROVED_BOTH_R188_COMPATIBLE_50_50'};
 }
 if(firstLong&&secondSessions<SAME_SCORE_SESSIONS&&secondStatus==='ADAPTIVE_PROVISIONAL'){
  const second=.30+.20*(secondSessions-MIN_ADAPTIVE_SESSIONS)/WEIGHT_RAMP;
  return {first:1-second,second,firstEffectiveSessions:ages[0],
   secondEffectiveSessions:ages[1],method:'R3_APPROVED_MIXED_70_30_TO_50_50'};
 }
 if(secondLong&&firstSessions<SAME_SCORE_SESSIONS&&firstStatus==='ADAPTIVE_PROVISIONAL'){
  const first=.30+.20*(firstSessions-MIN_ADAPTIVE_SESSIONS)/WEIGHT_RAMP;
  return {first,second:1-first,firstEffectiveSessions:ages[0],
   secondEffectiveSessions:ages[1],method:'R3_APPROVED_MIXED_70_30_TO_50_50'};
 }
 throw Error('THEME_R3_UNAPPROVED_PAIR_OR_INCOMPLETE_SOURCE');
}
