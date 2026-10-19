/**
 * Diagnostic-only breadth freshness calendar. The shared market calendar and
 * public staleness/scoring behavior are intentionally unchanged.
 *
 * Official NYSE equities early closes (13:00 ET) verified for 2026–2028:
 * 2026-11-27, 2026-12-24, 2027-11-26, 2028-07-03, 2028-11-24.
 * Preserve the existing shared calendar's 15-minute post-close cutoff, so a
 * special session counts as completed at 13:15 ET, not immediately at 13:00.
 * This table is bounded, not a claim about unannounced future schedules.
 */
import {isMarketSession,latestCompletedSession as sharedLatestCompletedSession} from "./breadth-b1-r3-calendar.mjs";

const EARLY_CLOSE_SESSIONS=new Set([
  "2026-11-27","2026-12-24",
  "2027-11-26",
  "2028-07-03","2028-11-24",
]);
const DAY_MS=86400000;
function instant(value){
  const d=value instanceof Date?value:new Date(value);
  if(!Number.isFinite(d.getTime()))throw new TypeError("BREADTH_FRESHNESS_TIME_INVALID");
  return d;
}
function nyParts(now){
  const pieces=new Intl.DateTimeFormat("en-US",{
    timeZone:"America/New_York",year:"numeric",month:"2-digit",
    day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23",
  }).formatToParts(now);
  const x=Object.fromEntries(pieces.map(part=>[part.type,part.value]));
  return {date:`${x.year}-${x.month}-${x.day}`,minutes:Number(x.hour)*60+Number(x.minute)};
}

export function latestCompletedBreadthSession(now=new Date()){
  const d=instant(now);
  const ny=nyParts(d);
  if(EARLY_CLOSE_SESSIONS.has(ny.date)&&isMarketSession(ny.date)&&ny.minutes>=13*60+15)
    return ny.date;
  return sharedLatestCompletedSession(d);
}

export function countCompletedBreadthSessionsSince(observationDate,now=new Date()){
  if(!isMarketSession(observationDate))return Number.POSITIVE_INFINITY;
  const latest=latestCompletedBreadthSession(now);
  if(observationDate>=latest)return 0;
  const start=new Date(`${observationDate}T00:00:00Z`).getTime();
  if(!Number.isFinite(start))return Number.POSITIVE_INFINITY;
  let count=0;
  for(let offset=1;offset<=370;offset++){
    const date=new Date(start+offset*DAY_MS).toISOString().slice(0,10);
    if(date>latest)return count;
    if(isMarketSession(date))count++;
  }
  return Number.POSITIVE_INFINITY;
}
