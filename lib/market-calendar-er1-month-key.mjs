// Stable public projection key for automated ER1 month cohorts. The existing
// November/December 2026 one-shot keys remain untouched as PIT fallbacks.
export function er1MonthlyPublicKey(month){
 if(typeof month!=='string'||!/^20\d\d-(0[1-9]|1[0-2])$/.test(month)||
  month<'2026-11')return null;
 return `market-calendar:earnings-er1-score-${month}-public`;
}
