export const ASSET_R10_B_CONTRACT = Object.freeze({
  version: 'R10_B_12M_200MA_EXPANDING_252_MIDRANK',
  minimumObservations: 252,
  coverageThreshold: 0.98,
  quarterAggregation: 'THREE_COMPLETE_MONTH_END_MEAN',
});

export function pairedBreadthScore(returns, participation) {
  if (returns.length !== participation.length) throw new Error('UNPAIRED_OBSERVATIONS');
  if (returns.some(v => !Number.isFinite(v)) || participation.some(v => !Number.isFinite(v) || v < 0 || v > 1)) throw new Error('INVALID_OBSERVATIONS');
  if (returns.length < ASSET_R10_B_CONTRACT.minimumObservations) return null;
  const rank = values => {
    const current = values.at(-1);
    return 100 * (values.filter(v => v < current).length + 0.5 * values.filter(v => v === current).length) / values.length;
  };
  const returnRank = rank(returns), participationRank = rank(participation);
  const breadthGap = Math.max(0, returnRank - participationRank);
  return { returnRank, participationRank, breadthGap, score: 100 - breadthGap };
}
