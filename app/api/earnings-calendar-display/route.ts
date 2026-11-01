import {env} from 'cloudflare:workers';
import {publicFeedStore} from '../../../worker/public-feed-store.mjs';
import {earningsDisplayResponse,EARNINGS_API_DISPLAY_KEY} from '../../../lib/earnings-api-display.mjs';
import {FHS_R3_PUBLIC_KEY,validateFhsAnnualSnapshot} from '../../../lib/market-calendar-fhs-r3-public.mjs';
import {R43_MARKET_IMPORTANCE_PUBLIC_KEY} from '../../../lib/market-calendar-r43-display-overlay.mjs';

export async function GET(request:Request){
 const store=publicFeedStore(env.DB);
 let snapshot;try{snapshot=(await store.readOutput(EARNINGS_API_DISPLAY_KEY))?.body;}catch{}
 let annual=null;
 try{const row=(await store.readOutput(FHS_R3_PUBLIC_KEY))?.body;if(row)annual=validateFhsAnnualSnapshot(row);}catch{}
 // R43 is an optional, independently verified derived display snapshot.
 // Absence or invalid data must never change the annual manual FHS grade.
 let r43=null;
 try{r43=(await store.readOutput(R43_MARKET_IMPORTANCE_PUBLIC_KEY))?.body??null;}catch{}
 return earningsDisplayResponse(snapshot,request.url,annual,r43);
}
