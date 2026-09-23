import {E1_R2_CALIBRATION,E1_R2_CALIBRATION_META} from "./earnings-e1-r2-calibration.mjs";

export const E1_R2_LIMITS=Object.freeze({
  epsCoverage:0.80,
  revenueCoverage:0.80,
  marginCoverage:0.65,
  breadthCoverage:0.80,
  minCalibrationPoints:8,
  minIssuerCount:480,
});

const finite=n=>typeof n==="number"&&Number.isFinite(n);
const clamp=n=>Math.max(0,Math.min(100,n));
const validDate=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(`${s}T00:00:00Z`));

function median(values){
  const x=values.filter(finite).sort((a,b)=>a-b);
  if(!x.length)return null;
  const i=Math.floor(x.length/2);
  return x.length%2?x[i]:(x[i-1]+x[i])/2;
}
function percentile(v,history,minN){
  const h=history.filter(finite);
  if(!finite(v)||h.length<minN)return null;
  let lt=0,eq=0;
  for(const x of h){if(x<v)lt++;else if(x===v)eq++}
  return 100*(lt+0.5*eq)/h.length;
}
function partial(reason,meta={}){
  return {
    id:"earnings",
    status:"PARTIAL",
    score:null,
    methodologyVersion:"E1-R2",
    source:"SEC EDGAR + Wikipedia",
    sourceAttribution:"SEC EDGAR; Wikipedia contributors (CC BY-SA 4.0)",
    universe:"Current S&P 500 constituent issuers, deduplicated by SEC CIK",
    financialMode:"LATEST_MATURE_CALENDAR_QUARTER",
    normalization:"EXPANDING_PERCENTILE_FROZEN_PIT_HISTORY",
    lookAheadSafeHistorical:false,
    currentOnly:true,
    missing:[reason],
    ...meta,
  };
}
function historyFor(key,periodEnd,calibration){
  return calibration.filter(r=>validDate(r?.asOf)&&r.asOf<periodEnd).map(r=>r?.[key]).filter(finite);
}

export function buildEarningsE1R2({
  asOfDate,
  financialPeriodEnd,
  issuerRows=[],
  calibration=E1_R2_CALIBRATION,
  universeMeta={},
  retrievedAt=new Date().toISOString(),
}={}){
  if(!validDate(asOfDate))return partial("INVALID_AS_OF_DATE");
  if(!validDate(financialPeriodEnd)||financialPeriodEnd>asOfDate)return partial("INVALID_FINANCIAL_PERIOD");
  if(!Array.isArray(issuerRows))return partial("INVALID_ISSUER_ROWS");
  if(!Array.isArray(calibration))return partial("INVALID_CALIBRATION");

  const byCik=new Map();
  for(const row of issuerRows){
    const cik=String(row?.cik??"").replace(/\D/g,"").padStart(10,"0");
    if(!/^\d{10}$/.test(cik)||cik==="0000000000")continue;
    if(byCik.has(cik))return partial("DUPLICATE_ISSUER_CIK",{cik});
    byCik.set(cik,{
      cik,
      epsGrowth:finite(row?.epsGrowth)?row.epsGrowth:null,
      revenueGrowth:finite(row?.revenueGrowth)?row.revenueGrowth:null,
      operatingMargin:finite(row?.operatingMargin)?row.operatingMargin:null,
    });
  }
  const rows=[...byCik.values()];
  const issuerCount=rows.length;
  if(issuerCount<E1_R2_LIMITS.minIssuerCount){
    return partial("LOW_ISSUER_UNIVERSE_COUNT",{quality:{issuerCount,required:E1_R2_LIMITS.minIssuerCount}});
  }

  const eps=rows.map(x=>x.epsGrowth).filter(finite);
  const revenue=rows.map(x=>x.revenueGrowth).filter(finite);
  const margin=rows.map(x=>x.operatingMargin).filter(finite);
  const epsBreadth=eps.length?eps.filter(x=>x>0).length/eps.length:null;

  const quality={
    issuerCount,
    epsCoverage:eps.length/issuerCount,
    revenueCoverage:revenue.length/issuerCount,
    marginCoverage:margin.length/issuerCount,
    breadthCoverage:eps.length/issuerCount,
    securityCount:universeMeta.securityCount??null,
    validCikSecurityCount:universeMeta.validCikSecurityCount??null,
    uniqueIssuerCount:universeMeta.uniqueIssuerCount??issuerCount,
    wikipediaRevisionId:universeMeta.wikipediaRevisionId??null,
    providerRequests:universeMeta.providerRequests??null,
    frameFailures:universeMeta.frameFailures??[],
  };
  const gates=[
    ["LOW_EPS_COUNT_COVERAGE",quality.epsCoverage,E1_R2_LIMITS.epsCoverage],
    ["LOW_REVENUE_COUNT_COVERAGE",quality.revenueCoverage,E1_R2_LIMITS.revenueCoverage],
    ["LOW_MARGIN_COUNT_COVERAGE",quality.marginCoverage,E1_R2_LIMITS.marginCoverage],
    ["LOW_BREADTH_COUNT_COVERAGE",quality.breadthCoverage,E1_R2_LIMITS.breadthCoverage],
  ];
  for(const [reason,value,required] of gates){
    if(value<required)return partial(reason,{quality:{...quality,requiredCoverage:required}});
  }

  const raw={
    eps:median(eps),
    margin:median(margin),
    revenue:median(revenue),
    epsBreadth,
  };
  const scores={};
  const calibrationCounts={};
  for(const key of ["eps","margin","revenue","epsBreadth"]){
    const h=historyFor(key,financialPeriodEnd,calibration);
    calibrationCounts[key]=h.length;
    scores[key]=percentile(raw[key],h,E1_R2_LIMITS.minCalibrationPoints);
    if(!finite(scores[key])){
      return partial(`INSUFFICIENT_${key.toUpperCase()}_CALIBRATION`,{
        quality:{...quality,calibrationCounts},
        financialPeriodEnd,
      });
    }
  }
  const score=clamp(
    0.35*scores.eps+
    0.25*scores.margin+
    0.20*scores.revenue+
    0.20*scores.epsBreadth
  );
  const indicators=[
    {name:"EPS 성장률",status:"READY",score:scores.eps,value:raw.eps*100,unit:"%",asOfDate:financialPeriodEnd,source:"SEC EDGAR XBRL Frames"},
    {name:"매출 성장률",status:"READY",score:scores.revenue,value:raw.revenue*100,unit:"%",asOfDate:financialPeriodEnd,source:"SEC EDGAR XBRL Frames"},
    {name:"이익 성장 종목 비율",status:"READY",score:scores.epsBreadth,value:raw.epsBreadth*100,unit:"%",asOfDate:financialPeriodEnd,source:"SEC EDGAR XBRL Frames"},
    {name:"영업이익률",status:"READY",score:scores.margin,value:raw.margin*100,unit:"%",asOfDate:financialPeriodEnd,source:"SEC EDGAR XBRL Frames"},
  ];

  return {
    id:"earnings",
    status:"READY",
    score,
    state:null,
    methodologyVersion:"E1-R2",
    asOfDate,
    financialPeriodEnd,
    retrievedAt,
    updatedAt:retrievedAt,
    source:"SEC EDGAR + Wikipedia",
    sourceAttribution:"SEC EDGAR; Wikipedia contributors (CC BY-SA 4.0)",
    universe:"Current S&P 500 constituent issuers, deduplicated by SEC CIK",
    financialMode:"LATEST_MATURE_CALENDAR_QUARTER",
    normalization:"EXPANDING_PERCENTILE_FROZEN_PIT_HISTORY",
    calibration:E1_R2_CALIBRATION_META,
    lookAheadSafeHistorical:false,
    currentOnly:true,
    interpretation:"SEC 공시 기반 기업 실적 강도. 현재 구성 종목을 CIK 기준으로 1회 집계하고 과거 PIT 분포에서 상대 위치를 계산합니다.",
    indicators,
    components:{
      epsGrowth:{raw:raw.eps,score:scores.eps,weight:0.35,coverage:quality.epsCoverage},
      margin:{raw:raw.margin,score:scores.margin,weight:0.25,coverage:quality.marginCoverage},
      revenueGrowth:{raw:raw.revenue,score:scores.revenue,weight:0.20,coverage:quality.revenueCoverage},
      earningsGrowthBreadth:{raw:raw.epsBreadth,score:scores.epsBreadth,weight:0.20,coverage:quality.breadthCoverage},
    },
    quality:{...quality,calibrationCounts},
    missing:[],
  };
}
