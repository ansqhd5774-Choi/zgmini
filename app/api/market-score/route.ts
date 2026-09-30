import { env } from "cloudflare:workers";
import { marketOperationalStore, storedMarketResponse } from "../../../worker/market-operational-store.mjs";

// Collection and calculation run through the authenticated scheduled worker.
// Page requests only read the already published score snapshot.
export async function GET(request: Request) {
  return storedMarketResponse(request, { store: marketOperationalStore(env.DB) });
}
