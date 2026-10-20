import { env } from "cloudflare:workers";
import { marketOperationalStore, storedMarketResponse } from "../../../worker/market-operational-store.mjs";
import {V9_PUBLIC_KEY,overlayV9PublicScore,projectV9PublicDomain} from "../../../worker/breadth-v9-public-view.mjs";
import {V11_PUBLIC_KEY,overlayV11PublicScore,projectV11PublicDomain} from "../../../worker/breadth-v11-public-view.mjs";

// Visitor GET: only read stored snapshots, prioritize validated V11 and retain
// V9 fallback. No collection, scoring, provider call or D1 write here.
export async function GET(request: Request) {
  const response=await storedMarketResponse(request,{store:marketOperationalStore(env.DB)});
  if(!response.ok||request.method!=="GET")return response;
  const candidates=[{key:V11_PUBLIC_KEY,valid:projectV11PublicDomain,overlay:overlayV11PublicScore,header:"v11"},
    {key:V9_PUBLIC_KEY,valid:projectV9PublicDomain,overlay:overlayV9PublicScore,header:"v9"}];
  for(const candidate of candidates){
    let row:{body:string}|null=null;
    try{
      row=await env.DB.prepare("SELECT body FROM market_public_snapshots_v1 WHERE snapshot_key=?").bind(candidate.key).first() as {body:string}|null;
    }catch{return response;} // Read failure must never trigger a producer on GET.
    if(!row?.body)continue;
    let projection:unknown;
    try{projection=JSON.parse(row.body);}catch{continue;}
    if(!candidate.valid(projection))continue;
    const ndjson=request.headers.get("accept")?.includes("application/x-ndjson")??false;
    const original=await response.text();
    try{
      const outer=JSON.parse(original.trim());
      const snapshot=ndjson?outer.body:outer;
      const modified=candidate.overlay(snapshot,projection);
      if(modified===snapshot)return new Response(original,{status:response.status,headers:response.headers});
      const headers=new Headers(response.headers);
      headers.set("x-breadth-v9","stored"); // preserve existing diagnostics clients
      headers.set("x-breadth-version",candidate.header);
      headers.set("x-breadth-factor-history","r13");
      return new Response(ndjson?JSON.stringify({...outer,body:modified})+"\n":JSON.stringify(modified),{status:response.status,headers});
    }catch{return new Response(original,{status:response.status,headers:response.headers});}
  }
  return response;
}
