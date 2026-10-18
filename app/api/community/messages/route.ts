import {env} from "cloudflare:workers";
import {normalizeChatDraft,chatRateAllowed} from "../../../../lib/community-chat-r1.mjs";
export const runtime="edge";
type Bindings={DB?:D1Database;COMMUNITY_CHAT_HASH_SECRET?:string;COMMUNITY_CHAT_SITE_KEY?:string;COMMUNITY_CHAT_TURNSTILE_SECRET?:string};
const headers={"cache-control":"no-store, max-age=0","x-robots-tag":"noindex, nofollow"};
function reply(value:unknown,status=200){return Response.json(value,{status,headers});}
const bindings=env as unknown as Bindings;
function db(){return bindings.DB;}
export async function GET(request:Request){
 if(request.method!=="GET")return reply({error:"METHOD_NOT_ALLOWED"},405);
 if(!db())return reply({error:"NOT_CONFIGURED"},503);
 try{
  const rows=await db()!.prepare("SELECT id,nickname,body,created_at FROM community_chat_messages WHERE hidden=0 ORDER BY created_at DESC,id DESC LIMIT 50").all<{id:string;nickname:string;body:string;created_at:string}>();
  return reply({messages:[...(rows.results??[])].reverse(),writeEnabled:ready(),siteKey:ready()?bindings.COMMUNITY_CHAT_SITE_KEY:null});
 }catch{return reply({error:"CHAT_STORAGE_NOT_READY"},503);}
}

function ready(){return Boolean(bindings.DB&&bindings.COMMUNITY_CHAT_HASH_SECRET&&bindings.COMMUNITY_CHAT_SITE_KEY&&bindings.COMMUNITY_CHAT_TURNSTILE_SECRET);}
async function checkCaptcha(token:unknown,ip:string,hostname:string):Promise<boolean>{
 if(typeof token!=="string"||!token||token.length>2048||!bindings.COMMUNITY_CHAT_TURNSTILE_SECRET)return false;
 const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),5000);
 try{
  const body=new URLSearchParams({secret:bindings.COMMUNITY_CHAT_TURNSTILE_SECRET,response:token,remoteip:ip});
  const response=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",body,signal:ctrl.signal});
  if(!response.ok)return false;
  const result=await response.json() as {success?:boolean;hostname?:string};
  return result.success===true&&result.hostname===hostname;
 }catch{return false;}finally{clearTimeout(timer);}
}

export async function POST(request:Request){
 if(request.headers.get("content-type")?.split(";")[0].trim().toLowerCase()!=="application/json")return reply({error:"UNSUPPORTED_MEDIA_TYPE"},415);
 const origin=request.headers.get("origin");
 if(!origin||origin!==new URL(request.url).origin)return reply({error:"ORIGIN_REQUIRED"},403);
 if(!ready())return reply({error:"CHAT_WRITE_NOT_CONFIGURED"},503);
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
  if(!(await checkCaptcha((input as Record<string,unknown>).turnstileToken,ip,new URL(request.url).hostname)))return reply({error:"BOT_CHECK_FAILED"},403);
  const id=crypto.randomUUID(),createdAt=new Date(now).toISOString();
  await db()!.prepare("INSERT INTO community_chat_messages(id,nickname,body,created_at,hidden) VALUES (?1,?2,?3,?4,0)").bind(id,draft.nickname,draft.body,createdAt).run();
  return reply({id,created_at:createdAt},201);
 }catch{return reply({error:"CHAT_STORAGE_NOT_READY"},503);}
}
