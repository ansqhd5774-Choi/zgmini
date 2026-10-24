/**
 * A solid segment and its dashed continuation share one logical score.
 * Keep the first finite value for each original series ID in a Recharts tooltip.
 * @template {{dataKey?: unknown, value?: unknown}} T
 * @param {readonly T[]} payload
 * @returns {T[]}
 */
export function uniqueChartTooltipEntries(payload){
 const seen=new Set();
 return payload.filter(entry=>{
  if(typeof entry.value!=='number'||!Number.isFinite(entry.value))return false;
  const id=String(entry.dataKey??'').replace(/__(?:solid|dash)$/,'');
  if(seen.has(id))return false;
  seen.add(id);
  return true;
 });
}
