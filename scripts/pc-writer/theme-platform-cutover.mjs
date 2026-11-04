import {digest,ensure,validDate} from './theme-config-registry.mjs';

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

 // Keep the old history in the cutover artifact. The public projection can
 // still select its normal rolling window without destroying that archive.
export function stageThemeCutover({legacy,candidates}){
 ensure(Array.isArray(legacy)&&Array.isArray(candidates),'THEME_CUTOVER_ROWS_REQUIRED');
 const byId=new Map(candidates.map(row=>[row.id,row]));
 ensure(byId.size===candidates.length,'THEME_CUTOVER_INVALID_OR_DUPLICATE_ID');
 const staged=legacy.flatMap(prior=>{
  const candidate=byId.get(prior.id);
  if(!candidate)return [];
  ensure(Array.isArray(prior.history)&&Array.isArray(candidate.history),'THEME_CUTOVER_HISTORY_REQUIRED');
  const points=new Map();
  for(const point of [...prior.history,...candidate.history]){
   ensure(validDate(point?.date)&&Number.isFinite(point.score),'THEME_CUTOVER_INVALID_POINT');
   ensure(!points.has(point.date)||points.get(point.date).score===point.score,'THEME_CUTOVER_CONFIRMED_CONFLICT');
   points.set(point.date,point);
  }
  const history=[...points.values()].sort((a,b)=>a.date.localeCompare(b.date));
  const provisional=candidate.provisional??prior.provisional;
  return [{...candidate,history,...(provisional?{provisional}:{})}];
 });
 const verification=verifyThemeCutover({legacy,candidates:staged});
 return {...verification,...(verification.status==='CUTOVER_INPUTS_VERIFIED'?{candidates:staged}:{})};
}

 // Transfer definitions bind existing evidence to one reviewed writer plan.
 // A staged score or a public response alone cannot grant publication rights.
export function verifyThemeOwnershipPlan({staged,expectedStageSha256,bindings}){
 ensure(Buffer.isBuffer(staged)&&digest(staged)===expectedStageSha256,'THEME_CUTOVER_STAGE_SHA');
 const artifact=JSON.parse(staged.toString('utf8'));
 ensure(artifact.status==='CUTOVER_INPUTS_VERIFIED'&&Array.isArray(artifact.candidates)&&artifact.candidates.length>0,'THEME_CUTOVER_STAGE_NOT_VERIFIED');
 ensure(Array.isArray(bindings),'THEME_CUTOVER_BINDINGS_REQUIRED');
 const ids=new Map(bindings.map(binding=>[binding.id,binding]));
 ensure(ids.size===bindings.length,'THEME_CUTOVER_DUPLICATE_BINDING');
 const candidateIds=new Set(artifact.candidates.map(candidate=>candidate.id));
 ensure(candidateIds.size===artifact.candidates.length&&[...ids.keys()].every(id=>candidateIds.has(id)),'THEME_CUTOVER_BINDING_SCOPE');
 const results=artifact.candidates.map(candidate=>{
  const binding=ids.get(candidate.id);
  let reason;
  if(!binding)reason='EXISTING_WRITER_BINDING_MISSING';
  else if(binding.methodologyVersion!==candidate.methodologyVersion)reason='METHODOLOGY_MISMATCH';
  else if(typeof binding.legacyWriter!=='string'||!binding.legacyWriter||binding.targetWriter!=='configured-themes'||
   !['confirmed','provisional'].every(kind=>typeof binding.publicationKeys?.[kind]==='string'&&binding.publicationKeys[kind]))
   reason='WRITER_OR_PUBLICATION_KEY_MISSING';
  else if(!/^[a-f0-9]{64}$/.test(binding.approvalEvidenceSha256??''))reason='EXISTING_APPROVAL_EVIDENCE_MISSING';
  return {id:candidate.id,status:reason?'BLOCKED':'PLAN_VERIFIED',...(reason?{reason}:{})};
 });
 return {status:results.every(result=>result.status==='PLAN_VERIFIED')?'OWNERSHIP_PLAN_VERIFIED':'OWNERSHIP_PLAN_BLOCKED',results};
}
