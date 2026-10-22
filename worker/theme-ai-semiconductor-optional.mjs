import {PUBLIC_DISPLAY_MAX_AGE_MS} from './public-display-freshness.mjs';
// R189: Optional read-only AI ETF score; never changes the seven-theme seed,
// fetches providers, computes scores, publishes, or exposes stored raw prices.
export const AI_THEME_PUBLIC_KEY='theme-ai-semiconductor-r189';
export const AI_THEME_PUBLIC_VERSION='THEME_AI_SEMICONDUCTOR_R189_PUBLIC_V1';
const score=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const stamp=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
const same=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((x,i)=>x===b[i]);
const REQUIRED_TRUE=['publicationAuthorized','upstreamCommercialRightsVerified','derivedLicenseVerified','localBarsVerified','sourcePriceReconciled'];
export function eligibleAiTheme(record,base,{now=Date.now(),storedAt=now}={}){
 if(base?.status!=='READY'||base.themes?.length!==7||!date(base.observationDate)||!Array.isArray(base.themes[0]?.history)||base.themes[0].history.length!==252)return false;
 if(!record||record.status!=='READY'||record.version!==AI_THEME_PUBLIC_VERSION||record.theme!=='AI 반도체'||!same(record.etfs,['SMH','SOXX']))return false;
 if(record.methodologyVersion!=='ETF_ONLY_T40_R20_V40_PAIR50'||base.methodologyVersion!==record.methodologyVersion||record.individualStocksUsed!==0||record.scoreMethod!=='ETF_ONLY_PROXY')return false;
 if(REQUIRED_TRUE.some(key=>record[key]!==true)||record.sourcePriceMode!=='UNADJUSTED_15_NY_HOURLY_PROXY_WITH_OFFICIAL_EARLY_CLOSE_12')return false;
 // R188's local file mtime is not a verified price-source timestamp.
 // Rights and reconciliation must be independently validated before publication.
 if(record.sourceStoredAtKind!=='VERIFIED_LOCAL_MARKET_BARS'||!stamp(record.sourceStoredAt)||!stamp(record.publishedAt)||!stamp(record.asOf)||typeof record.sourceVersion!=='string'||!record.sourceVersion.trim())return false;
 const times=[storedAt,Date.parse(record.sourceStoredAt),Date.parse(record.publishedAt),Date.parse(record.asOf)];
 if(times.some(t=>!Number.isFinite(t)||t>now||now-t>=PUBLIC_DISPLAY_MAX_AGE_MS))return false;
 if(record.observationDate!==base.observationDate||!date(record.observationDate)||!score(record.score)||!Array.isArray(record.history)||record.history.length!==252)return false;
 const baseline=base.themes[0].history;
 if(!record.history.every((p,i)=>date(p?.date)&&score(p?.score)&&p.date===baseline[i].date&&(i===0||p.date>record.history[i-1].date)))return false;
 if(Math.abs(record.history.at(-1).score-record.score)>0.000001)return false;
 // Do not make the seven existing provisional chart points disappear.
 const pending=base.phase==='PROVISIONAL'?base.provisional?.points??[]:[];
 const aiPending=record.provisional?.points??[];
 if(!Array.isArray(pending)||!Array.isArray(aiPending)||!same(aiPending.map(p=>p?.date),pending.map(p=>p?.date)))return false;
 if(!aiPending.every((p,i)=>date(p.date)&&p.date>record.observationDate&&score(p.score)&&(i===0||p.date>aiPending[i-1].date)))return false;
 if(record.phase!==(pending.length?'PROVISIONAL':'CONFIRMED'))return false;
 return true;
}
export async function addVerifiedAiTheme(db,base,{now=Date.now()}={}){
 if(base?.status!=='READY'||base.themes?.length!==7)return base;
 let row;
 try{row=await db.prepare("SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'").bind(AI_THEME_PUBLIC_KEY).first()}catch{return base;}
 if(!row)return base;
 let record;try{record=JSON.parse(row.body)}catch{return base;}
 if(!eligibleAiTheme(record,base,{now,storedAt:Number(row.stored_at)}))return base;
 const ai={theme:'AI 반도체',etfs:['SMH','SOXX'],score:record.score,history:record.history.map(p=>({date:p.date,score:p.score}))};
 const augmented={...base,themes:[...base.themes,ai]};
 if(base.phase==='PROVISIONAL'&&base.provisional?.points?.length){
  augmented.provisional={...base.provisional,points:base.provisional.points.map((p,i)=>({...p,scores:{...p.scores,'AI 반도체':record.provisional.points[i].score}}))};
 }
 return augmented;
}
