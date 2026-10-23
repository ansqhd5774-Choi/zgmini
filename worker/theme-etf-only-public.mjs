import {addVerifiedAiTheme} from './theme-ai-semiconductor-optional.mjs';
import {addVerifiedBiotechTheme} from './theme-biotech-optional.mjs';
import {readRollingPublic} from './theme-etf-rolling-public.mjs';
import {PUBLIC_DISPLAY_MAX_AGE_MS} from './public-display-freshness.mjs';
import {publicFeedStore} from './public-feed-store.mjs';
import {THEME_ETF_PROVISIONAL_KEY,validThemeEtfProvisional} from '../lib/market-score/theme-etf-provisional.mjs';

// ETF-only stored projection reader. Visitor GET never collects, computes or writes.
export const THEME_ETF_ONLY_PUBLIC_KEY='public:theme-etf-only:r1';
export const THEME_ETF_ONLY_PUBLIC_VERSION='THEME_ETF_ONLY_R144_252_PUBLIC_V1';
export const THEME_ETF_ONLY_METHOD='ETF_ONLY_T40_R20_V40_PAIR50';
export const THEME_ETF_ONLY_PAIRS=Object.freeze([
  {theme:'로봇·자동화',etfs:['BOTZ','ROBO']},
  {theme:'클라우드·SaaS',etfs:['SKYY','CLOU']},
  {theme:'자율주행',etfs:['DRIV','BOTZ']},
  {theme:'원전·SMR',etfs:['NLR','URA']},
  {theme:'방산',etfs:['ITA','SHLD']},
  {theme:'핀테크',etfs:['FINX','ARKF']},
  {theme:'사이버보안',etfs:['CIBR','BUG']},
]);
const validScore=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const validStamp=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
const sameList=(a,b)=>Array.isArray(a)&&a.length===b.length&&a.every((x,i)=>x===b[i]);
export function validateThemeEtfOnlyPublic(record){
 if(!record||record.version!==THEME_ETF_ONLY_PUBLIC_VERSION||record.status!=='READY'||record.methodologyVersion!==THEME_ETF_ONLY_METHOD)return false;
 // Private R145 research carries no publication or upstream license authorization.
 if(record.publicationAuthorized!==true||record.upstreamCommercialRightsVerified!==true||record.derivedLicenseVerified!==true)return false;
 if(record.individualStocksUsed!==0||record.scoreMethod!=='ETF_ONLY_PROXY'||record.sourcePriceMode!=='UNADJUSTED_HOURLY_CLOSE_PROXY_DISCLOSED')return false;
 if(!validStamp(record.sourceStoredAt)||!validStamp(record.publishedAt)||!validDate(record.observationDate)||typeof record.sourceVersion!=='string'||!record.sourceVersion.trim())return false;
 if(record.weights?.trend!==0.4||record.weights?.relativeStrength!==0.2||record.weights?.volatility!==0.4||record.pairWeight!==0.5)return false;
 if(!Array.isArray(record.themes)||record.themes.length!==THEME_ETF_ONLY_PAIRS.length)return false;
 let commonDates=null;
 for(let i=0;i<THEME_ETF_ONLY_PAIRS.length;i++){
  const item=record.themes[i],approved=THEME_ETF_ONLY_PAIRS[i];
  if(item?.theme!==approved.theme||!sameList(item.etfs,approved.etfs)||!validScore(item.latestScore)||!Array.isArray(item.history)||item.history.length!==252)return false;
  const dates=item.history.map(p=>p?.date);
  if(dates.some((d,j)=>!validDate(d)||(j>0&&d<=dates[j-1])))return false;
  if(commonDates&&!sameList(dates,commonDates))return false;
  commonDates??=dates;
  if(item.history.some(p=>!validScore(p?.score))||dates.at(-1)!==record.observationDate||Math.abs(item.history.at(-1).score-item.latestScore)>0.000001)return false;
 }
 return true;
}
export async function readThemeEtfOnly(db,{now=Date.now(),store=publicFeedStore(db)}={}){
 const headers={'cache-control':'no-store','x-robots-tag':'noindex, nofollow','x-content-type-options':'nosniff','x-data-source':'STORED'};
 let row=null;
 try{row=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?').bind(THEME_ETF_ONLY_PUBLIC_KEY).first()}
 catch{return Response.json({status:'UNAVAILABLE',reason:'STORED_READ_UNAVAILABLE',themes:[]},{status:503,headers})}
 if(!row)return Response.json({status:'UNAVAILABLE',reason:'STORED_DATA_PENDING',themes:[]},{status:503,headers});
 let record;
 try{record=JSON.parse(row.body)}
 catch{return Response.json({status:'UNAVAILABLE',reason:'STORED_DATA_INVALID',themes:[]},{status:503,headers})}
 if(!validateThemeEtfOnlyPublic(record))return Response.json({status:'UNAVAILABLE',reason:'STORED_DATA_NOT_APPROVED',themes:[]},{status:503,headers});
 // Prefer the independently validated rolling 252+2 stored projection, while keeping the immutable seed as fallback.
 let rolling=null;try{rolling=await readRollingPublic(db,record,{now})}catch{}
 if(rolling){
  const withAi=await addVerifiedAiTheme(db,rolling,{now,seed:record});
  return Response.json(await addVerifiedBiotechTheme(db,withAi,{now,seed:record}),{headers:{...headers,'cache-control':'public, max-age=60, must-revalidate','x-data-snapshot-at':rolling.sourceStoredAt}});
 }
 const observedAt=Date.parse(record.observationDate+'T23:59:59Z');
 const sourceAt=Date.parse(record.sourceStoredAt),storedAt=Number(row.stored_at);
 if(!Number.isFinite(storedAt)||storedAt>now||sourceAt>now||observedAt>now||now-observedAt>=PUBLIC_DISPLAY_MAX_AGE_MS)
  return Response.json({status:'UNAVAILABLE',reason:'STORED_DATA_STALE',themes:[]},{status:503,headers});
 // Whitelist public derived score points: never return raw price/volume or internal audit rows.
 // Keep the confirmed 252 sessions immutable; read optional derived two-day output.
 // A missing/invalid provisional record never blocks the last good confirmed result.
 let provisionalRow=null;
 try{provisionalRow=await store.readOutput(THEME_ETF_PROVISIONAL_KEY)}catch{}
 const provisional=provisionalRow?.storedAt<=now&&validThemeEtfProvisional(provisionalRow.body,record.observationDate,{now,themes:record.themes})?provisionalRow.body:null;
 const result={status:'READY',version:record.version,methodologyVersion:record.methodologyVersion,
  observationDate:record.observationDate,confirmedObservationDate:record.observationDate,
  phase:provisional?'PROVISIONAL':'CONFIRMED',
  sourceVersion:record.sourceVersion,sourceStoredAt:record.sourceStoredAt,
  themes:record.themes.map(t=>({theme:t.theme,etfs:[...t.etfs],score:t.latestScore,
   history:t.history.map(p=>({date:p.date,score:p.score}))})),
  ...(provisional?{provisional:{asOf:provisional.asOf,
   points:provisional.points.map(point=>({date:point.date,scores:Object.fromEntries(record.themes.map(t=>[t.theme,point.scores[t.theme]]))}))}}:{})};
 const withAi=await addVerifiedAiTheme(db,result,{now});
 return Response.json(await addVerifiedBiotechTheme(db,withAi,{now}),{headers:{...headers,'cache-control':'public, max-age=60, must-revalidate','x-data-snapshot-at':new Date(storedAt).toISOString()}});
}
