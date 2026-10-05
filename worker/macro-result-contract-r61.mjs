import {DIAGNOSTIC_FRED_SERIES} from '../lib/diagnostic-layer/input-registry.mjs';

// Fail closed before replacing a complete stored macro snapshot.
export function macroCollectionReadiness(collected){
 const required=Object.keys(DIAGNOSTIC_FRED_SERIES);
 const ready=required.filter(id=>Array.isArray(collected?.series?.[id])&&collected.series[id].length>0);
 const failed=collected?.providerSummary?.fred?.failed??[];
 const complete=ready.length===required.length&&failed.length===0;
 return {complete,requested:required.length,ready:ready.length,
  missing:required.filter(id=>!ready.includes(id)),
  reason:complete?null:ready.length?'MACRO_REQUIRED_SERIES_MISSING':'MACRO_NO_READY_SERIES'};
}
