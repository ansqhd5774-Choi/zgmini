
import {buildBreadthB1R1} from "./breadth-b1-r1.mjs";
import {B1_R3_METHOD,B1_R3_MIN_COVERAGE} from "./breadth-b1-r3-contract.mjs";
import {createBreadthB1R3Store} from "./breadth-b1-r3-store.mjs";

export const B1_R3_HISTORY_SCORE_R4="B1-R3-HISTORY-STORED-SCORE-R4";
export const B1_R3_HISTORY_PRICE_SOURCE="MarketParquet Free Sample";
export const B1_R3_HISTORY_SOURCE_CONTRACT="ZGMINI_B1_PRICE_SOURCE_CONTRACT_R4";

const validDate=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v);
const finite=n=>typeof n==="number"&&Number.isFinite(n);

function partial(reason,tradeDate,extra={}){
  return {
    id:"breadth",
    status:"PARTIAL",
    score:null,
    methodologyVersion:B1_R3_METHOD,
    source:B1_R3_HISTORY_PRICE_SOURCE,
    provider:"MARKETPARQUET_FREE",
    historicalSourceContract:B1_R3_HISTORY_SOURCE_CONTRACT,
    observationDate:tradeDate??null,
    missing:[reason],
    providerRequests:0,
    storageMode:"D1_STORED_ONLY",
    ...extra,
  };
}

function normalizeStoredPair(row,tradeDate){
  const ticker=String(row?.ticker??"").trim();
  const previousDate=String(row?.previous_date??row?.previousDate??"").trim();
  const currentDate=String(row?.trade_date??row?.currentDate??"").trim();
  const previousClose=Number(row?.previous_close??row?.previousClose);
  const currentClose=Number(row?.current_close??row?.currentClose);
  const currentVolume=Number(row?.current_volume??row?.currentVolume);
  if(!ticker||currentDate!==tradeDate||!validDate(previousDate)||previousDate>=tradeDate)return null;
  if(!finite(previousClose)||!finite(currentClose)||!finite(currentVolume)||previousClose<=0||currentClose<=0||currentVolume<0)return null;
  return {ticker,previousDate,currentDate,previousClose,currentClose,currentVolume};
}

export async function readBreadthB1R3StoredHistoricalScoreR4({
  env={},db=env?.DB,store=null,tradeDate,expectedPreviousDate=null,
}={}){
  if(!validDate(tradeDate))throw new TypeError("TRADE_DATE_INVALID");
  if(expectedPreviousDate!=null&&(!validDate(expectedPreviousDate)||expectedPreviousDate>=tradeDate)){
    throw new TypeError("EXPECTED_PREVIOUS_DATE_INVALID");
  }
  const s=store??createBreadthB1R3Store(db);
  await s.initialize();
  const universe=await s.getUniverse(tradeDate);
  if(!universe||!Array.isArray(universe.members)||!Number.isInteger(universe.memberCount)||universe.memberCount<=0){
    return partial("B1_R3_EXACT_UNIVERSE_MISSING",tradeDate);
  }
  if(universe.members.length!==universe.memberCount){
    return partial("B1_R3_EXACT_UNIVERSE_INCOMPLETE",tradeDate,{
      quality:{universeCount:universe.memberCount,memberRows:universe.members.length},
    });
  }
  const uniqueMembers=new Set(universe.members.map(x=>String(x??"").trim()).filter(Boolean));
  if(uniqueMembers.size!==universe.memberCount){
    return partial("B1_R3_EXACT_UNIVERSE_DUPLICATE",tradeDate,{
      quality:{universeCount:universe.memberCount,uniqueMembers:uniqueMembers.size},
    });
  }

  const rawPairs=await s.getPairs(tradeDate);
  const seen=new Set(),pairs=[],previousDates=new Set();
  for(const row of rawPairs??[]){
    const p=normalizeStoredPair(row,tradeDate);
    if(!p)continue;
    if(seen.has(p.ticker)){
      return partial("B1_R3_STORED_DUPLICATE_TICKER",tradeDate,{quality:{ticker:p.ticker}});
    }
    seen.add(p.ticker);pairs.push(p);previousDates.add(p.previousDate);
  }
  if(expectedPreviousDate!=null){
    if(previousDates.size>0&&(previousDates.size!==1||!previousDates.has(expectedPreviousDate))){
      return partial("B1_R3_PREVIOUS_OBSERVATION_MISMATCH",tradeDate,{
        quality:{expectedPreviousDate,observedPreviousDates:[...previousDates].sort()},
      });
    }
  }else if(previousDates.size>1){
    return partial("B1_R3_MIXED_PREVIOUS_OBSERVATIONS",tradeDate,{
      quality:{observedPreviousDates:[...previousDates].sort()},
    });
  }

  const result=buildBreadthB1R1({
    observationDate:tradeDate,
    snapshot:{
      asOfDate:tradeDate,
      isDaily:true,
      constituentCount:universe.memberCount,
      unlinkedCount:0,
      source:"S&P 500 PIT universe + MarketParquet Daily EOD",
      members:[...uniqueMembers].sort().map(ticker=>({ticker,weight:1,isLinked:true})),
    },
    pricePairs:pairs,
    lagTradingSessions:0,
  });
  return {
    ...result,
    methodologyVersion:B1_R3_METHOD,
    source:B1_R3_HISTORY_PRICE_SOURCE,
    provider:"MARKETPARQUET_FREE",
    historicalSourceContract:B1_R3_HISTORY_SOURCE_CONTRACT,
    providerRequests:0,
    storageMode:"D1_STORED_ONLY",
    runtime:{
      observationDate:tradeDate,
      storedPairCount:pairs.length,
      universeCount:universe.memberCount,
      expectedPreviousDate:expectedPreviousDate??([...previousDates][0]??null),
    },
    provenance:{
      universe:universe.provenance??null,
      rawSourceRows:Array.isArray(rawPairs)?rawPairs.length:0,
    },
  };
}

export async function materializeBreadthB1R3StoredHistoricalScoresR4({
  env={},db=env?.DB,store=null,tradeDates,previousByDate={},maxDates=260,
}={}){
  if(!Array.isArray(tradeDates))throw new TypeError("TRADE_DATES_REQUIRED");
  if(!Number.isInteger(maxDates)||maxDates<1||maxDates>366)throw new TypeError("MAX_DATES_INVALID");
  if(tradeDates.length>maxDates)throw new Error("TRADE_DATE_BATCH_EXCEEDS_BOUND");
  const seen=new Set();let prior=null;
  for(const td of tradeDates){
    if(!validDate(td))throw new TypeError("TRADE_DATE_INVALID");
    if(seen.has(td))throw new Error("DUPLICATE_TRADE_DATE");
    if(prior&&td<=prior)throw new Error("TRADE_DATES_NOT_ASCENDING");
    seen.add(td);prior=td;
  }
  const s=store??createBreadthB1R3Store(db);
  await s.initialize();
  const scores=[],rejected=[];
  for(const tradeDate of tradeDates){
    const expectedPreviousDate=previousByDate?.[tradeDate]??null;
    const result=await readBreadthB1R3StoredHistoricalScoreR4({
      store:s,tradeDate,expectedPreviousDate,
    });
    if(result.status==="READY"&&finite(result.score)){
      scores.push({
        tradeDate,
        score:result.score,
        components:result.components,
        quality:result.quality,
        methodologyVersion:result.methodologyVersion,
        source:result.source,
      });
    }else{
      rejected.push({tradeDate,status:result.status,score:null,missing:result.missing??[]});
    }
  }
  return {
    builderVersion:B1_R3_HISTORY_SCORE_R4,
    historicalSourceContract:B1_R3_HISTORY_SOURCE_CONTRACT,
    providerRequests:0,
    storageMode:"D1_STORED_ONLY",
    attemptedDates:tradeDates.length,
    validDates:scores.length,
    rejectedDates:rejected.length,
    duplicateDates:0,
    scores,
    rejected,
  };
}
