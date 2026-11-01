// Optional public DERIVED scores for at most two newly observed ETF sessions.
// The 252-day confirmed snapshot stays immutable. No price/data source requests.
export const THEME_ETF_PROVISIONAL_KEY='theme-etf-only-provisional';
export const THEME_ETF_PROVISIONAL_METHOD='ETF_ONLY_T40_R20_V40_PAIR50';
const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const stamp=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
const score=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
export function validThemeEtfProvisional(p,confirmed,{now=Date.now(),themes=[]}={}){
 if(!p||p.status!=='READY'||p.phase!=='PROVISIONAL'||p.methodologyVersion!==THEME_ETF_PROVISIONAL_METHOD||p.individualStocksUsed!==0)return false;
 if(p.publicationAuthorized!==true||p.upstreamCommercialRightsVerified!==true||p.derivedLicenseVerified!==true||p.sourcePriceReconciled!==true)return false;
 if(typeof p.sourceName!=='string'||!p.sourceName.trim()||typeof p.sourceVersion!=='string'||!p.sourceVersion.trim())return false;
 if(!stamp(p.asOf)||!stamp(p.sourceStoredAt)||Date.parse(p.asOf)>now||Date.parse(p.sourceStoredAt)>now||now-Date.parse(p.asOf)>=8*86400000)return false;
 if(!date(confirmed)||!Array.isArray(themes)||!themes.length||p.confirmedObservationDate!==confirmed)return false;
 if(!Array.isArray(p.points)||p.points.length<1||p.points.length>2)return false;
 const keys=themes.map(t=>t.theme);
 if(new Set(keys).size!==keys.length)return false;
 let previous=confirmed;
 for(const point of p.points){
  if(!date(point?.date)||point.date<=previous||Date.parse(point.date+'T00:00:00Z')>now)return false;
  if(point?.scores===null||typeof point?.scores!=='object'||Array.isArray(point.scores))return false;
  if(Object.keys(point.scores).length!==keys.length||keys.some(k=>!Object.hasOwn(point.scores,k)||!score(point.scores[k])))return false;
  previous=point.date;
 }
 // Prevent a missing date/ETF from masquerading as complete data in a partial output.
 return p.observationDate===previous&&p.coverage?.etfs===13&&p.coverage?.benchmark==='SPY'&&p.coverage?.complete===true;
}
