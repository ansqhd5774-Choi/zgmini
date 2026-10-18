import {env} from 'cloudflare:workers';
import {publicFeedStore} from '../../../worker/public-feed-store.mjs';
export async function GET(){
 let row;try{row=await publicFeedStore(env.DB).readOutput('release-calendar');}catch{}
 return Response.json(row?.body??{status:'PENDING',sources:{},events:[]},{headers:{'cache-control':'public, max-age=60, must-revalidate','x-data-source':'STORED','x-robots-tag':'noindex'}});
}
