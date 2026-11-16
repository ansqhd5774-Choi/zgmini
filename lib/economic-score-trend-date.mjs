// Display-only guard: impossible calendar dates must not become score-chart points.
const ISO_DAY=/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** @param {unknown} value */
export function isRealEconomicScoreDay(value){
 if(typeof value!=='string'||!ISO_DAY.test(value))return false;
 const time=Date.parse(value+'T00:00:00Z');
 return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===value;
}
