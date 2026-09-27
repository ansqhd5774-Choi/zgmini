// Independent provider groups share one collection; rate I/O never waits for macro I/O.
export async function collectProgressiveMarketInputs(args,{collectBase,collectRates}) {
  let base={series:{},external:{}}, rates={};
  const snapshot=()=>({...base,...rates,providerSummary:{...base.providerSummary,...rates.providerSummary}});
  const publish=()=>args.onProgress?.(snapshot());
  const settled=await Promise.allSettled([
    Promise.resolve().then(()=>collectBase({...args,onProgress:value=>{base=value;publish()}}))
      .then(value=>{base=value;publish()}),
    Promise.resolve().then(()=>collectRates({asOf:args.asOf,fetchImpl:args.fetchImpl}))
      .then(value=>{rates=value;publish()}),
  ]);
  if(settled.every(item=>item.status==='rejected'))throw new Error('MARKET_INPUTS_UNAVAILABLE');
  return snapshot();
}
