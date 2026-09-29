export function projectGrowthR2Public(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null;
  return {
    methodologyVersion:snapshot.methodologyVersion ?? null,
    asOf:snapshot.asOf ?? null,
    status:snapshot.status ?? 'NOT_READY',
    score:Number.isFinite(snapshot.score) ? snapshot.score : null,
    displayScore:Number.isFinite(snapshot.score) ? Math.round(snapshot.score*10)/10 : null,
    coverage:snapshot.coverage ?? 0,
    requiredCoverage:snapshot.requiredCoverage ?? 24,
    missingFactors:Array.isArray(snapshot.missingFactors) ? snapshot.missingFactors : [],
    staleFactors:Array.isArray(snapshot.staleFactors) ? snapshot.staleFactors : [],
    inputSnapshotId:snapshot.inputSnapshotId ?? null,
  };
}
