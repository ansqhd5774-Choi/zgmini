const B1_R1_LIMITS=Object.freeze({
  returnCoverage:0.98,
  tradingValueCoverage:0.98,
  linkedWeightCoverage:0.99,
  maxStaleTradingSessions:2,
});

const finite=n=>typeof n==="number"&&Number.isFinite(n);
const validDate=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s);

function partial(reason,quality={},meta={}){
  return {
    id:"breadth",
    status:"PARTIAL",
    score:null,
    methodologyVersion:"B1-R1",
    interpretation:"60% advance ratio + 40% close×volume value share",
    missing:[reason],
    quality,
    ...meta,
  };
}

export function buildBreadthB1R1({
  observationDate,
  snapshot,
  pricePairs=[],
  lagTradingSessions=0,
}={}){
  if(!validDate(observationDate)){
    return partial("INVALID_OBSERVATION_DATE");
  }
  if(!snapshot||snapshot.asOfDate!==observationDate||snapshot.isDaily!==true){
    return partial("PIT_SNAPSHOT_DATE_MISMATCH");
  }
  if(!Number.isInteger(snapshot.constituentCount)||snapshot.constituentCount<=0||!Array.isArray(snapshot.members)){
    return partial("INVALID_UNIVERSE_SNAPSHOT");
  }
  if(snapshot.members.length!==snapshot.constituentCount){
    return partial("INCOMPLETE_UNIVERSE_SNAPSHOT",{
      universeCount:snapshot.constituentCount,
      memberRows:snapshot.members.length,
    });
  }
  if(!Number.isInteger(lagTradingSessions)||lagTradingSessions<0){
    return partial("INVALID_STALENESS");
  }
  if(lagTradingSessions>B1_R1_LIMITS.maxStaleTradingSessions){
    return partial("STALE",{
      lagTradingSessions,
      maxStaleTradingSessions:B1_R1_LIMITS.maxStaleTradingSessions,
    });
  }

  const linkedTickers=new Set();
  let linkedRows=0;
  let unlinkedRows=0;
  let allWeight=0;
  let linkedWeight=0;
  let weightedRows=0;

  for(const member of snapshot.members){
    const linked=member?.isLinked===true;
    const weight=Number(member?.weight);
    if(finite(weight)&&weight>=0){
      allWeight+=weight;
      weightedRows++;
      if(linked) linkedWeight+=weight;
    }
    if(linked){
      const ticker=String(member?.ticker??"").trim();
      if(!ticker) return partial("LINKED_MEMBER_WITHOUT_TICKER");
      if(linkedTickers.has(ticker)) return partial("DUPLICATE_LINKED_TICKER",{ticker});
      linkedTickers.add(ticker);
      linkedRows++;
    }else{
      unlinkedRows++;
    }
  }

  if(snapshot.unlinkedCount!=null&&Number(snapshot.unlinkedCount)!==unlinkedRows){
    return partial("UNLINKED_COUNT_MISMATCH",{reported:snapshot.unlinkedCount,observed:unlinkedRows});
  }
  if(weightedRows!==snapshot.members.length||!(allWeight>0)){
    return partial("WEIGHT_COVERAGE_UNAVAILABLE",{
      universeCount:snapshot.constituentCount,
      weightedRows,
    });
  }

  const linkedWeightCoverage=linkedWeight/allWeight;
  if(linkedWeightCoverage<B1_R1_LIMITS.linkedWeightCoverage){
    return partial("LOW_LINKED_WEIGHT_COVERAGE",{
      universeCount:snapshot.constituentCount,
      linkedRows,
      unlinkedRows,
      linkedWeightCoverage,
      requiredLinkedWeightCoverage:B1_R1_LIMITS.linkedWeightCoverage,
    });
  }

  if(!Array.isArray(pricePairs)) return partial("INVALID_PRICE_PAIRS");
  const byTicker=new Map();
  for(const pair of pricePairs){
    const ticker=String(pair?.ticker??"").trim();
    if(!ticker) continue;
    if(byTicker.has(ticker)) return partial("DUPLICATE_PRICE_PAIR",{ticker});
    byTicker.set(ticker,pair);
  }

  let validReturnCount=0;
  let validTradingValueCount=0;
  let up=0,flat=0,down=0;
  let upValue=0,flatValue=0,downValue=0,totalTradingValue=0;
  const previousDates=new Set();

  for(const ticker of linkedTickers){
    const pair=byTicker.get(ticker);
    if(!pair) continue;

    const previousDate=String(pair.previousDate??"");
    const currentDate=String(pair.currentDate??"");
    if(currentDate!==observationDate||!validDate(previousDate)||previousDate>=currentDate) continue;

    const previousClose=Number(pair.previousClose);
    const currentClose=Number(pair.currentClose);
    const currentVolume=Number(pair.currentVolume);

    if(!finite(previousClose)||!finite(currentClose)||previousClose<=0||currentClose<=0) continue;

    previousDates.add(previousDate);
    validReturnCount++;
    let direction=0;
    if(currentClose>previousClose){ up++; direction=1; }
    else if(currentClose<previousClose){ down++; direction=-1; }
    else { flat++; direction=0; }

    if(!finite(currentVolume)||currentVolume<0) continue;
    const closeValueTurnover=currentClose*currentVolume;
    if(!finite(closeValueTurnover)||closeValueTurnover<0) continue;

    validTradingValueCount++;
    totalTradingValue+=closeValueTurnover;
    if(direction>0) upValue+=closeValueTurnover;
    else if(direction<0) downValue+=closeValueTurnover;
    else flatValue+=closeValueTurnover;
  }

  const universeCount=snapshot.constituentCount;
  const returnCoverage=validReturnCount/universeCount;
  const tradingValueCoverage=validTradingValueCount/universeCount;

  const quality={
    universeCount,
    linkedRows,
    unlinkedRows,
    validReturnCount,
    validTradingValueCount,
    returnCoverage,
    tradingValueCoverage,
    linkedWeightCoverage,
    lagTradingSessions,
    previousObservationDateCount:previousDates.size,
    up,
    flat,
    down,
    upCloseValueTurnover:upValue,
    flatCloseValueTurnover:flatValue,
    downCloseValueTurnover:downValue,
    totalCloseValueTurnover:totalTradingValue,
  };

  if(returnCoverage<B1_R1_LIMITS.returnCoverage){
    return partial("LOW_RETURN_COVERAGE",{
      ...quality,
      requiredReturnCoverage:B1_R1_LIMITS.returnCoverage,
    });
  }
  if(tradingValueCoverage<B1_R1_LIMITS.tradingValueCoverage){
    return partial("LOW_TRADING_VALUE_COVERAGE",{
      ...quality,
      requiredTradingValueCoverage:B1_R1_LIMITS.tradingValueCoverage,
    });
  }
  if(!(totalTradingValue>0)){
    return partial("ZERO_TOTAL_TRADING_VALUE",quality);
  }

  const advanceRatio=(up+0.5*flat)/validReturnCount;
  const advanceValueShare=(upValue+0.5*flatValue)/totalTradingValue;
  const raw=100*(0.60*advanceRatio+0.40*advanceValueShare);
  const score=Math.max(0,Math.min(100,raw));

  return {
    id:"breadth",
    status:"READY",
    score,
    methodologyVersion:"B1-R1",
    observationDate,
    source:snapshot.source??null,
    universe:"S&P 500 tracking-fund based breadth",
    interpretation:"60% advance ratio + 40% close×volume value share",
    turnoverDefinition:"close×volume derived turnover proxy; not exchange-reported exact dollar volume",
    components:{advanceRatio,advanceValueShare},
    quality,
    missing:[],
  };
}

export {B1_R1_LIMITS};
