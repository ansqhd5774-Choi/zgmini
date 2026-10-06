// Presentation only: use the already calculated state without changing thresholds.
export function fearGreedStateColor(state='') {
  const label=String(state).toLowerCase();
  if(label.includes('공포')||label.includes('fear'))return '#ff7076';
  if(label.includes('탐욕')||label.includes('greed'))return '#45d99f';
  return '#94a3b8';
}
