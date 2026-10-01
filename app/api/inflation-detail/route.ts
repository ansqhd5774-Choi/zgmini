import { env } from "cloudflare:workers";
import { loadStoredInflationR2Domain } from "../../../worker/inflation-r2-reader.mjs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requested = url.searchParams.get("asOf");
  const asOf = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested)
    ? requested
    : new Date().toISOString().slice(0, 10);

  const domain = await loadStoredInflationR2Domain(env.DB, { asOf });
  return Response.json(domain, {
    headers: {
      "cache-control": "no-store, max-age=0",
    },
  });
}
