import {buildBreadthB1R1} from "./breadth-b1-r1.mjs";
import {B1_R3_METHOD,B1_R3_MIN_COVERAGE,B1_R3_PROVIDER,IEX_ATTRIBUTION} from "./breadth-b1-r3-contract.mjs";
import {createBreadthB1R3Store} from "./breadth-b1-r3-store.mjs";
import {countCompletedSessionsSince} from "./breadth-b1-r3-calendar.mjs";
export const B1_R3_READER="B1-R3-STORED-READER-R1";

export async function readBreadthB1R3StoredScore({env={},db=env?.DB,store=null,asOfDate,now=()=>new Date()}={}){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(asOfDate??"")))throw new TypeError("AS_OF_DATE_INVALID");
  const s=store??createBreadthB1R3Store(db);await s.initialize();
  const universes=await s.latestUniverses(asOfDate,10);
  let chosen=null,pairs=[];
  for(const u of universes){
    const p=await s.getPairs(u.trade_date);
    if(u.memberCount>0&&p.length/u.memberCount>=B1_R3_MIN_COVERAGE){chosen=u;pairs=p;break}
  }
  if(!chosen){
    return {id:"breadth",status:"PARTIAL",score:null,methodologyVersion:B1_R3_METHOD,source:B1_R3_PROVIDER,missing:["B1_R3_STORED_COVERAGE_MISSING"],providerRequests:0,storageMode:"D1_STORED_ONLY"};
  }
  const instant=typeof now==="function"?now():new Date();
  const lag=countCompletedSessionsSince(chosen.trade_date,instant);
  const result=buildBreadthB1R1({
    observationDate:chosen.trade_date,
    snapshot:{
      asOfDate:chosen.trade_date,isDaily:true,constituentCount:chosen.memberCount,unlinkedCount:0,
      source:"S&P 500 PDDL universe + IEX HIST single-venue bars",
      members:chosen.members.map(ticker=>({ticker,weight:1,isLinked:true})),
    },
    pricePairs:pairs.map(p=>({
      ticker:p.ticker,previousDate:p.previous_date,currentDate:p.trade_date,
      previousClose:p.previous_close,currentClose:p.current_close,currentVolume:p.current_volume,
    })),
    lagTradingSessions:lag,
  });
  const trendRows=typeof s.getScoreTrend==="function"
    ? await s.getScoreTrend(asOfDate,{limit:260,minCoverage:B1_R3_MIN_COVERAGE})
    : [];
  const trend=trendRows.map(row=>({
    label:row.tradeDate,
    value:Math.max(0,Math.min(100,100*(0.60*row.advanceRatio+0.40*row.advanceValueShare))),
  }));
  return {
    ...result,
    methodologyVersion:B1_R3_METHOD,
    source:"IEX HIST via bars.sophostechne.com",
    provider:B1_R3_PROVIDER,
    attribution:IEX_ATTRIBUTION,
    universe:"S&P 500 current-constituent daily snapshot (PDDL)",
    interpretation:"60% advance ratio + 40% IEX single-venue close×volume value share",
    turnoverDefinition:"IEX single-venue close×volume derived turnover proxy; not SIP/consolidated dollar volume",
    providerRequests:0,
    storageMode:"D1_STORED_ONLY",
    trend,
    runtime:{asOfDate,observationDate:chosen.trade_date,lagTradingSessions:lag,storedPairCount:pairs.length,universeCount:chosen.memberCount},
  };
}
