export function clampedAnimationProgress(now,startedAt,duration){
  const safeDuration=Number(duration);
  if(!Number.isFinite(safeDuration)||safeDuration<=0)return 1;
  const raw=(Number(now)-Number(startedAt))/safeDuration;
  if(!Number.isFinite(raw))return 1;
  return Math.max(0,Math.min(1,raw));
}
