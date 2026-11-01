import {hash} from './store.mjs';
import {qatarHistoricalAssertion} from './qatar-observation-input-r14.mjs';
import {IRAN_FACTS_VERSION,validateIranFacts} from '../../lib/iran-progress/facts.mjs';
// Only reuses fixed-rule, immutable, linked evidence. AI candidates are never read.
export function buildOfficialFacts(store,now){
 const provenance=store.getCheckpoint('verified-input-provenance-r14')??{};
 const p=provenance['relations.IRN_USA'];const facts=[];
 if(p){
  const read=id=>{const row=store.db.prepare('SELECT body FROM sources WHERE id=?').get(id);return row?JSON.parse(row.body):null;};
  const a=read(p.assertionId);
  if(a?.parserVersion==='QATAR_MEDIATOR_HISTORICAL_R14'){
   if(p.assertionId!=='input-assertion:'+hash(a)||p.valueHash!==a.valueHash)throw Error('FACT_ASSERTION_MISMATCH');
   const evidence=a.evidence?.[0],r=read(evidence?.sourceId);
   if(!r||hash(r)!==evidence.bodyHash)throw Error('FACT_EVIDENCE_MISMATCH');
   const expected=qatarHistoricalAssertion(r,evidence.sourceId,a.verifiedAt);
   if(hash(expected)!==hash(a))throw Error('FACT_REVIEW_MISMATCH');
   facts.push({id:evidence.sourceId,axis:'IRN_USA',kind:'MEDIATOR_REPORT',
    observationDate:r.eventDate,publicationDate:r.publicationDate,verifiedAt:a.verifiedAt,sourceUrl:r.sourceUrl,
    summary:'카타르 외교부는 미국–이란 간 협상과 메시지 교환이 이어지고 있다고 발표했습니다.'});
  }
 }
 const body={version:IRAN_FACTS_VERSION,currentStateVerified:false,publishedAt:now,facts};
 if(!validateIranFacts(body,now))throw Error('FACT_PUBLIC_CONTRACT_INVALID');
 return body;
}
