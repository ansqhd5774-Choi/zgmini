// Official risk context only; advisory statements are not dated incident observations.
export const MARAD_ADVISORIES_URL='https://www.maritime.dot.gov/msci-advisories';
export function parseMaradAdvisoryContext(html){
 if(typeof html!=='string'||html.length>4000000)throw Error('MARAD_ADVISORY_INPUT_INVALID');
 const candidates=[];
 // Retain relevant advisory identity, never infer incident count from its title.
 for(const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
  const title=match[2].replace(/<[^>]*>/g,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
  if(!/Iran|Hormuz|Persian Gulf/i.test(title))continue;
  let url;try{url=new URL(match[1],MARAD_ADVISORIES_URL);}catch{continue;}
  if(url.origin!=='https://www.maritime.dot.gov'||url.username||url.password||url.search||!url.pathname.startsWith('/msci/'))continue;
  const id=title.match(/^20\d\d-\d{3}\b/)?.[0];if(!id)continue;
  if(!candidates.some(x=>x.id===id))candidates.push({id,title:title.slice(0,400),sourceUrl:url.href,status:'DETAIL_REVIEW_REQUIRED'});
 }
 return {version:'MARAD_ADVISORY_CONTEXT_R14',status:candidates.length?'CONTEXT_CANDIDATES':'NO_MATCHING_ADVISORY_PARSED',
  sourceUrl:MARAD_ADVISORIES_URL,candidates,attackCount:null,eventVerified:false,coverageVerified:false,
  restrictionVerified:false,reason:'ADVISORY_LIST_IS_NOT_INCIDENT_COVERAGE'};
}
