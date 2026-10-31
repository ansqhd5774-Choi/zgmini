import {env} from 'cloudflare:workers';
import {publicFeedStore} from '../../../worker/public-feed-store.mjs';
import {earningsDisplayResponse,EARNINGS_API_DISPLAY_KEY} from '../../../lib/earnings-api-display.mjs';
import {FHS_R3_PUBLIC_KEY,validateFhsAnnualSnapshot} from '../../../lib/market-calendar-fhs-r3-public.mjs';

export async function GET(request:Request){
 const store=publicFeedStore(env.DB);
 let snapshot;try{snapshot=(await store.readOutput(EARNINGS_API_DISPLAY_KEY))?.body;}catch{}
 let annual=null;try{
  const published=(await store.readOutput(FHS_R3_PUBLIC_KEY))?.body;
  if(published)annual=validateFhsAnnualSnapshot(published);
 }catch{/* preserve the existing calendar display when a grade snapshot is missing */}
 return earningsDisplayResponse(snapshot,request.url,annual);
}
