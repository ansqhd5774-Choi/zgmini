import { inspectEmploymentR6AuthProbe } from "../../../../worker/employment-r6-auth-probe.mjs";

const json = (request: Request) =>
  Response.json(inspectEmploymentR6AuthProbe(request), {
    status: 200,
    headers: {
      "cache-control": "no-store, no-cache, must-revalidate",
      "pragma": "no-cache",
      "x-robots-tag": "noindex, nofollow",
    },
  });

export function GET(request: Request) {
  return json(request);
}

export function POST(request: Request) {
  return json(request);
}
