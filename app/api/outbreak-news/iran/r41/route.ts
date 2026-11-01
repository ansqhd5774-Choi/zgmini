import {env} from 'cloudflare:workers';
import {storedIranNewsMetadataR41Response} from '../../../../../worker/iran-news-metadata-public-r41.mjs';

// Future read-only API. Returns 503 until an independently validated R41 D1
// migration has been applied. Never falls through to R1's single-row writer.
export async function GET(request:Request){
 return storedIranNewsMetadataR41Response(request,{db:env.DB});
}
