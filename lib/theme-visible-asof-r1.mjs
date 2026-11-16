// Display only: the visible ranking can combine independently published
// legacy and configured themes with different observation dates. The header
// must describe the actual displayed score dates, never a stale legacy feed.
// No data collection, upstream provenance, score math, publishing or writes.
import {validThemeChartDay} from './theme-chart-day-r62.mjs';
// Preserve the helper's original stable alias for its existing tests.
export const isRealThemeAsOfDay=validThemeChartDay;

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
