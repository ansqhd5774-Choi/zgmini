// Independent, evidence-bound AI *provisional* news annotations.
// R41 metadata remains authoritative for which articles are listed; this
// snapshot is never an input to the Iran R5 war-score calculation.
export const IRAN_NEWS_ANALYSIS_VERSION_R1='IRAN_NEWS_ANALYSIS_R1';
export const IRAN_NEWS_ANALYSIS_PUBLIC_KEY_R1='public:iran-progress:news:analysis-provisional:r1';
export const IRAN_NEWS_ANALYSIS_MAX_ITEMS_R1=250;

const ID=/^[a-f0-9]{64}$/;
const KOREAN=/[가-힣]/;
const IMPACTS=new Set(['positive','negative','neutral']);
const PERMITTED_HOSTS=new Set([
 'www.tasnimnews.ir','www.gov.uk','www.theguardian.com','www.dw.com',
 'www.bbc.com','www.bbc.co.uk','www.bbci.co.uk','www.aljazeera.com','news.un.org',
]);

function validUrl(raw,{article=false}={}){
 if(typeof raw!=='string'||raw.length<10||raw.length>2000)return false;
 try{
  const url=new URL(raw);
  return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&
   !url.hash&&url.href===raw&&(!article||PERMITTED_HOSTS.has(url.hostname));
 }catch{return false;}
}

function validKoreanText(value,max){
 return typeof value==='string'&&value.trim().length>=8&&value.length<=max&&
  KOREAN.test(value)&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
}

async function sameArticleIdentity(article){
 // Browser/Cloudflare-compatible WebCrypto; no Node-only runtime import.
 if(!globalThis.crypto?.subtle)return false;
 const raw=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(article.sourceUrl));
 const digest=Array.from(new Uint8Array(raw),n=>n.toString(16).padStart(2,'0')).join('');
 return digest===article.id;
}

export async function validIranNewsAnalysisItemR1(item,{now=Date.now(),publishedAt=now}={}){
 if(!item||typeof item!=='object'||Array.isArray(item)||
  !ID.test(item.id)||!validUrl(item.sourceUrl,{article:true})||
  item.analysisStatus!=='READY'||!IMPACTS.has(item.impact)||
  !validKoreanText(item.summaryKo,1400)||!validKoreanText(item.interpretationKo,2400)||
  (item.titleKo!==undefined&&!validKoreanText(item.titleKo,550))||
  (item.keyPointKo!==undefined&&(!validKoreanText(item.keyPointKo,160)||
   item.keyPointKo.trim().length<15))||
  (item.keyFactsKo!==undefined&&(!Array.isArray(item.keyFactsKo)||
   item.keyFactsKo.length<2||item.keyFactsKo.length>3||
   item.keyFactsKo.some(fact=>!validKoreanText(fact,170)||fact.trim().length<12)||
   new Set(item.keyFactsKo.map(fact=>fact.trim())).size!==item.keyFactsKo.length))||
  ((item.keyPointKo===undefined)!==(item.keyFactsKo===undefined))||
  !Number.isSafeInteger(item.analyzedAt)||item.analyzedAt<=0||item.analyzedAt>publishedAt||
  item.analyzedAt>now||
  !Array.isArray(item.evidenceUrls)||item.evidenceUrls.length<1||item.evidenceUrls.length>6||
  !item.evidenceUrls.includes(item.sourceUrl)||!item.evidenceUrls.every(url=>validUrl(url))||
  (item.model!==undefined&&(typeof item.model!=='string'||item.model.length<1||item.model.length>120))||
  item.rightsVerified!==undefined||item.displayEligible!==undefined)return false;
 return sameArticleIdentity(item);
}

export async function validIranNewsAnalysisSnapshotR1(snapshot,{now=Date.now()}={}){
 if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot)||
  snapshot.version!==IRAN_NEWS_ANALYSIS_VERSION_R1||
  !Number.isSafeInteger(now)||!Number.isSafeInteger(snapshot.publishedAt)||
  snapshot.publishedAt<1||snapshot.publishedAt>now+300000||
  !Array.isArray(snapshot.items)||!Array.isArray(snapshot.pending)||
  snapshot.items.length>IRAN_NEWS_ANALYSIS_MAX_ITEMS_R1||
  snapshot.pending.length>IRAN_NEWS_ANALYSIS_MAX_ITEMS_R1)return false;
 const seen=new Set();
 for(const item of snapshot.items){
  if(!await validIranNewsAnalysisItemR1(item,{now,publishedAt:snapshot.publishedAt})||
   seen.has(item.id))return false;
  seen.add(item.id);
 }
 for(const pending of snapshot.pending){
  if(!pending||typeof pending!=='object'||Array.isArray(pending)||
   !ID.test(pending.id)||seen.has(pending.id)||
   typeof pending.reason!=='string'||!/^[A-Z][A-Z0-9_]{1,79}$/.test(pending.reason))
   return false;
  seen.add(pending.id);
 }
 return true;
}

export function projectedIranNewsAnalysisStatusR1(snapshot,{now=Date.now()}={}){
 if(now-snapshot.publishedAt>48*3600000)return 'STALE';
 if(!snapshot.items.length)return 'PENDING';
 return snapshot.pending.length?'PARTIAL':'READY';
}
