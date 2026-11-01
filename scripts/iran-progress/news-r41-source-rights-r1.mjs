// R41 article-body evidence policy. This module performs NO network request.
// It cannot grant copyright permission, approve a draft, or change collection.
// Confirm the publisher's current terms and robots rules before future changes.

const SOURCES=Object.freeze({
 govuk:Object.freeze({
  source:'GOV.UK',hosts:['www.gov.uk'],
  mode:'SOURCE_SPECIFIC_EVIDENCE',
  note:'Official OGL material; check third-party rights on each page.',
  termsUrl:'https://www.gov.uk/help/terms-conditions',
 }),
 tasnim:Object.freeze({
  source:'Tasnim',hosts:['www.tasnimnews.ir'],
  mode:'SOURCE_SPECIFIC_EVIDENCE',
  note:'Publisher attribution and article-level original-content verification required.',
  termsUrl:'https://www.tasnimnews.ir/en',
 }),
 'guardian-iran':Object.freeze({
  source:'The Guardian',hosts:['www.theguardian.com'],
  mode:'LICENSED_EVIDENCE_ONLY',
  note:'The Guardian prohibits unattended scraping and AI/data-analysis use absent approval.',
  termsUrl:'https://www.theguardian.com/help/terms-of-service',
 }),
 'dw-world':Object.freeze({
  source:'DW',hosts:['www.dw.com'],
  mode:'LICENSED_EVIDENCE_ONLY',
  note:'DW has a separate content/RSS distribution programme. Do not infer an AI licence.',
  termsUrl:'https://amp.dw.com/en/benefit-from-smart-content-made-in-germany/a-19470839',
 }),
 'bbc-middle-east':Object.freeze({
  source:'BBC',hosts:['www.bbc.com','www.bbc.co.uk','www.bbci.co.uk'],
  mode:'LICENSED_EVIDENCE_ONLY',
  note:'BBC terms restrict automated scraping and AI/analytical use without consent.',
  termsUrl:'https://www.bbc.com/pages/terms-of-use',
 }),
 aljazeera:Object.freeze({
  source:'Al Jazeera',hosts:['www.aljazeera.com'],
  mode:'LICENSED_EVIDENCE_ONLY',
  note:'Al Jazeera terms prohibit unauthorised scraping and text/data mining.',
  termsUrl:'https://www.aljazeera.com/terms-and-conditions/',
 }),
 'un-middle-east':Object.freeze({
  source:'UN News',hosts:['news.un.org'],
  mode:'NOTICE_AND_RIGHTS_REVIEW_REQUIRED',
  note:'UN news reuse can require credit and notification; no automated rights promotion.',
  termsUrl:'https://www.un.org/en/about-us/copyright/',
 }),
});

export const IRAN_R41_SOURCE_RIGHTS_R1=SOURCES;
const ALLOWED_PATHS=Object.freeze({
 govuk:p=>p.startsWith('/government/'),
 tasnim:p=>/^\/en\/news\/\d{4}\/\d{2}\/\d{2}\/\d+\/[a-z0-9-]+$/.test(p),
 'guardian-iran':p=>p.startsWith('/world/')||p.startsWith('/news/'),
 'dw-world':p=>p.startsWith('/en/'),
 'bbc-middle-east':p=>p.startsWith('/news/'),
 aljazeera:p=>p.startsWith('/news/')||p.startsWith('/features/'),
 'un-middle-east':p=>p.startsWith('/en/story/'),
});

/**
 * Match an exact canonical article identity; this check never fetches the URL.
 * Unknown hosts, malformed URLs and lookalikes are unconditionally restricted.
 */
export function r41SourceRightsPolicy(sourceId,sourceUrl){
 const spec=SOURCES[sourceId];
 let url;
 try{url=new URL(sourceUrl);}catch{return restricted('SOURCE_URL_UNVERIFIED');}
 if(!spec||url.protocol!=='https:'||url.username||url.password||url.port||
    url.hash||url.href!==sourceUrl||!spec.hosts.includes(url.hostname)||
    !ALLOWED_PATHS[sourceId]?.(url.pathname)||
    (['govuk','tasnim'].includes(sourceId)&&url.search))
  return restricted('SOURCE_URL_UNVERIFIED');
 const directlyFetchable=spec.mode==='SOURCE_SPECIFIC_EVIDENCE';
 return Object.freeze({sourceId,source:spec.source,mode:spec.mode,
  directlyFetchable,reason:directlyFetchable?null:'SOURCE_RIGHTS_RESTRICTED',
  termsUrl:spec.termsUrl,rightsReviewRequired:!directlyFetchable});
}

function restricted(reason){
 return Object.freeze({sourceId:null,mode:'UNVERIFIED',directlyFetchable:false,
  reason,rightsReviewRequired:true});
}

/**
 * Only existing GOV.UK/Tasnim evidence helpers have an unattended source path.
 * Other article bodies must arrive from an independently permissioned input.
 */
export function r41DirectEvidenceCandidates(articles){
 if(!Array.isArray(articles))throw Error('NEWS_R41_RIGHTS_INPUT_INVALID');
 const eligible=[],blocked=[];
 for(const article of articles){
  const policy=r41SourceRightsPolicy(article?.sourceId,article?.sourceUrl);
  if(policy.directlyFetchable)eligible.push(article);
  else blocked.push({id:article?.id??null,sourceId:article?.sourceId??null,
   reason:policy.reason});
 }
 return {eligible,blocked};
}
