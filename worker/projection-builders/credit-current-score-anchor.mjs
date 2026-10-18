// Credit-risk R2 display-only current-score historical anchor.
// A verified as-of public score is an actual saved current snapshot, not an
// invented historical observation. Existing older observations are preserved.
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const validDate=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+"T00:00:00Z"));
export function withVerifiedCurrentCreditPoint(history,asOf,score,scoreMatch){
 if(!validDate(asOf))return [];
 const current=Array.isArray(history)?history.filter(p=>validDate(p?.label)&&p.label<=asOf&&finite(p.value)): [];
 if(!finite(score)||scoreMatch!==true)return current;
 const earlier=current.filter(p=>p.label<asOf);
 // No extrapolated points: the final observation is today's independently
 // reconciled saved public score. Keep exactly one as-of anchor.
 return [...earlier,{label:asOf,value:score}];
}
