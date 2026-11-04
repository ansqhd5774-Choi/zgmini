import {ensure,validDate} from './theme-config-registry.mjs';

// Check the cutover candidate against the existing public feed before changing
// writer ownership. Each candidate must use the same canonical public ID.
export function verifyThemeCutover({legacy,candidates}){
 const index=rows=>{
  ensure(Array.isArray(rows),'THEME_CUTOVER_ROWS_REQUIRED');
  const byId=new Map();
  for(const row of rows){
   ensure(typeof row?.id==='string'&&row.id&&!byId.has(row.id),'THEME_CUTOVER_INVALID_OR_DUPLICATE_ID');
   byId.set(row.id,row);
  }
  return byId;
 };
 const before=index(legacy),after=index(candidates);
 ensure(before.size>0,'THEME_CUTOVER_EMPTY_BASE');
 const results=[];
 for(const [id,prior] of before){
  const candidate=after.get(id);
  let reason;
  if(!candidate)reason='CANDIDATE_MISSING';
  else if(candidate.methodologyVersion!==prior.methodologyVersion||!prior.methodologyVersion)reason='METHODOLOGY_MISMATCH';
  else if(!Array.isArray(prior.etfs)||!prior.etfs.length||!Array.isArray(candidate.etfs)||
   candidate.etfs.length!==prior.etfs.length||candidate.etfs.some((ticker,i)=>ticker!==prior.etfs[i]))reason='ROSTER_MISMATCH';
  else {
   const next=new Map(candidate.history?.map(point=>[point.date,point.score]));
   if(!prior.history?.length||!prior.history.every(point=>validDate(point.date)&&Number.isFinite(point.score)&&
    next.get(point.date)===point.score))reason='CONFIRMED_HISTORY_MISMATCH';
   else if(prior.provisional&&(!validDate(candidate.provisional?.date)||
    candidate.provisional.date<prior.provisional.date||
    candidate.provisional.date===prior.provisional.date&&candidate.provisional.score!==prior.provisional.score))
    reason='PROVISIONAL_HISTORY_MISMATCH';
  }
  results.push({id,status:reason?'BLOCKED':'VERIFIED',...(reason?{reason}:{})});
 }
 return {status:results.every(row=>row.status==='VERIFIED')?'CUTOVER_INPUTS_VERIFIED':'CUTOVER_BLOCKED',results};
}
