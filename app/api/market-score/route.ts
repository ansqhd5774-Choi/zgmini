import { env } from "cloudflare:workers";
import { marketOperationalStore, storedMarketResponse } from "../../../worker/market-operational-store.mjs";
import {V9_PUBLIC_KEY,overlayV9PublicScore,projectV9PublicDomain} from "../../../worker/breadth-v9-public-view.mjs";

// Visitor GET: only read the existing published market snapshot and optional V9 public output.
// No provider API, price history, scoring, or D1 write is allowed here.
export async function GET(request: Request) {
  const response=await storedMarketResponse(request,{store:marketOperationalStore(env.DB)});
  if(!response.ok||request.method!=="GET")return response;
  let row:{body:string}|null=null;
  try {
    row=await env.DB.prepare("SELECT body FROM market_public_snapshots_v1 WHERE snapshot_key=?").bind(V9_PUBLIC_KEY).first() as {body:string}|null;
  }catch{return response;} // Preserve the current public score until the explicit V9 output is published.
  if(!row?.body)return response;
  let projection:unknown;
  try{projection=JSON.parse(row.body);}catch{return response;}
  if(!projectV9PublicDomain(projection))return response;
  const ndjson=request.headers.get("accept")?.includes("application/x-ndjson")??false;
  const original=await response.text();
  try{
    const outer=JSON.parse(original.trim());
    const snapshot=ndjson?outer.body:outer;
    const modified=overlayV9PublicScore(snapshot,projection);
    if(modified===snapshot)return new Response(original,{status:response.status,headers:response.headers});
    const headers=new Headers(response.headers);
    headers.set("x-breadth-v9","stored");
    return new Response(ndjson?JSON.stringify({...outer,body:modified})+"\n":JSON.stringify(modified),{status:response.status,headers});
  }catch{
    return new Response(original,{status:response.status,headers:response.headers});
  }
}
