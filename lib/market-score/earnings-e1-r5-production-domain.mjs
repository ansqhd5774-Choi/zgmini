const finiteScore=value=>typeof value==="number"&&Number.isFinite(value)&&value>=0&&value<=100;

export function isReadyEarningsE1R5(value){
  return value?.status==="READY"&&
    value?.methodologyVersion==="E1-R5"&&
    finiteScore(value?.score)&&
    value?.noReweight===true&&
    Array.isArray(value?.missing)&&value.missing.length===0;
}

export function selectEarningsProductionDomain({current=null,candidate=null}={}){
  return isReadyEarningsE1R5(candidate)?candidate:current;
}

export function mergeEarningsProductionCandidate(collected,candidate){
  const current=collected?.external?.publicDomainScores?.earnings??null;
  const earnings=selectEarningsProductionDomain({current,candidate});
  if(earnings===current)return collected;
  return {
    ...(collected??{}),
    external:{
      ...(collected?.external??{}),
      publicDomainScores:{
        ...(collected?.external?.publicDomainScores??{}),
        earnings,
      },
    },
  };
}
