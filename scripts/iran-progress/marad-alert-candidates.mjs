// MARAD Alerts are government security notices, NOT an exhaustive incident ledger.
// Pure research parser; no network call and no scoring/coverage promotion.
const limit=3_000_000;
const emptyProof=()=>({attackCount:null,coverageVerified:false,eventVerified:false,productionEligible:false});
const clean=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&')
 .replace(/&#39;|&apos;/gi,"'").replace(/&quot;/gi,'"').replace(/\s+/g,' ').trim();
const checkUrl=href=>{
 if(!href||/[\x00-\x1f]/.test(href))return null;
 let u;try{u=new URL(href.replace(/&amp;/gi,'&'),'https://www.maritime.dot.gov');}catch{return null;}
 if(u.protocol!=='https:'||u.hostname!=='www.maritime.dot.gov'||!u.pathname.startsWith('/msci/')
  ||u.username||u.password)return null;
 u.hash='';u.search='';
 return u.href;
};
export function parseMaradAlertsPage(html,{maxCandidates=100}={}){
 if(typeof html!=='string'||Buffer.byteLength(html)>limit
  ||!Number.isSafeInteger(maxCandidates)||maxCandidates<1||maxCandidates>500)
  throw Error('MARAD_ALERT_INPUT_INVALID');
 const text=clean(html);
 const activeAt=text.indexOf('Active Alerts'),cancelledAt=text.indexOf('Cancelled Alerts');
 if(activeAt<0||cancelledAt<activeAt)throw Error('MARAD_ALERT_SECTIONS_MISSING');
 const headingIndex=html.search(/Active Alerts/i);
 const cancelledIndex=html.search(/Cancelled Alerts/i);
 if(headingIndex<0||cancelledIndex<headingIndex)throw Error('MARAD_ALERT_SECTIONS_MISSING');
 const rows=new Map();
 const rx=/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a\s*>/gi;
 let match,seen=0;
 while((match=rx.exec(html))){
  seen++;if(seen>5000)throw Error('MARAD_ALERT_ANCHOR_LIMIT');
  if(match.index<headingIndex)continue;
  const url=checkUrl(match[2]);
  if(!url)continue;
  const title=clean(match[3]);
  const id=title.match(/\b20\d{2}-\d{3,4}[A-Z]?\b/i)?.[0]?.toUpperCase();
  if(!id)continue;
  const section=match.index<cancelledIndex?'ACTIVE':'CANCELLED';
  if(rows.has(id))continue;
  if(rows.size>=maxCandidates)throw Error('MARAD_ALERT_CANDIDATE_LIMIT');
  rows.set(id,{id:'MARAD:'+id,source:'MARAD_MSCI_ALERTS',documentId:id,
   sourceUrl:url,title:title.slice(0,400),listingStatus:section,
   eventAt:null,eventType:null,status:'DISCOVERED',occurrenceVerified:false,
   actorVerified:false,connectionVerified:false,
   disclaimer:'A maritime security alert may describe a risk rather than a confirmed attack.'});
 }
 const active=[...rows.values()].filter(x=>x.listingStatus==='ACTIVE');
 const cancelled=[...rows.values()].filter(x=>x.listingStatus==='CANCELLED');
 const reportedEmpty=/There are no active alerts at this time\.?/i.test(text.slice(activeAt,cancelledAt));
 if(reportedEmpty&&active.length>0)throw Error('MARAD_ACTIVE_ALERT_CONTRADICTION');
 return {status:reportedEmpty?'NO_ACTIVE_ALERTS_LISTED':'DISCOVERY_ONLY',
  candidates:[...rows.values()],activeCount:active.length,cancelledCount:cancelled.length,
  activeEmptyConfirmed:reportedEmpty,source:'MARAD_MSCI_ALERTS',...emptyProof()};
}
