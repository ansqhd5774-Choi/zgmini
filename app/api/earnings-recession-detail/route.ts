import {env} from "cloudflare:workers";
import {marketOperationalStore} from "../../../worker/market-operational-store.mjs";
import {readEarningsE1R4StoredScore} from "../../../lib/market-score/sec-earnings-e1-r4-provider.mjs";

const finite=(v:unknown):v is number=>typeof v==="number"&&Number.isFinite(v);
const validDate=(v:unknown):v is string=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v);
const stableId=(name:string)=>{
 if(name==="EPS 성장률")return "epsGrowth";
 if(name==="영업이익률")return "margin";
 if(name==="매출 성장률")return "revenueGrowth";
 if(name==="이익 성장 종목 비율")return "earningsGrowthBreadth";
 return name;
};

export async function GET(){
 const store=marketOperationalStore(env.DB);
 let snapshot:any=null;
 try{snapshot=await store.readScore()}catch{}
 const body=snapshot?.body??{};
 const asOf=validDate(body?.asOfDate)?body.asOfDate:new Date().toISOString().slice(0,10);
 const diagnostic=body?.diagnostics8?.earningsRecessionDefense??null;
 const stored=await readEarningsE1R4StoredScore({asOf,db:env.DB});

 const indicators=(stored?.indicators??[]).map((x:any)=>({
  id:stableId(String(x?.name??"")),
  name:x?.name??null,
  status:x?.status??"PARTIAL",
  score:finite(x?.score)?x.score:null,
  value:finite(x?.value)?x.value:null,
  unit:x?.unit??"",
  observationDate:x?.asOfDate??stored?.financialPeriodEnd??null,
  source:x?.source??"SEC EDGAR XBRL Frames",
 }));

 const components={
  epsGrowth:{weight:stored?.components?.epsGrowth?.weight??0.35,coverage:stored?.components?.epsGrowth?.coverage??null},
  margin:{weight:stored?.components?.margin?.weight??0.25,coverage:stored?.components?.margin?.coverage??null},
  revenueGrowth:{weight:stored?.components?.revenueGrowth?.weight??0.20,coverage:stored?.components?.revenueGrowth?.coverage??null},
  earningsGrowthBreadth:{weight:stored?.components?.earningsGrowthBreadth?.weight??0.20,coverage:stored?.components?.earningsGrowthBreadth?.coverage??null},
 };

 return Response.json({
  status:diagnostic?.status??"PARTIAL",
  score:diagnostic?.status==="READY"&&finite(diagnostic?.score)?diagnostic.score:null,
  missingFactors:Array.isArray(diagnostic?.missingFactors)?diagnostic.missingFactors:[],
  asOfDate:asOf,
  methodologyVersion:"EARNINGS_RECESSION_DIAGNOSTIC_R1",
  storedE1:{
   status:stored?.status??"PARTIAL",
   score:finite(stored?.score)?stored.score:null,
   methodologyVersion:stored?.methodologyVersion??"E1-R4",
   financialPeriodEnd:stored?.financialPeriodEnd??null,
   updatedAt:stored?.updatedAt??stored?.retrievedAt??null,
   issuerCount:stored?.quality?.issuerCount??null,
   indicators,
   components,
   trend:Array.isArray(stored?.trend)?stored.trend.filter((x:any)=>validDate(x?.label)&&finite(x?.value)):[],
   persistence:stored?.persistence??null,
   missing:Array.isArray(stored?.missing)?stored.missing:[],
  },
 },{headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}});
}
