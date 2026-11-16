import { env } from "cloudflare:workers";
import { marketOperationalStore, storedMarketResponse } from "../../../worker/market-operational-store.mjs";

// MarketParquet-derived V9/V11 overlays removed. Independent stored domains
// retain their existing contract; GET never starts a producer.
export async function GET(request: Request) {
  return storedMarketResponse(request,{store:marketOperationalStore(env.DB)});
}
