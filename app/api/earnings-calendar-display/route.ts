import {env} from 'cloudflare:workers';
import {publicFeedStore} from '../../../worker/public-feed-store.mjs';
import {earningsDisplayResponse,EARNINGS_API_DISPLAY_KEY} from '../../../lib/earnings-api-display.mjs';
import {ER1_EARNINGS_DISPLAY_PUBLIC_KEY} from '../../../lib/market-calendar-er1-public-display.mjs';
import {er1MonthlyPublicKey} from '../../../lib/market-calendar-er1-month-key.mjs';
import {DEC2026_EARNINGS_HTML_KEY,DEC2026_ER1_PUBLIC_KEY,withDec2026Display} from '../../../lib/market-calendar-dec2026-display.mjs';
import {NOV2026_EARNINGS_HTML_H1_KEY,NOV2026_EARNINGS_HTML_H2_KEY,
 NOV2026_ER1_PUBLIC_KEY,withNov2026Display} from '../../../lib/market-calendar-nov2026-display.mjs';

export async function GET(request:Request){
 const store=publicFeedStore(env.DB);
 let snapshot;try{snapshot=(await store.readOutput(EARNINGS_API_DISPLAY_KEY))?.body;}catch{}
 // December's own-site HTML is an additional sanitized stored output.
 let december=null;
 try{december=(await store.readOutput(DEC2026_EARNINGS_HTML_KEY))?.body??null;}catch{}
 // Both November 15-day HTML parts must be valid and have the same batchId.
 let novemberH1=null,novemberH2=null;
 try{novemberH1=(await store.readOutput(NOV2026_EARNINGS_HTML_H1_KEY))?.body??null;}catch{}
 try{novemberH2=(await store.readOutput(NOV2026_EARNINGS_HTML_H2_KEY))?.body??null;}catch{}
 // Keep October, November and December ER1 issuer cohorts separate.
 let er1=null,decemberER1=null,novemberER1=null;
 try{er1=(await store.readOutput(ER1_EARNINGS_DISPLAY_PUBLIC_KEY))?.body??null;}catch{}
 try{decemberER1=(await store.readOutput(DEC2026_ER1_PUBLIC_KEY))?.body??null;}catch{}
 try{novemberER1=(await store.readOutput(NOV2026_ER1_PUBLIC_KEY))?.body??null;}catch{}
 const display=withDec2026Display(withNov2026Display(snapshot,novemberH1,novemberH2),december);
 // Use only the months present in a stored public calendar projection. Visitor
 // query parameters never cause arbitrary D1-key or vendor lookups.
 const months=new Set((display?.coveredDays??[]).map((day:string)=>day.slice(0,7)));
 const monthlyER1=Object.fromEntries(await Promise.all([...months].map(async month=>{
  const key=er1MonthlyPublicKey(month);
  if(!key)return [month,null] as const;
  try{return [month,(await store.readOutput(key))?.body??null] as const;}
  catch{return [month,null] as const;}
 })));
 return earningsDisplayResponse(display,request.url,er1,decemberER1,novemberER1,monthlyER1);
}
