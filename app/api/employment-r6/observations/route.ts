import {env} from "cloudflare:workers";
import {employmentR6StoredDisplayResponse} from "../../../../worker/employment-r6-public-display.mjs";

// Read-only visitor endpoint. The approved PC writer publishes the snapshot.
export async function GET(request:Request){
  return employmentR6StoredDisplayResponse(request,env.DB);
}
