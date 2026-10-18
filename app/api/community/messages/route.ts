import {env} from "cloudflare:workers";
import {normalizeChatDraft,chatRateAllowed} from "../../../../lib/community-chat-r1.mjs";
export const runtime="edge";
type Bindings={DB?:D1Database;COMMUNITY_CHAT_HASH_SECRET?:string};
const headers={"cache-control":"no-store, max-age=0","x-robots-tag":"noindex, nofollow"};
function reply(value:unknown,status=200){return Response.json(value,{status,headers});}
const bindings=env as unknown as Bindings;
function db(){return bindings.DB;}
export async function GET(request:Request){
 if(request.method!=="GET")return reply({error:"METHOD_NOT_ALLOWED"},405);
 if(!db())return reply({error:"NOT_CONFIGURED"},503);
 try{
  const rows=await db()!.prepare("SELECT id,nickname,body,created_at FROM community_chat_messages WHERE hidden=0 ORDER BY created_at DESC,id DESC LIMIT 50").all<{id:string;nickname:string;body:string;created_at:string}>();
  return reply({messages:[...(rows.results??[])].reverse(),writeEnabled:Boolean(bindings.COMMUNITY_CHAT_HASH_SECRET)});
 }catch{return reply({error:"CHAT_STORAGE_NOT_READY"},503);}
}
export async function POST(request:Request){
 if(request.headers.get("content-type")?.split(";")[0].trim().toLowerCase()!=="application/json")return reply({error:"UNSUPPORTED_MEDIA_TYPE"},415);
 const origin=request.headers.get("origin");
 if(!origin||origin!==new URL(request.url).origin)return reply({error:"ORIGIN_REQUIRED"},403);
 if(!db()||!bindings.COMMUNITY_CHAT_HASH_SECRET)return reply({error:"CHAT_WRITE_NOT_CONFIGURED"},503);
 const ip=request.headers.get("cf-connecting-ip");
 if(!ip)return reply({error:"REQUEST_CONTEXT_MISSING"},503);
 let input:unknown;
 try{const raw=await request.text();if(raw.length>4096)return reply({error:"PAYLOAD_TOO_LARGE"},413);input=JSON.parse(raw);}catch{return reply({error:"INVALID_JSON"},400);}
 const draft=normalizeChatDraft(input);
 if(!draft)return reply({error:"INVALID_MESSAGE"},400);
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(bindings.COMMUNITY_CHAT_HASH_SECRET+":"+ip));
 const actor=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,"0")).join("");
 const now=Date.now(),minute=Math.floor(now/60000),day=Math.floor(now/86400000);
 try{
  const rate=await db()!.prepare(`INSERT INTO community_chat_rate_limits(actor_hash,minute_bucket,minute_count,day_bucket,day_count)
   VALUES (?1,?2,1,?3,1)
   ON CONFLICT(actor_hash) DO UPDATE SET
    minute_count=CASE WHEN minute_bucket=excluded.minute_bucket THEN minute_count+1 ELSE 1 END,
    minute_bucket=excluded.minute_bucket,
    day_count=CASE WHEN day_bucket=excluded.day_bucket THEN day_count+1 ELSE 1 END,
    day_bucket=excluded.day_bucket
   RETURNING minute_count,day_count`).bind(actor,minute,day).first<{minute_count:number;day_count:number}>();
  if(!rate||!chatRateAllowed(rate.minute_count,rate.day_count))return reply({error:"RATE_LIMITED"},429);
  const id=crypto.randomUUID(),createdAt=new Date(now).toISOString();
  await db()!.prepare("INSERT INTO community_chat_messages(id,nickname,body,created_at,hidden) VALUES (?1,?2,?3,?4,0)").bind(id,draft.nickname,draft.body,createdAt).run();
  return reply({id,created_at:createdAt},201);
 }catch{return reply({error:"CHAT_STORAGE_NOT_READY"},503);}
}
