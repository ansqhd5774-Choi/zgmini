import {env} from 'cloudflare:workers';
import {storedIranNewsAnalysisR1Response} from '../../../../../worker/iran-news-analysis-public-r1.mjs';

// Separate read-only API. The R41 metadata collector and R5 scoring stay intact.
export async function GET(request:Request){
 return storedIranNewsAnalysisR1Response(request,{db:env.DB});
}
