/**
 * R4 review adapter. Converts supported Ollama quotes to LOCAL REVIEW CANDIDATES.
 * Never marks any article as a verified war event or authorizes publication.
 */
import {createHash} from 'node:crypto';
export const IRAN_R4_CLAIM_ADAPTER='IRAN_R4_CLAIM_REVIEW_V1';
const TYPES=new Set(['MILITARY_ATTACK','MILITARY_INTERCEPTION','MILITARY_THREAT','MILITARY_WITHDRAWAL',
 'CEASEFIRE_AGREEMENT','CEASEFIRE_EFFECTIVE','CEASEFIRE_BREACH','DIPLOMACY_TALKS',
 'DIPLOMACY_BREAKDOWN','MARITIME_ATTACK','MARITIME_RESTORED','NUCLEAR_AGREEMENT','NUCLEAR_INSPECTION']);
const terms={
 IRAN:/^(?:iran|iranian|irgc|islamic revolutionary guard corps)$/i,
 USA:/^(?:us|usa|united states|united states of america|american forces)$/i,
 ISRAEL:/^(?:israel|israeli forces|idf)$/i,
 HOUTHI:/^(?:houthi|houthis|ansar allah)$/i,
 YEMEN:/^(?:yemen|yemeni government|yemeni forces)$/i,
 SAUDI:/^(?:saudi|saudi arabia|saudi forces)$/i,
 UAE:/^(?:uae|united arab emirates)$/i,
};
const hash=s=>createHash('sha256').update(s).digest('hex');
function normalizeActors(names){
 const out=new Set();
 for(const name of names??[]){
  if(typeof name!=='string')continue;
  for(const [id,re] of Object.entries(terms))if(re.test(name.trim()))out.add(id);
 }
 return [...out].sort();
}
export function classifyR4Actors(actors){
 const a=new Set(actors);
 // When Houthis are present as the claimed actor, Iranian support is not proof
 // of direct Iranian participation against the US, Israel or Saudi Arabia.
 // An article mentioning Iran and Houthis together does not establish
 // who executed the attack; keep both fronts unscored pending actor review.
 if(a.has('IRAN')&&a.has('HOUTHI'))return 'LINKED_UNVERIFIED';
 if(a.has('HOUTHI')&&(a.has('YEMEN')||a.has('SAUDI')||a.has('UAE')||a.has('USA')||a.has('ISRAEL')))return 'YEMEN_HOUTHI';
 if(a.has('IRAN')&&a.has('USA'))return 'IRN_USA';
 if(a.has('IRAN')&&a.has('ISRAEL'))return 'IRN_ISR';
 return 'SCOPE_UNRESOLVED';
}
const validTime=at=>typeof at==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(at)&&
 Number.isFinite(Date.parse(at+'T00:00:00Z'))&&new Date(at+'T00:00:00Z').toISOString().slice(0,10)===at;
export function buildR4ReviewCandidates(article,candidates,{now=Date.now()}={}){
 if(typeof article?.text!=='string'||article.text.length===0
  ||typeof article.sourceUrl!=='string'||!article.sourceUrl.startsWith('https://')
  ||typeof article.rightsReceiptId!=='string'||!article.rightsReceiptId
  ||!validTime(article.publishedDate)||!Array.isArray(candidates))
  return {status:'REVIEW_INPUT_INCOMPLETE',items:[],rejectedCount:0};
 const publicationDate=article.publishedDate;
 let rejectedCount=0;
 const unique=new Map();
 for(const candidate of candidates){
  if(!candidate||Object.keys(candidate).some(k=>!['quote','eventAt','actors','type'].includes(k))||typeof candidate.quote!=='string'||candidate.quote.length<8||!article.text.includes(candidate.quote)
   ||!TYPES.has(candidate.type)||!Array.isArray(candidate.actors)
   ||(candidate.eventAt!==null&&!validTime(candidate.eventAt))){rejectedCount++;continue;}
  // Publication is not event date; an event date reported later is a candidate only.
  if(candidate.eventAt&&Date.parse(candidate.eventAt+'T00:00:00Z')>now){rejectedCount++;continue;}
  const actors=normalizeActors(candidate.actors);
  const axis=classifyR4Actors(actors);
  const key=hash(JSON.stringify([article.sourceUrl,publicationDate,candidate.quote,candidate.type,axis]));
  const item={id:key,articleUrl:article.sourceUrl,sourcePublishedDate:publicationDate,
   eventDateCandidate:candidate.eventAt??null,actors,axis,type:candidate.type,
   quoteHash:hash(candidate.quote),sourceRightsReceiptId:article.rightsReceiptId,
   originalTextHash:hash(article.text),classification:'PENDING_EVIDENCE_REVIEW',
   eventVerified:false,occurrenceVerified:false,actorVerified:false,
   scoringEligible:false,method:IRAN_R4_CLAIM_ADAPTER};
  unique.set(key,item);
 }
 return {status:'REVIEW_PENDING',items:[...unique.values()],rejectedCount,
  acceptedCandidateCount:unique.size,verification:'NOT_PERFORMED',scoringEligible:false};
}
