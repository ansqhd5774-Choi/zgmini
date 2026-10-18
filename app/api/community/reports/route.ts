import {env} from "cloudflare:workers";
export const runtime="edge";
type Bindings={DB?:D1Database;COMMUNITY_CHAT_HASH_SECRET?:string};
const bindings=env as unknown as Bindings;
const headers={"cache-control":"no-store","x-robots-tag":"noindex, nofollow"};
function respond(x:unknown,status=200){return Response.json(x,{status,headers});}
export async function POST(request:Request){
 if(request.headers.get("origin")!==new URL(request.url).origin)return respond({error:"ORIGIN_REQUIRED"},403);
 if(!bindings.DB||!bindings.COMMUNITY_CHAT_HASH_SECRET)return respond({error:"NOT_CONFIGURED"},503);
 if(request.headers.get("content-type")?.split(";")[0].trim().toLowerCase()!=="application/json")return respond({error:"INVALID_CONTENT_TYPE"},415);
 const ip=request.headers.get("cf-connecting-ip");if(!ip)return respond({error:"REQUEST_CONTEXT_MISSING"},503);
 let body:unknown;
 try{const raw=await request.text();if(raw.length>1024)return respond({error:"TOO_LARGE"},413);body=JSON.parse(raw);}catch{return respond({error:"INVALID_JSON"},400);}
 if(!body||typeof body!=="object"||Array.isArray(body))return respond({error:"INVALID_REPORT"},400);
 const {messageId,reason}=body as Record<string,unknown>;
 if(typeof messageId!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(messageId)||!["spam","inappropriate","personal_information","fraud"].includes(String(reason)))return respond({error:"INVALID_REPORT"},400);
 const hashed=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(bindings.COMMUNITY_CHAT_HASH_SECRET+":"+ip));
 const actor=Array.from(new Uint8Array(hashed),b=>b.toString(16).padStart(2,"0")).join("");
 try{
  const count=await bindings.DB.prepare("SELECT COUNT(*) AS n FROM community_chat_reports WHERE actor_hash=?1 AND created_at>=?2").bind(actor,new Date(Date.now()-86400000).toISOString()).first<{n:number}>();
  if((count?.n??0)>=20)return respond({error:"RATE_LIMITED"},429);
  const row=await bindings.DB.prepare("INSERT OR IGNORE INTO community_chat_reports(message_id,actor_hash,reason,created_at) SELECT id,?2,?3,?4 FROM community_chat_messages WHERE id=?1 AND hidden=0").bind(messageId,actor,reason,new Date().toISOString()).run();
  return respond({accepted:(row.meta.changes??0)>0});
 }catch{return respond({error:"STORAGE_UNAVAILABLE"},503);}
}
