import {PAID_THEME_KEY,validPaidThemeRecord} from './theme-paid-contract.mjs';
import {PUBLIC_DISPLAY_MAX_AGE_MS} from './public-display-freshness.mjs';
// A separate paid source checkpoint never mutates legacy histories or executes collection in GET.
export async function readPaidThemeFeed(db,{now=Date.now()}={}){
 let row,b;try{row=await db.prepare("SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'").bind(PAID_THEME_KEY).first();if(!row)return null;b=JSON.parse(row.body);}catch{return null;}
 if(!validPaidThemeRecord(b))return null;
 const stamps=[row.stored_at,Date.parse(b.sourceStoredAt),Date.parse(b.updatedAt),Date.parse(b.observationDate+'T23:59:59Z')];
 if(stamps.some(t=>!Number.isSafeInteger(Number(t))||t>now||now-t>=PUBLIC_DISPLAY_MAX_AGE_MS))return null;
 // Explicit projection: raw prices, bars, private registrations and credentials cannot escape.
 const themes=b.themes.map(t=>({id:t.id,...(t.configured?{configured:true}:{}),theme:t.theme,etfs:t.etfs,score:t.score,history:t.history.map(p=>({date:p.date,score:p.score})),methodologyVersion:t.methodologyVersion,confirmedObservationDate:t.confirmedObservationDate,provisionalObservationDate:t.provisionalObservationDate,sourcePriceMode:t.sourcePriceMode,transitionAfter:t.transitionAfter??null,previousPriceMode:t.previousPriceMode??null,missingETFs:t.missingETFs??[]}));
 return Response.json({version:b.version,status:'READY',phase:b.phase,observationDate:b.observationDate,confirmedObservationDate:b.confirmedObservationDate,sourceLatestDate:b.sourceLatestDate,methodologyVersion:b.methodologyVersion,sourcePriceMode:b.sourcePriceMode,historicalSourcePolicy:b.historicalSourcePolicy,sourceStoredAt:b.sourceStoredAt,sourceVersion:b.sourceVersion,registrySha256:b.registrySha256,updatedAt:b.updatedAt,phasePolicy:b.phasePolicy,themes,provisional:b.provisional,dataQuality:{expectedPublicIds:b.dataQuality.expectedPublicIds,readyPublicIds:b.dataQuality.readyPublicIds,pendingPublicIds:b.dataQuality.pendingPublicIds}},{headers:{'cache-control':'public, max-age=60, stale-while-revalidate=60','x-zgmini-theme-source':'MARKETPARQUET_PAID_HOURLY'}});
}
