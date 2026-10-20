import {env} from "cloudflare:workers";
import {storedPublicDailyHistoryResponse} from "../../../worker/economic-domain-daily-history.mjs";
// Candidate read-only additive contract; do not publish without approval.
export async function GET(request:Request){
 return storedPublicDailyHistoryResponse(request,{db:env.DB});
}
