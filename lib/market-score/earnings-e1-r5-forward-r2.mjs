export const E1_R5_FORWARD_R2_VERSION="E1-R5-FORWARD-R2";

export const E1_R5_FORWARD_R2_WEIGHTS=Object.freeze({
  s12ManagementGuidanceMagnitude:4,
  s12CfoForwardRevenueRevision:3,
  s13GuidanceBreadth:3,
});

export const E1_R5_FORWARD_R2_CONTRACT=Object.freeze({
  status:"APPROVED_SHADOW_ONLY",
  productionActivation:false,
  topLevelFutureBlockWeight:10,
  missingPolicy:"NULL_NO_REWEIGHT",
  s12:Object.freeze({
    weight:7,
    composition:"4_MANAGEMENT_GUIDANCE_MAGNITUDE_PLUS_3_CFO_FORWARD_REVENUE_REVISION",
    managementGuidance:Object.freeze({
      weight:4,
      source:"SEC_EDGAR_8K_EXHIBIT_99_1",
      metric:"EPS_GUIDANCE_REVISION_MAGNITUDE",
      comparison:"SAME_TARGET_PERIOD_METRIC_BASIS_UNIT",
      withdrawnPolicy:"MISSING_NOT_DOWNGRADE",
      newGuidancePolicy:"MISSING_WITHOUT_PRIOR",
      apiKeyRequired:false,
    }),
    cfoForwardRevenue:Object.freeze({
      weight:3,
      source:"RICHMOND_FED_CFO_SURVEY",
      metric:"ROLLING_FORWARD_REVENUE_GROWTH_EXPECTATION_REVISION",
      annualRevisionPolicy:"PRESERVE_RELEASE_TIME_SOURCE_HASH_AND_REVISION",
      apiKeyRequired:false,
    }),
    analystEpsRevision:Object.freeze({
      status:"OPTIONAL_FUTURE_ENHANCEMENT",
      currentProvider:"AXIONQUANT_PENDING_RIGHTS_AND_COVERAGE_CONFIRMATION",
      productionRequired:false,
    }),
  }),
  s13:Object.freeze({
    weight:3,
    source:"SEC_EDGAR_8K_EXHIBIT_99_1",
    metric:"GUIDANCE_BREADTH",
    noGuidancePolicy:"MISSING_NOT_NEUTRAL",
    apiKeyRequired:false,
  }),
});

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const text=value=>typeof value==="string"?value.trim():"";

export function symmetricChange(current,previous){
  if(!finite(current)||!finite(previous))return null;
  const denominator=Math.abs(current)+Math.abs(previous);
  if(denominator===0)return 0;
  return 2*(current-previous)/denominator;
}

export function guidanceMidpoint(row){
  if(!row||row.withdrawn===true)return null;
  const low=row.low;
  const high=row.high;
  if(!finite(low)||!finite(high))return null;
  if(low>high)return null;
  return (low+high)/2;
}

export function guidanceRevisionPair(current,previous){
  if(!current||!previous)return {status:"MISSING",reason:"PAIR_MISSING",raw:null};
  if(current.withdrawn===true||previous.withdrawn===true)return {status:"MISSING",reason:"GUIDANCE_WITHDRAWN",raw:null};

  const currentPeriod=text(current.periodKey);
  const previousPeriod=text(previous.periodKey);
  if(!currentPeriod||!previousPeriod||currentPeriod!==previousPeriod){
    return {status:"MISSING",reason:"TARGET_PERIOD_MISMATCH",raw:null};
  }

  const currentMetric=text(current.metric).toUpperCase();
  const previousMetric=text(previous.metric).toUpperCase();
  if(!currentMetric||!previousMetric||currentMetric!==previousMetric){
    return {status:"MISSING",reason:"METRIC_MISMATCH",raw:null};
  }

  const currentBasis=text(current.basis).toUpperCase();
  const previousBasis=text(previous.basis).toUpperCase();
  if(!currentBasis||!previousBasis||currentBasis!==previousBasis){
    return {status:"MISSING",reason:"BASIS_MISMATCH",raw:null};
  }

  const currentUnit=text(current.unit).toUpperCase();
  const previousUnit=text(previous.unit).toUpperCase();
  if((currentUnit||previousUnit)&&currentUnit!==previousUnit){
    return {status:"MISSING",reason:"UNIT_MISMATCH",raw:null};
  }

  const currentMidpoint=guidanceMidpoint(current);
  const previousMidpoint=guidanceMidpoint(previous);
  if(currentMidpoint==null||previousMidpoint==null){
    return {status:"MISSING",reason:"MIDPOINT_UNAVAILABLE",raw:null};
  }

  return {
    status:"READY",
    reason:null,
    raw:symmetricChange(currentMidpoint,previousMidpoint),
    currentMidpoint,
    previousMidpoint,
  };
}

export function median(values){
  const valid=(values??[]).filter(finite).sort((a,b)=>a-b);
  if(!valid.length)return null;
  const middle=Math.floor(valid.length/2);
  return valid.length%2?valid[middle]:(valid[middle-1]+valid[middle])/2;
}

export function managementGuidanceMagnitude(rows){
  const revisions=(rows??[])
    .map(row=>guidanceRevisionPair(row?.current,row?.previous))
    .filter(row=>row.status==="READY")
    .map(row=>row.raw);
  return {
    raw:median(revisions),
    comparableCount:revisions.length,
    totalCount:Array.isArray(rows)?rows.length:0,
  };
}

export function cfoRollingForwardRevenueLevel({surveyQuarter,currentYearGrowth,nextYearGrowth}={}){
  if(!Number.isInteger(surveyQuarter)||surveyQuarter<1||surveyQuarter>4)return null;
  const currentWeight=(4-surveyQuarter)/4;
  const nextWeight=surveyQuarter/4;
  if(currentWeight>0&&!finite(currentYearGrowth))return null;
  if(nextWeight>0&&!finite(nextYearGrowth))return null;
  return currentWeight*(currentYearGrowth??0)+nextWeight*(nextYearGrowth??0);
}

export function cfoForwardRevenueRevision(current,previous){
  const currentLevel=cfoRollingForwardRevenueLevel(current);
  const previousLevel=cfoRollingForwardRevenueLevel(previous);
  if(currentLevel==null||previousLevel==null)return null;
  return currentLevel-previousLevel;
}

export function guidanceBreadthRaw({up,same,down}={}){
  if(!Number.isInteger(up)||!Number.isInteger(same)||!Number.isInteger(down))return null;
  if(up<0||same<0||down<0)return null;
  const denominator=up+same+down;
  if(denominator===0)return null;
  return (up-down)/denominator;
}

export function composeS12({managementScore,cfoScore}={}){
  if(!finite(managementScore)||!finite(cfoScore))return null;
  if(managementScore<0||managementScore>100||cfoScore<0||cfoScore>100)return null;
  return (
    E1_R5_FORWARD_R2_WEIGHTS.s12ManagementGuidanceMagnitude*managementScore+
    E1_R5_FORWARD_R2_WEIGHTS.s12CfoForwardRevenueRevision*cfoScore
  )/7;
}

export function composeFutureOutlook({s12Score,s13Score}={}){
  if(!finite(s12Score)||!finite(s13Score))return null;
  if(s12Score<0||s12Score>100||s13Score<0||s13Score>100)return null;
  return (7*s12Score+3*s13Score)/10;
}
