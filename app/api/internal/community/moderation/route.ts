import {env} from "cloudflare:workers";
export const runtime="edge";
type Bindings={DB_COMMUNITY?:D1Database;COMMUNITY_CHAT_ADMIN_SECRET?:string};
const bindings=env as unknown as Bindings;
function respond(x:unknown,status=200){return Response.json(x,{status,headers:{"cache-control":"no-store","x-robots-tag":"noindex,nofollow"}});}
function authorized(request:Request){
 const token=request.headers.get("authorization")??"";
 const expected="Bearer "+(bindings.COMMUNITY_CHAT_ADMIN_SECRET??"");
 if(!bindings.COMMUNITY_CHAT_ADMIN_SECRET||token.length!==expected.length)return false;
 let diff=0;for(let i=0;i<token.length;i++)diff|=token.charCodeAt(i)^expected.charCodeAt(i);
 return diff===0;
}
export async function GET(request:Request){
 if(!authorized(request))return respond({error:"UNAUTHORIZED"},401);
 if(!bindings.DB_COMMUNITY)return respond({error:"NOT_CONFIGURED"},503);
 try{const rows=await bindings.DB_COMMUNITY.prepare("SELECT r.message_id AS id,m.nickname,m.body,m.hidden,COUNT(*) AS reports FROM community_chat_reports r JOIN community_chat_messages m ON m.id=r.message_id GROUP BY r.message_id ORDER BY reports DESC LIMIT 100").all();
 return respond({reports:rows.results??[]});}catch{return respond({error:"STORAGE_UNAVAILABLE"},503);}
}
export async function POST(request:Request){
 if(!authorized(request))return respond({error:"UNAUTHORIZED"},401);
 if(!bindings.DB_COMMUNITY)return respond({error:"NOT_CONFIGURED"},503);
 let body:unknown;try{const raw=await request.text();if(raw.length>1024)return respond({error:"TOO_LARGE"},413);body=JSON.parse(raw);}catch{return respond({error:"INVALID_JSON"},400);}
 if(!body||typeof body!=="object"||Array.isArray(body))return respond({error:"INVALID_REQUEST"},400);
 const {action,messageId}=body as Record<string,unknown>;
 if(!["hide","restore","purge-old"].includes(String(action)))return respond({error:"INVALID_ACTION"},400);
 try{
  if(action==="purge-old"){
   const cutoff=new Date(Date.now()-30*86400000).toISOString();
   await bindings.DB_COMMUNITY.prepare("DELETE FROM community_chat_reports WHERE message_id IN (SELECT id FROM community_chat_messages WHERE created_at<?1)").bind(cutoff).run();
   const result=await bindings.DB_COMMUNITY.prepare("DELETE FROM community_chat_messages WHERE created_at<?1").bind(cutoff).run();
   return respond({purged:result.meta.changes??0});
  }
  if(typeof messageId!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(messageId))return respond({error:"INVALID_ID"},400);
  const result=await bindings.DB_COMMUNITY.prepare("UPDATE community_chat_messages SET hidden=?1 WHERE id=?2").bind(action==="hide"?1:0,messageId).run();
  return respond({changed:result.meta.changes??0});
 }catch{return respond({error:"STORAGE_UNAVAILABLE"},503);}
}
