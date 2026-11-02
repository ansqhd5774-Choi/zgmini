import {env} from 'cloudflare:workers';
import {publicFeedStore} from '../../../worker/public-feed-store.mjs';
import {ER1_EARNINGS_DISPLAY_PUBLIC_KEY,
 validateER1PublicDisplay} from '../../../lib/market-calendar-er1-public-display.mjs';
import {ER1_STAR3_THRESHOLD} from '../../../lib/market-calendar-er1-earnings-score.mjs';

const headers={
 'cache-control':'public, max-age=60, must-revalidate',
 'x-content-type-options':'nosniff',
 'x-robots-tag':'noindex',
 'content-security-policy':"default-src 'none'; base-uri 'none'; form-action 'none'",
};

// Ticker-to-derived-score read model for official-calendar rows. No raw
// EarningsAPI EPS/revenue or private announcement history ever leaves the PC.
export async function GET(){
 try{
  const store=publicFeedStore(env.DB);
  const body=(await store.readOutput(ER1_EARNINGS_DISPLAY_PUBLIC_KEY))?.body;
  const verified=validateER1PublicDisplay(body);
  if(!verified)return new Response(null,{status:204,headers:{...headers,'cache-control':'no-store'}});
  return Response.json({status:'READY_ER1_DISPLAY',asOf:verified.asOf,
   threshold:ER1_STAR3_THRESHOLD,
   scores:Object.fromEntries(verified.index)},{status:200,headers});
 }catch{
  return new Response(null,{status:204,headers:{...headers,'cache-control':'no-store'}});
 }
}
