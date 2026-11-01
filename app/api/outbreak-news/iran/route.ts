import {env} from 'cloudflare:workers';
import {storedIranNewsResponse} from '../../../../worker/iran-news-display-public-r1.mjs';

// Reading published D1 data only. News providers are called by the user's PC.
export async function GET(request:Request){
 return storedIranNewsResponse(request,{db:env.DB});
}
