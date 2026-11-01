import {buildBreadthB1R1} from "./breadth-b1-r1.mjs";
import {createBreadthB1R3Store} from "./breadth-b1-r3-store.mjs";
import {countCompletedSessionsSince,isMarketSession} from "./breadth-b1-r3-calendar.mjs";
import {
  B1_R4_METHOD,B1_R4_SOURCE,B1_R4_MIN_COVERAGE,
  B1_R4_DAILY_ADVANCE_WEIGHT,B1_R4_DAILY_VALUE_WEIGHT,
  B1_R4_CURRENT_WEIGHT,B1_R4_EMA5_WEIGHT,B1_R4_EMA20_WEIGHT,
  B1_R4_EMA5_PERIOD,B1_R4_EMA20_PERIOD,
} from "./breadth-b1-r4-contract.mjs";

export const B1_R4_READER="B1-R4-STORED-READER-R1";

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const clampScore=value=>Math.max(0,Math.min(100,value));
const validRatio=value=>finite(value)&&value>=0&&value<=1;

function previousCalendarDate(date){
  const [y,m,d]=date.split("-").map(Number);
  return new Date(Date.UTC(y,m-1,d)-86400000).toISOString().slice(0,10);
}
export function previousMarketSession(date){
  if(!validDate(date))return null;
  let cursor=previousCalendarDate(date);
  for(let guard=0;guard<10;guard++){
    if(isMarketSession(cursor))return cursor;
    cursor=previousCalendarDate(cursor);
  }
  return null;
}
function dailyScore(row){
  return clampScore(100*(
    B1_R4_DAILY_ADVANCE_WEIGHT*row.advanceRatio+
    B1_R4_DAILY_VALUE_WEIGHT*row.advanceValueShare
  ));
}
function emaStep(previous,value,period){
  if(!finite(previous))return value;
  const alpha=2/(period+1);
  return alpha*value+(1-alpha)*previous;
}
function storedSource(pairs=[]){
  const sources=[...new Set((Array.isArray(pairs)?pairs:[])
    .map(row=>typeof row?.source==="string"?row.source.trim():"")
    .filter(Boolean))];
  return {
    source:sources.length===1?sources[0]:(sources.length>1?"D1_STORED_MIXED_SOURCES":B1_R4_SOURCE),
    sources,
  };
}

export function buildBreadthB1R4Series(rows=[]){
  const byDate=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const tradeDate=String(row?.tradeDate??row?.trade_date??"");
    const advanceRatio=Number(row?.advanceRatio??row?.advance_ratio);
    const advanceValueShare=Number(row?.advanceValueShare??row?.advance_value_share);
    if(!validDate(tradeDate)||!isMarketSession(tradeDate)||!validRatio(advanceRatio)||!validRatio(advanceValueShare))continue;
    byDate.set(tradeDate,{tradeDate,advanceRatio,advanceValueShare});
  }

  let ema5=null,ema20=null,previousDate=null;
  const out=[];
  for(const row of [...byDate.values()].sort((a,b)=>a.tradeDate.localeCompare(b.tradeDate))){
    if(previousDate!==null&&previousMarketSession(row.tradeDate)!==previousDate){
      ema5=null;
      ema20=null;
    }
    const current=dailyScore(row);
    ema5=emaStep(ema5,current,B1_R4_EMA5_PERIOD);
    ema20=emaStep(ema20,current,B1_R4_EMA20_PERIOD);
    const value=clampScore(
      B1_R4_CURRENT_WEIGHT*current+
      B1_R4_EMA5_WEIGHT*ema5+
      B1_R4_EMA20_WEIGHT*ema20
    );
    out.push({
      label:row.tradeDate,
      value,
      dailyScore:current,
      ema5,
      ema20,
      advanceRatio:row.advanceRatio,
      advanceValueShare:row.advanceValueShare,
    });
    previousDate=row.tradeDate;
  }
  return out;
}

export async function readBreadthB1R4StoredScore({env={},db=env?.DB,store=null,asOfDate,now=()=>new Date()}={}){
  if(!validDate(String(asOfDate??"")))throw new TypeError("AS_OF_DATE_INVALID");
  const s=store??createBreadthB1R3Store(db,{initializeSchema:false});
  await s.initialize();

  const universes=await s.latestUniverses(asOfDate,10);
  let chosen=null,pairs=[];
  for(const universe of universes){
    const storedPairs=await s.getPairs(universe.trade_date);
    if(universe.memberCount>0&&storedPairs.length/universe.memberCount>=B1_R4_MIN_COVERAGE){
      chosen=universe;
      pairs=storedPairs;
      break;
    }
  }

  if(!chosen){
    return {
      id:"breadth",status:"PARTIAL",score:null,methodologyVersion:B1_R4_METHOD,
      source:B1_R4_SOURCE,missing:["B1_R4_STORED_COVERAGE_MISSING"],
      providerRequests:0,storageMode:"D1_STORED_ONLY",
    };
  }

  const instant=typeof now==="function"?now():new Date();
  const lag=countCompletedSessionsSince(chosen.trade_date,instant);
  const provenance=storedSource(pairs);

  const dailyResult=buildBreadthB1R1({
    observationDate:chosen.trade_date,
    snapshot:{
      asOfDate:chosen.trade_date,isDaily:true,constituentCount:chosen.memberCount,unlinkedCount:0,
      source:provenance.source,
      members:chosen.members.map(ticker=>({ticker,weight:1,isLinked:true})),
    },
    pricePairs:pairs.map(row=>({
      ticker:row.ticker,previousDate:row.previous_date,currentDate:row.trade_date,
      previousClose:row.previous_close,currentClose:row.current_close,currentVolume:row.current_volume,
    })),
    lagTradingSessions:lag,
  });

  if(dailyResult.status!=="READY"||!finite(dailyResult.score)){
    return {
      ...dailyResult,
      score:null,
      methodologyVersion:B1_R4_METHOD,
      source:provenance.source,
      sourceList:provenance.sources,
      providerRequests:0,
      storageMode:"D1_STORED_ONLY",
      runtime:{asOfDate,observationDate:chosen.trade_date,lagTradingSessions:lag,storedPairCount:pairs.length,universeCount:chosen.memberCount},
    };
  }

  const trendRows=typeof s.getScoreTrend==="function"
    ? await s.getScoreTrend(asOfDate,{limit:260,minCoverage:B1_R4_MIN_COVERAGE})
    : [];
  const rows=(Array.isArray(trendRows)?trendRows:[]).filter(row=>String(row?.tradeDate??row?.trade_date)!==chosen.trade_date);
  rows.push({
    tradeDate:chosen.trade_date,
    advanceRatio:dailyResult.components.advanceRatio,
    advanceValueShare:dailyResult.components.advanceValueShare,
  });
  const series=buildBreadthB1R4Series(rows);
  const current=series.find(point=>point.label===chosen.trade_date)??null;

  if(!current){
    return {
      ...dailyResult,
      status:"PARTIAL",score:null,methodologyVersion:B1_R4_METHOD,
      source:provenance.source,sourceList:provenance.sources,
      missing:["B1_R4_CURRENT_SERIES_MISSING"],
      providerRequests:0,storageMode:"D1_STORED_ONLY",
      trend:series.map(({label,value})=>({label,value})),
      runtime:{asOfDate,observationDate:chosen.trade_date,lagTradingSessions:lag,storedPairCount:pairs.length,universeCount:chosen.memberCount},
    };
  }

  return {
    ...dailyResult,
    status:"READY",
    score:current.value,
    methodologyVersion:B1_R4_METHOD,
    source:provenance.source,
    sourceList:provenance.sources,
    universe:"stored S&P 500 universe snapshot",
    interpretation:"B1-R4: 당일 시장폭 50% + EMA5 30% + EMA20 20%; 당일 시장폭은 상승종목비율 60% + 상승거래대금비율 40%",
    turnoverDefinition:"stored close×volume derived turnover proxy; not assumed to be consolidated SIP dollar volume",
    smoothing:{
      dailyScore:current.dailyScore,
      ema5:current.ema5,
      ema20:current.ema20,
      weights:{daily:B1_R4_CURRENT_WEIGHT,ema5:B1_R4_EMA5_WEIGHT,ema20:B1_R4_EMA20_WEIGHT},
    },
    providerRequests:0,
    storageMode:"D1_STORED_ONLY",
    trend:series.map(({label,value})=>({label,value})),
    runtime:{asOfDate,observationDate:chosen.trade_date,lagTradingSessions:lag,storedPairCount:pairs.length,universeCount:chosen.memberCount},
  };
}
