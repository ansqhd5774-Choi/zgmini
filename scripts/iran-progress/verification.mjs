import {hash} from './store.mjs';
const AXES=['IRN_ISR','IRN_USA','LINKED'];
const SAME=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// A quote match grounds a proposal; it does not prove the proposed fact or actor attribution.
export function groundProposal(proposal,documents){
 if(!proposal||!Array.isArray(proposal.evidence)||!proposal.evidence.length)return {status:'PENDING_REVIEW',reason:'EVIDENCE_MISSING'};
 const grounded=[];
 for(const proof of proposal.evidence){
  const doc=documents.find(d=>d.id===proof.sourceId);
  if(!doc||doc.status!=='COLLECTED'||doc.textHash!==hash(doc.text)||typeof proof.quote!=='string'||proof.quote.length<8||proof.quote.length>1000||!doc.text.includes(proof.quote))
   return {status:'PENDING_REVIEW',reason:'EVIDENCE_QUOTE_UNSUPPORTED'};
  grounded.push({sourceId:doc.id,rootId:doc.independentRoot,sourceClass:doc.sourceClass,quote:proof.quote});
 }
 return {status:'GROUNDED_CANDIDATE',evidence:grounded};
}
export function eventSeverity(facts){
 if(facts?.attackConfirmed!==true||facts.scaleVerified!==true)return null;
 if(facts.multiTarget===true||facts.infrastructureClosure===true||facts.vesselLoss===true||Number.isInteger(facts.confirmedFatalities)&&facts.confirmedFatalities>=10)return 10;
 if(facts.targetDestruction===true||facts.injuries===true||Number.isInteger(facts.confirmedFatalities)&&facts.confirmedFatalities>0)return 3;
 if(facts.limitedAttack===true&&facts.noMajorHarmConfirmed===true)return 1;
 return null;
}
export function verifyEvent(proposal,documents,now){
 const grounded=groundProposal(proposal,documents);
 if(grounded.status!=='GROUNDED_CANDIDATE')return grounded;
 const f=proposal.facts,severity=eventSeverity({...f?.severityFacts,attackConfirmed:f?.attackConfirmed,scaleVerified:f?.scaleVerified});
 if(typeof proposal.eventId!=='string'||!proposal.eventId||!Number.isInteger(proposal.revision)||proposal.revision<1)return {status:'PENDING_REVIEW',reason:'EVENT_IDENTITY_INVALID'};
 if(!f||!Number.isSafeInteger(f.eventAt)||f.eventAt<=0||f.eventAt>now||!AXES.includes(f.axis)||typeof f.hormuz!=='boolean'||severity===null)
  return {status:'PENDING_REVIEW',reason:'EVENT_FACT_CONTRACT_INCOMPLETE'};
 // Structured assertions must come from a verified source parser/review ledger, never model output.
 // Until a source adapter establishes these independently, even a correctly quoted candidate stays pending.
 const keys=['eventAt','axis','hormuz','actorVerified','connectionVerified','attackConfirmed','scaleVerified'];
 const supporting=grounded.evidence.map(p=>documents.find(d=>d.id===p.sourceId)).filter(d=>
  d.termsApproved===true&&d.verificationOrigin==='FIXED_RULE'&&d.assertionStatus==='VERIFIED'
  &&typeof d.parserVersion==='string'&&d.parserVersion.length>0&&Number.isSafeInteger(d.verifiedAt)&&d.verifiedAt<=now
  &&keys.every(k=>SAME(d.verifiedFacts?.[k],f[k]))&&SAME(d.verifiedFacts?.severityFacts,f.severityFacts));
 if(f.actorVerified!==true||f.connectionVerified!==true)return {status:'PENDING_REVIEW',reason:'ACTOR_OR_CONNECTION_UNCONFIRMED'};
 const roots=new Set(supporting.map(d=>d.independentRoot).filter(x=>typeof x==='string'&&x.length>0));
 const primaryMonitor=supporting.some(d=>d.sourceClass==='OFFICIAL_MONITOR'&&d.firsthandVerified===true);
 if(!primaryMonitor&&roots.size<2)return {status:'PENDING_REVIEW',reason:'INDEPENDENT_FACT_VERIFICATION_PENDING'};
 return {eventId:proposal.eventId,revision:proposal.revision,eventAt:f.eventAt,verifiedAt:now,status:'VERIFIED',axis:f.axis,hormuz:f.hormuz,
  occurrenceVerified:true,actorVerified:true,connectionVerified:true,severityVerified:true,severity,
  agreementViolationVerified:f.agreementViolationVerified===true&&supporting.every(d=>d.verifiedFacts?.agreementViolationVerified===true),
  evidence:grounded.evidence.map(e=>e.sourceId),decisionVersion:'IRAN_EVENT_VERIFICATION_R13'};
}
const D_STAGES=Object.freeze({REJECTED:0,MEDIATOR_CONTACT:20,AGENDA_SCHEDULED:40,TALKS_HELD:60,FRAMEWORK_AGREED:80,END_AGREEMENT:100});
const N_STAGES=Object.freeze({BREAKDOWN:0,CONTACT:20,AGENDA_SCHEDULED:40,FRAMEWORK_VERIFICATION:60,SIGNED_IMPLEMENTING:80,IAEA_IMPLEMENTATION_VERIFIED:100});
export function stageScore(kind,stage){const stages=kind==='D'?D_STAGES:kind==='N'?N_STAGES:null;return stages&&Object.hasOwn(stages,stage)?stages[stage]:null;}
