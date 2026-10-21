// R178: Read a separately stored, fully derived 252 + <=2 rolling ETF projection.
// Never fetch providers, mutate D1, expose price bars, or alter the seed snapshot.
import {PUBLIC_DISPLAY_MAX_AGE_MS} from './public-display-freshness.mjs';
export const THEME_ETF_ROLLING_KEY='theme-etf-only-rolling';
export const THEME_ETF_ROLLING_VERSION='THEME_ETF_ROLLING_R178';
const date=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
const stamp=t=>typeof t==='string'&&Number.isFinite(Date.parse(t));
const score=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const same=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
const historyValid=(a)=>Array.isArray(a)&&a.length===252&&a.every((x,i)=>date(x?.date)&&score(x?.score)&&(!i||x.date>a[i-1].date));
export async function immutableBaseHash(base,{digest=async b=>{const raw=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(b));return Array.from(new Uint8Array(raw)).map(x=>x.toString(16).padStart(2,'0')).join('')}}={}){
 return digest(JSON.stringify(base.themes.map(t=>({theme:t.theme,etfs:t.etfs,history:t.history}))));
}
export async function validRollingPublic(rolling,base,{now=Date.now(),expectedMethod='ETF_ONLY_T40_R20_V40_PAIR50'}={}){
 if(!rolling||rolling.status!=='READY'||rolling.version!==THEME_ETF_ROLLING_VERSION||!['CONFIRMED','PROVISIONAL'].includes(rolling.phase)||rolling.methodologyVersion!==expectedMethod)return false;
 for(const flag of ['publicationAuthorized','upstreamCommercialRightsVerified','derivedLicenseVerified','sourcePriceReconciled'])if(rolling[flag]!==true)return false;
 if(rolling.individualStocksUsed!==0||rolling.baseObservationDate!==base.observationDate||rolling.coverage?.etfs!==13||rolling.coverage?.benchmark!=='SPY'||rolling.coverage?.complete!==true)return false;
 if(!stamp(rolling.asOf)||!stamp(rolling.sourceStoredAt)||Date.parse(rolling.asOf)>now||Date.parse(rolling.sourceStoredAt)>now||now-Date.parse(rolling.asOf)>=PUBLIC_DISPLAY_MAX_AGE_MS)return false;
 if(!/^([a-f0-9]{64})$/.test(rolling.baseHash??'')||rolling.baseHash!==await immutableBaseHash(base))return false;
 if(!Array.isArray(rolling.themes)||rolling.themes.length!==base.themes.length||!date(rolling.observationDate)||rolling.confirmedObservationDate!==rolling.observationDate)return false;
 let common=null;
 for(let i=0;i<base.themes.length;i++){
  const x=rolling.themes[i],seed=base.themes[i];
  if(x.theme!==seed.theme||!same(x.etfs??[],seed.etfs)||!historyValid(x.history)||!score(x.score)||Math.abs(x.history.at(-1).score-x.score)>0.000001||x.history.at(-1).date!==rolling.observationDate)return false;
  const dates=x.history.map(d=>d.date);if(common&&!same(dates,common))return false;common??=dates;
  const seedScores=new Map(seed.history.map(z=>[z.date,z.score]));
  for(const p of x.history)if(seedScores.has(p.date)&&Math.abs(seedScores.get(p.date)-p.score)>0.000001)return false;
 }
 const points=rolling.provisional?.points??[];
 if(!Array.isArray(points)||points.length>2||(rolling.phase==='PROVISIONAL')!==(points.length>0))return false;
 let prev=rolling.observationDate;
 for(const p of points){if(!date(p?.date)||p.date<=prev||Date.parse(p.date+'T00:00:00Z')>now||!p.scores||typeof p.scores!=='object'||Array.isArray(p.scores))return false;
  const names=base.themes.map(t=>t.theme);if(Object.keys(p.scores).length!==names.length||names.some(name=>!Object.hasOwn(p.scores,name)||!score(p.scores[name])))return false;prev=p.date;}
 if(rolling.lineage?.latestCompletedSession!==prev||!Number.isInteger(rolling.lineage?.confirmedPrimaryCount)||!Number.isInteger(rolling.lineage?.secondaryPendingCount)||rolling.lineage?.secondaryPendingCount!==points.length)return false;
 if(rolling.lineage.primarySource!=='GETMARKETHISTORY_1H_CLOSE'||rolling.lineage.secondarySource!=='MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED')return false;
 return now-Date.parse(prev+'T23:59:59Z')<PUBLIC_DISPLAY_MAX_AGE_MS;
}
export async function readRollingPublic(db,base,{now=Date.now()}={}){
 let row=null;try{row=await db.prepare("SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'").bind(THEME_ETF_ROLLING_KEY).first()}catch{return null}
 if(!row||!Number.isSafeInteger(Number(row.stored_at))||Number(row.stored_at)>now||now-Number(row.stored_at)>=PUBLIC_DISPLAY_MAX_AGE_MS)return null;
 let payload;try{payload=JSON.parse(row.body)}catch{return null}
 if(!await validRollingPublic(payload,base,{now}))return null;
 // Emit only the public derived-score schema already consumed by the dashboard.
 return {status:'READY',version:base.version,methodologyVersion:base.methodologyVersion,
  observationDate:payload.observationDate,confirmedObservationDate:payload.confirmedObservationDate,
  phase:payload.phase,sourceVersion:payload.sourceVersion,sourceStoredAt:payload.sourceStoredAt,
  themes:payload.themes.map(t=>({theme:t.theme,etfs:[...t.etfs],score:t.score,history:t.history.map(p=>({date:p.date,score:p.score}))})),
  ...(payload.phase==='PROVISIONAL'?{provisional:{asOf:payload.provisional.asOf,points:payload.provisional.points.map(p=>({date:p.date,scores:Object.fromEntries(base.themes.map(t=>[t.theme,p.scores[t.theme]]))}))}}:{})};
}
