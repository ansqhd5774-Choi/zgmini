import {env} from 'cloudflare:workers';
import {readInflationCandidates7PublicResponse} from '../../../worker/inflation-causal-candidates-public-7-r1.mjs';

// Existing official seven-input research projection only. Visitor requests
// use stored D1 snapshots; no provider request, calculation or publication.
function publicResponse(request:Request){
 const runtime=env as typeof env & {DB_CORE?:D1Database};
 return readInflationCandidates7PublicResponse(request,runtime.DB_CORE??runtime.DB);
}
export const GET=publicResponse;
export const HEAD=publicResponse;
