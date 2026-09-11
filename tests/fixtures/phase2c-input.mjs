// Synthetic deterministic fixture; never acquired financial observations.
export function phase2cInput(n=600) {
  const points=offset=>Array.from({length:n},(_,i)=>({date:new Date(Date.UTC(2021,0,1+i)).toISOString().slice(0,10).replaceAll('-',''),value:100+offset+(i%43)+i/100}));
  return {leverage:{points:points(0)},liquidation:{points:points(20)},creditSpread:{points:points(40)},usdkrw:{points:points(60)}};
}
export function legacyView(r) {
  return {normalizationCandidates:r.normalizationCandidates.map(c=>({id:c.id,quality:c.quality})),models:r.models,auxiliary:r.auxiliary,componentCorrelations:r.componentCorrelations};
}
