import {env} from 'cloudflare:workers';
import {readInflationCausalPublicResponse} from '../../../worker/inflation-causal-public-r1.mjs';

// Read-only stored public projection. The approved PC writer publishes the
// D1 snapshot; visitor requests never collect, compute, or write.
function publicResponse(request:Request){
 const runtime=env as typeof env & {DB_CORE?:D1Database};
 return readInflationCausalPublicResponse(request,runtime.DB_CORE??runtime.DB);
}
export const GET=publicResponse;
export const HEAD=publicResponse;
