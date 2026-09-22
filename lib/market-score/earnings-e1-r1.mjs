const E1_R1_LIMITS=Object.freeze({
  countCoverage:0.80,
  marketCapCoverage:0.95,
  linkedWeightCoverage:0.99,
  maxStaleTradingSessions:2,
  maxCacheAgeDays:7,
});

const finite=n=>typeof n==="number"&&Number.isFinite(n);
const validDate=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s);
const clamp=n=>Math.max(0,Math.min(100,n));

function median(values){
  const sorted=[...values].sort((a,b)=>a-b);
  if(!sorted.length)return null;
  const mid=Math.floor(sorted.length/2);
  return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;
}

function partial(reason,quality={},meta={}){
  return {
    id:"earnings",
    status:"PARTIAL",
    score:null,
    methodologyVersion:"E1-R1",
    source:"Equibles",
    universe:"S&P 500 tracking-fund based earnings health",
    financialMode:"CURRENT_LATEST_REPORTED",
    lookAheadSafeHistorical:false,
    missing:[reason],
    quality,
    ...meta,
  };
}

function componentQuality(linkedTickers,rowsByTicker,key,totalMarketCap){
  let validCount=0,validMarketCap=0;
  const values=[];
  for(const ticker of linkedTickers){
    const row=rowsByTicker.get(ticker);
    const value=row?.[key];
    if(!finite(value))continue;
    validCount++;
    validMarketCap+=Number(row.marketcap);
    values.push(value);
  }
  return {
    validCount,
    countCoverage:validCount/linkedTickers.length,
    marketCapCoverage:validMarketCap/totalMarketCap,
    rawMedian:median(values),
  };
}

export function buildEarningsE1R1({
  observationDate,
  snapshot,
  screenerRows=[],
  lagTradingSessions=0,
  retrievedAt,
  now=new Date().toISOString(),
}={}){
  if(!validDate(observationDate))return partial("INVALID_OBSERVATION_DATE");
  if(!snapshot||snapshot.asOfDate!==observationDate||snapshot.isDaily!==true){
    return partial("UNIVERSE_SNAPSHOT_DATE_MISMATCH");
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
  if(lagTradingSessions>E1_R1_LIMITS.maxStaleTradingSessions){
    return partial("STALE",{
      lagTradingSessions,
      maxStaleTradingSessions:E1_R1_LIMITS.maxStaleTradingSessions,
    });
  }

  const nowMs=Date.parse(now);
  const retrievedMs=Date.parse(retrievedAt);
  if(!Number.isFinite(nowMs)||!Number.isFinite(retrievedMs)||retrievedMs>nowMs){
    return partial("INVALID_RETRIEVED_AT");
  }
  const cacheAgeDays=(nowMs-retrievedMs)/86400000;
  if(cacheAgeDays>E1_R1_LIMITS.maxCacheAgeDays){
    return partial("STALE_CACHE",{
      cacheAgeDays,
      maxCacheAgeDays:E1_R1_LIMITS.maxCacheAgeDays,
    });
  }

  const linkedTickers=[];
  const seen=new Set();
  let allWeight=0,linkedWeight=0,weightedRows=0,unlinkedRows=0;

  for(const member of snapshot.members){
    const linked=member?.isLinked===true;
    const weight=Number(member?.weight);
    if(finite(weight)&&weight>=0){
      allWeight+=weight;
      weightedRows++;
      if(linked)linkedWeight+=weight;
    }
    if(linked){
      const ticker=String(member?.ticker??"").trim().toUpperCase();
      if(!ticker)return partial("LINKED_MEMBER_WITHOUT_TICKER");
      if(seen.has(ticker))return partial("DUPLICATE_LINKED_TICKER",{ticker});
      seen.add(ticker);
      linkedTickers.push(ticker);
    }else{
      unlinkedRows++;
    }
  }

  if(snapshot.unlinkedCount!=null&&Number(snapshot.unlinkedCount)!==unlinkedRows){
    return partial("UNLINKED_COUNT_MISMATCH",{
      reported:snapshot.unlinkedCount,
      observed:unlinkedRows,
    });
  }
  if(weightedRows!==snapshot.members.length||!(allWeight>0)){
    return partial("WEIGHT_COVERAGE_UNAVAILABLE");
  }

  const linkedWeightCoverage=linkedWeight/allWeight;
  if(linkedWeightCoverage<E1_R1_LIMITS.linkedWeightCoverage){
    return partial("LOW_LINKED_WEIGHT_COVERAGE",{
      linkedWeightCoverage,
      requiredLinkedWeightCoverage:E1_R1_LIMITS.linkedWeightCoverage,
    });
  }
  if(!linkedTickers.length)return partial("NO_LINKED_CONSTITUENTS");
  if(!Array.isArray(screenerRows))return partial("INVALID_SCREENER_ROWS");

  const rowsByTicker=new Map();
  for(const input of screenerRows){
    const ticker=String(input?.ticker??"").trim().toUpperCase();
    if(!ticker)continue;
    if(rowsByTicker.has(ticker))return partial("DUPLICATE_SCREENER_TICKER",{ticker});
    rowsByTicker.set(ticker,{
      ticker,
      marketcap:Number(input.marketcap),
      epsgrowth:input.epsgrowth==null?null:Number(input.epsgrowth),
      opmargin:input.opmargin==null?null:Number(input.opmargin),
      revgrowth:input.revgrowth==null?null:Number(input.revgrowth),
    });
  }

  let totalMarketCap=0;
  for(const ticker of linkedTickers){
    const cap=Number(rowsByTicker.get(ticker)?.marketcap);
    if(!finite(cap)||cap<=0){
      return partial("MARKET_CAP_DENOMINATOR_INCOMPLETE",{
        ticker,
        linkedRows:linkedTickers.length,
        linkedWeightCoverage,
      });
    }
    totalMarketCap+=cap;
  }

  const eps=componentQuality(linkedTickers,rowsByTicker,"epsgrowth",totalMarketCap);
  const margin=componentQuality(linkedTickers,rowsByTicker,"opmargin",totalMarketCap);
  const revenue=componentQuality(linkedTickers,rowsByTicker,"revgrowth",totalMarketCap);

  let positiveEps=0;
  for(const ticker of linkedTickers){
    const value=Number(rowsByTicker.get(ticker)?.epsgrowth);
    if(finite(value)&&value>0)positiveEps++;
  }
  const breadth={
    ...eps,
    positiveCount:positiveEps,
    rawPercent:eps.validCount?100*positiveEps/eps.validCount:null,
  };

  const componentMap={epsGrowth:eps,margin,revenueGrowth:revenue,earningsGrowthBreadth:breadth};
  for(const [id,q] of Object.entries(componentMap)){
    if(q.countCoverage<E1_R1_LIMITS.countCoverage){
      return partial(`LOW_${id.toUpperCase()}_COUNT_COVERAGE`,{
        linkedRows:linkedTickers.length,
        linkedWeightCoverage,
        cacheAgeDays,
        lagTradingSessions,
        components:componentMap,
      });
    }
    if(q.marketCapCoverage<E1_R1_LIMITS.marketCapCoverage){
      return partial(`LOW_${id.toUpperCase()}_MARKET_CAP_COVERAGE`,{
        linkedRows:linkedTickers.length,
        linkedWeightCoverage,
        cacheAgeDays,
        lagTradingSessions,
        components:componentMap,
      });
    }
  }

  const epsGrowthScore=clamp(50+2*eps.rawMedian);
  const marginScore=clamp(5*margin.rawMedian);
  const revenueGrowthScore=clamp(50+5*revenue.rawMedian);
  const earningsGrowthBreadthScore=clamp(breadth.rawPercent);

  const score=
    0.35*epsGrowthScore+
    0.25*marginScore+
    0.20*revenueGrowthScore+
    0.20*earningsGrowthBreadthScore;

  return {
    id:"earnings",
    status:"READY",
    score,
    methodologyVersion:"E1-R1",
    observationDate,
    retrievedAt:new Date(retrievedMs).toISOString(),
    source:"Equibles",
    sourceAttribution:"Data by Equibles",
    universe:"S&P 500 tracking-fund based earnings health",
    financialMode:"CURRENT_LATEST_REPORTED",
    lookAheadSafeHistorical:false,
    components:{
      epsGrowth:{raw:eps.rawMedian,score:epsGrowthScore,weight:0.35},
      margin:{raw:margin.rawMedian,score:marginScore,weight:0.25},
      revenueGrowth:{raw:revenue.rawMedian,score:revenueGrowthScore,weight:0.20},
      earningsGrowthBreadth:{raw:breadth.rawPercent,score:earningsGrowthBreadthScore,weight:0.20},
    },
    quality:{
      universeCount:snapshot.constituentCount,
      linkedRows:linkedTickers.length,
      unlinkedRows,
      linkedWeightCoverage,
      totalLinkedMarketCap:totalMarketCap,
      lagTradingSessions,
      cacheAgeDays,
      components:componentMap,
    },
    missing:[],
  };
}

export {E1_R1_LIMITS};
