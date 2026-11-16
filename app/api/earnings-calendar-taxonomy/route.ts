import {env} from 'cloudflare:workers';
import {publicFeedStore} from '../../../worker/public-feed-store.mjs';
import {MARKET_CALENDAR_TAXONOMY_KEY,taxonomyOptions}
 from '../../../lib/market-calendar-taxonomy-public.mjs';

export async function GET(){
 const headers={'cache-control':'public, max-age=60, must-revalidate',
  'x-data-source':'STORED','x-robots-tag':'noindex',
  'x-content-type-options':'nosniff'};
 let row=null;
 try{row=(await publicFeedStore(env.DB).readOutput(MARKET_CALENDAR_TAXONOMY_KEY))?.body??null;}
 catch{}
 const options=taxonomyOptions(row);
 if(!options)return new Response(null,{status:204,headers:{...headers,'cache-control':'no-store'}});
 return Response.json(options,{headers});
}
