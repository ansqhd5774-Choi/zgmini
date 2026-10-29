// Additional *reported diplomatic stage*, not a signed/implemented peace deal.
// Existing R3 stage points and R5 weights remain unchanged.
import {classifyR3Article,trustedR3Url,validDate} from './reference-flow-r3.mjs';
export function classifyPublishedScoreArticle(article){
 const original=classifyR3Article(article);
 if(original.accepted)return original;
 const title=String(article?.title??'').normalize('NFKC').replace(/[’‘]/g,"'").trim();
 if(original.reason!=='NO_EXPLICIT_CHANGE_RULE'||!trustedR3Url(article.sourceUrl)||!validDate(article.date))return original;
 // Ongoing preparation/negotiation is the existing +2 willingness stage;
 // never count the contemplated reopening/withdrawal as completed actions.
 if(!/\b(?:states|countries|mediators?|officials?)\s+(?:are\s+)?working on (?:a )?(?:multipart |multi-part )?(?:peace|ceasefire) (?:deal|plan)\b/i.test(title)||
  !/\bIran\b/i.test(title))return original;
 const identity=title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 return {accepted:true,rule:'DIALOGUE_WILLINGNESS',type:'DIPLOMACY',delta:2,
  reason:'평화안 협상 추진 보도 · 합의 또는 이행 아님',date:article.date,publicationDate:article.date,eventDate:null,
  actor:'UNKNOWN',target:'unknown',location:'unknown',scope:'DIRECT',sourceUrl:article.sourceUrl,
  evidence:title,eventKey:JSON.stringify([article.date,'DIALOGUE_WILLINGNESS',identity]),
  classifierVersion:'IRAN_PUBLISHED_EVENT_RULES_R1',claimVerification:'SINGLE_SOURCE_REPORT',eventVerified:false};
}
