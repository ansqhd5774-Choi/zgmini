// Strict UTC calendar validation for displayed theme ETF score histories.
// Date.parse alone accepts impossible dates such as 2026-02-30 by normalizing them.
const DAY=/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function validThemeChartDay(value){
 if(typeof value!=='string'||!DAY.test(value))return false;
 const millis=Date.parse(value+'T00:00:00Z');
 return Number.isFinite(millis)&&new Date(millis).toISOString().slice(0,10)===value;
}
