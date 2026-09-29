import {env} from "cloudflare:workers";
import {
  B1_R3_HISTORY_INGEST_R2,
  ingestBreadthB1R3HistoricalPayloadR2,
} from "../../../../lib/market-score/breadth-b1-r3-history-ingest-r2.mjs";

const MAX_BODY_BYTES=750000;

function json(body:unknown,status=200){
  return new Response(JSON.stringify(body),{
    status,
    headers:{
      "content-type":"application/json; charset=utf-8",
      "cache-control":"no-store",
      "x-robots-tag":"noindex",
    },
  });
}

async function digestHex(value:string){
  const bytes=new TextEncoder().encode(value);
  const hash=await crypto.subtle.digest("SHA-256",bytes);
  return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,"0")).join("");
}

async function authorized(request:Request){
  const expected=String((env as any)?.B1_R3_HISTORY_IMPORT_SECRET??"");
  if(!expected)return {ok:false,status:503,code:"B1_R3_HISTORY_IMPORT_SECRET_MISSING"};
  const header=String(request.headers.get("authorization")??"");
  if(!header.startsWith("Bearer "))return {ok:false,status:401,code:"UNAUTHORIZED"};
  const supplied=header.slice(7);
  if(!supplied)return {ok:false,status:401,code:"UNAUTHORIZED"};
  const [a,b]=await Promise.all([digestHex(supplied),digestHex(expected)]);
  if(a!==b)return {ok:false,status:401,code:"UNAUTHORIZED"};
  return {ok:true,status:200,code:"AUTHORIZED"};
}

export async function POST(request:Request){
  const auth=await authorized(request);
  if(!auth.ok)return json({status:"ERROR",code:auth.code,ingestVersion:B1_R3_HISTORY_INGEST_R2},auth.status);

  const length=Number(request.headers.get("content-length")??0);
  if(Number.isFinite(length)&&length>MAX_BODY_BYTES)return json({status:"ERROR",code:"PAYLOAD_TOO_LARGE"},413);

  let payload:any;
  try{payload=await request.json()}catch{return json({status:"ERROR",code:"JSON_INVALID"},400)}

  try{
    const result=await ingestBreadthB1R3HistoricalPayloadR2({env,payload});
    if(result.status==="PAUSED_LIVE_PRIORITY")return json(result,409);
    return json(result,200);
  }catch(error:any){
    const message=String(error?.message??error??"INGEST_ERROR");
    const client=/PAYLOAD|CONTRACT|DATE|UNIVERSE|ROW_|PROTECTED|PREVIOUS|EXISTING_|SEMANTIC_/i.test(message);
    return json({
      status:"ERROR",
      code:message.slice(0,200),
      ingestVersion:B1_R3_HISTORY_INGEST_R2,
      providerRequests:0,
    },client?400:500);
  }
}

export async function GET(){
  return json({status:"ERROR",code:"METHOD_NOT_ALLOWED",ingestVersion:B1_R3_HISTORY_INGEST_R2},405);
}
