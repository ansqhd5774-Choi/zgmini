import {env} from 'cloudflare:workers';
import {publicFeedStore} from '../../../worker/public-feed-store.mjs';
import {earningsDisplayResponse,EARNINGS_API_DISPLAY_KEY} from '../../../lib/earnings-api-display.mjs';
import {ER1_EARNINGS_DISPLAY_PUBLIC_KEY} from '../../../lib/market-calendar-er1-public-display.mjs';
import {DEC2026_EARNINGS_HTML_KEY,withDec2026Display} from '../../../lib/market-calendar-dec2026-display.mjs';

export async function GET(request:Request){
 const store=publicFeedStore(env.DB);
 let snapshot;try{snapshot=(await store.readOutput(EARNINGS_API_DISPLAY_KEY))?.body;}catch{}
 // December is a separate sanitized HTML-only stored output, not a provider feed.
 let december=null;
 try{december=(await store.readOutput(DEC2026_EARNINGS_HTML_KEY))?.body??null;}catch{}
 // Only a validated ER1 derived score may produce enterprise earnings stars.
 // Missing/invalid public scores render '-'; historical FHS/R43 stars are not fallback.
 let er1=null;
 try{er1=(await store.readOutput(ER1_EARNINGS_DISPLAY_PUBLIC_KEY))?.body??null;}catch{}
 return earningsDisplayResponse(withDec2026Display(snapshot,december),request.url,er1);
}
