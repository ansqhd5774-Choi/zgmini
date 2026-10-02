import {env} from "cloudflare:workers";
import {backfillEarningsE1R4OneYearToStore} from "../../../../lib/market-score/sec-earnings-e1-r4-provider.mjs";

const CONFIRM="E1_R4_ONE_YEAR_BACKFILL_20261002";
const headers={"cache-control":"no-store","x-robots-tag":"noindex, nofollow","x-content-type-options":"nosniff"};

export async function GET(){
 return Response.json({status:"METHOD_NOT_ALLOWED"},{status:405,headers});
}

export async function POST(request:Request){
 let body:any={};
 try{body=await request.json()}catch{}
 if(body?.confirm!==CONFIRM)return Response.json({status:"CONFIRMATION_MISMATCH",providerRequests:0},{status:400,headers});
 const asOf=new Date().toISOString().slice(0,10);
 const result=await backfillEarningsE1R4OneYearToStore({
  asOf,
  db:env.DB,
  fetchImpl:globalThis.fetch,
  now:()=>new Date(),
  maxPeriods:1,
 });
 return Response.json(result,{status:["COMPLETE","PARTIAL"].includes(String(result?.status))?200:503,headers});
}
