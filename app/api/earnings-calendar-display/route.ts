import {env} from 'cloudflare:workers';
import {publicFeedStore} from '../../../worker/public-feed-store.mjs';
import {earningsDisplayResponse,EARNINGS_API_DISPLAY_KEY} from '../../../lib/earnings-api-display.mjs';
import {ER1_EARNINGS_DISPLAY_PUBLIC_KEY} from '../../../lib/market-calendar-er1-public-display.mjs';
import {DEC2026_EARNINGS_HTML_KEY,DEC2026_ER1_PUBLIC_KEY,withDec2026Display} from '../../../lib/market-calendar-dec2026-display.mjs';
import {NOV2026_EARNINGS_HTML_KEY,withNov2026Display} from '../../../lib/market-calendar-nov2026-display.mjs';

export async function GET(request:Request){
 const store=publicFeedStore(env.DB);
 let snapshot;try{snapshot=(await store.readOutput(EARNINGS_API_DISPLAY_KEY))?.body;}catch{}
 // December's own-site HTML is an additional sanitized stored output.
 let december=null;
 try{december=(await store.readOutput(DEC2026_EARNINGS_HTML_KEY))?.body??null;}catch{}
 // Previously saved 30-day November data fills gaps outside the live 14-day feed.
 let november=null;
 try{november=(await store.readOutput(NOV2026_EARNINGS_HTML_KEY))?.body??null;}catch{}
 // Both score cohorts use the unchanged ER1 method. A separate December
 // denominator must never mutate or replace the published October cohort.
 let er1=null,decemberER1=null;
 try{er1=(await store.readOutput(ER1_EARNINGS_DISPLAY_PUBLIC_KEY))?.body??null;}catch{}
 try{decemberER1=(await store.readOutput(DEC2026_ER1_PUBLIC_KEY))?.body??null;}catch{}
 return earningsDisplayResponse(withDec2026Display(withNov2026Display(snapshot,november),december),
  request.url,er1,decemberER1);
}
