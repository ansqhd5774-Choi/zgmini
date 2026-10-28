import {env} from 'cloudflare:workers';
import {publicFeedStore} from '../../../worker/public-feed-store.mjs';
import {earningsDisplayResponse,EARNINGS_API_DISPLAY_KEY} from '../../../lib/earnings-api-display.mjs';

export async function GET(request:Request){
 let snapshot;
 try{snapshot=(await publicFeedStore(env.DB).readOutput(EARNINGS_API_DISPLAY_KEY))?.body;}
 catch{}
 return earningsDisplayResponse(snapshot,request.url);
}
