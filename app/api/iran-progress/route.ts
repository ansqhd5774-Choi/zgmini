import {env} from 'cloudflare:workers';
import {storedIranProgressResponse} from '../../../worker/iran-progress-public.mjs';
// Deployed candidate uses the App Router. API only reads previously published data.
export async function GET(request:Request){
 return storedIranProgressResponse(request,{db:env.DB});
}
