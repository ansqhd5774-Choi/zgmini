// Display only: the visible ranking can combine independently published
// legacy and configured themes with different observation dates. The header
// must describe the actual displayed score dates, never a stale legacy feed.
// No data collection, upstream provenance, score math, publishing or writes.
export function isRealThemeAsOfDay(value){
 if(typeof value!=='string'||!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value))return false;
 const millis=Date.parse(value+'T00:00:00Z');
 return Number.isFinite(millis)&&new Date(millis).toISOString().slice(0,10)===value;
}

/**
 * The ranking's Theme.date is the date of its displayed score, including
 * an eligible separately verified provisional point when present.
 * "Latest available observation" deliberately does NOT assert that every
 * listed theme was observed on the same day.
 */
export function latestVisibleThemeDay(themes){
 if(!Array.isArray(themes))return null;
 let latest=null;
 for(const theme of themes){
  const day=theme?.date;
  if(isRealThemeAsOfDay(day)&&(latest===null||day>latest))latest=day;
 }
 return latest;
}
