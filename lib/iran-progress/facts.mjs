export const IRAN_FACTS_VERSION='IRAN_OFFICIAL_FACTS_R15';
export const IRAN_FACTS_KEY='public:iran-progress:r15:facts';
export const QATAR_TALKS_URL='https://mofa.gov.qa/en/qatar/latest-articles/latest-news/details/2026/10/06/foreign-ministry--mediation-efforts-between-washington-and-tehran-continue';
// A dated report of mediation is not verification of today's combat or ceasefire.
export function validateIranFacts(body,now){
 if(body?.version!==IRAN_FACTS_VERSION||body.currentStateVerified!==false
  ||Object.keys(body).some(k=>!['version','currentStateVerified','publishedAt','facts'].includes(k))
  ||!Number.isSafeInteger(body.publishedAt)||body.publishedAt<1||body.publishedAt>now
  ||!Array.isArray(body.facts)||body.facts.length>20)return false;
 const ids=new Set();
 return body.facts.every(f=>{
  if(!f||Object.keys(f).some(k=>!['id','sourceUrl','axis','kind','observationDate','publicationDate','summary','verifiedAt'].includes(k)))return false;
  if(ids.has(f?.id))return false;ids.add(f?.id);
  return typeof f?.id==='string'&&/^official-diplomacy-observation:[a-f0-9]{64}$/.test(f.id)
   &&f.sourceUrl===QATAR_TALKS_URL&&f.axis==='IRN_USA'&&f.kind==='MEDIATOR_REPORT'
   &&f.observationDate==='2026-10-06'&&f.publicationDate==='2026-10-06'
   &&f.summary==='카타르 외교부는 미국–이란 간 협상과 메시지 교환이 이어지고 있다고 발표했습니다.'
   &&Number.isSafeInteger(f.verifiedAt)&&f.verifiedAt<=body.publishedAt
   &&f.verifiedAt>=Date.parse('2026-10-07T00:00:00Z');
 });
}
export function visibleIranFacts(body,now){
 if(!validateIranFacts(body,now))return [];
 const day=86400000,end=Date.parse(new Date(now).toISOString().slice(0,10)+'T00:00:00Z');
 return body.facts.filter(f=>{const at=Date.parse(f.observationDate+'T00:00:00Z');return at>=end-13*day&&at<=end;});
}
