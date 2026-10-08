import {env} from 'cloudflare:workers';
import {storedRateSentimentResponse} from '../../../worker/rate-sentiment-public.mjs';

// Compatibility with the deployed vinext App Router.
// Keep the Worker-level route intact; both paths use the same stored-only reader.
export async function GET(request:Request){
 return storedRateSentimentResponse(request,{db:env.DB});
}
