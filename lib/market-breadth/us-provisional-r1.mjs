/** Independent IEX intraday display contract. Never reuse confirmed R1 gates. */
import {isMarketSession,latestCompletedSession} from '../market-score/breadth-b1-r3-calendar.mjs';

export const US_BREADTH_PROVISIONAL_KEY='public:market-breadth-provisional-r1:usa';
export const US_BREADTH_PROVISIONAL_SOURCE='ALPACA_IEX_15MIN_SPLIT';
export const US_BREADTH_PROVISIONAL_REFERENCE='ALPACA_IEX_1DAY_SPLIT';
export const US_BREADTH_PROVISIONAL_METHOD='OBSERVED_ISSUE_DIRECTION_COUNTS_R1';
const validPrice=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
const validVolume=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const count=n=>Number.isSafeInteger(n)&&n>=0;
const iso=n=>typeof n==='string'&&Number.isFinite(Date.parse(n));
// Official NYSE cash-equity 1 p.m. ET early-close sessions. Keep this
// provisional-only; the shared completed-day calendar and confirmed R1/R2
// histories must not be changed by an intraday scheduling correction.
// Source: https://www.nyse.com/trade/hours-calendars (2026-2028 schedule).
const earlyClose1pm=new Set([
  '2026-11-27','2026-12-24',
  '2027-11-26',
  '2028-07-03','2028-11-24',
]);

export function nyClock(now=Date.now()){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',
    year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
    .formatToParts(now).map(p=>[p.type,p.value]));
  return {date:`${parts.year}-${parts.month}-${parts.day}`,
    minutes:Number(parts.hour)*60+Number(parts.minute)};
}

/** A completed 15-minute regular-session bar, with one-minute settling delay. */
export function usProvisionalSlot(now=Date.now()){
  const n=nyClock(now);
  const close=earlyClose1pm.has(n.date)?13*60:16*60;
  if(!isMarketSession(n.date)||n.minutes<9*60+46||n.minutes>=close+15)return null;
  const completed=Math.min(close,Math.floor((n.minutes-1)/15)*15);
  if(completed<9*60+45)return null;
  const summer=Date.parse(n.date+'T13:30:00Z');
  const start=nyClock(summer).minutes===9*60+30?summer:Date.parse(n.date+'T14:30:00Z');
  const end=start+(completed-(9*60+30))*60_000;
  return {observationDate:n.date,priorDate:latestCompletedSession(new Date(now)),
    sessionStartUtc:new Date(start).toISOString(),slotEndUtc:new Date(end).toISOString(),
    slotKey:`${n.date}:${completed}`};
}

/** Input is the already persisted IEX cache; missing or unpaired rows stay missing. */
export function calculateUsIexProvisional(raw){
  const {members,priorDate,observationDate,sessionStartUtc,slotEndUtc,referenceBars,currentBars,
    collectedAt,referencePageComplete,currentPageComplete}=raw??{};
  if(!Array.isArray(members)||members.length<490||members.length>520||
    members.some(s=>typeof s!=='string'||!s.trim())||new Set(members).size!==members.length||
    !/^\d{4}-\d{2}-\d{2}$/.test(priorDate??'')||
    !/^\d{4}-\d{2}-\d{2}$/.test(observationDate??'')||!iso(sessionStartUtc)||
    !iso(slotEndUtc)||!iso(collectedAt)||!referenceBars||!currentBars)
    throw Error('US_PROVISIONAL_INPUT_INVALID');
  const start=Date.parse(sessionStartUtc),end=Date.parse(slotEndUtc);
  if(start>=end||end>Date.parse(collectedAt)||
    typeof referencePageComplete!=='boolean'||typeof currentPageComplete!=='boolean')
    throw Error('US_PROVISIONAL_WINDOW_INVALID');
  const counts={rising:0,unchanged:0,falling:0};
  let sessionPriceObservedCount=0,referenceObservedCount=0,observedCount=0,freshWithin30m=0;
  for(const ticker of members){
    const current=currentBars[ticker],previous=referenceBars[ticker];
    const barStart=Date.parse(current?.t),refDate=String(previous?.t??'').slice(0,10);
    const currentValid=validPrice(current?.c)&&validVolume(current?.v)&&
      Number.isFinite(barStart)&&barStart>=start&&barStart+900_000<=end;
    const referenceValid=validPrice(previous?.c)&&validVolume(previous?.v)&&refDate===priorDate;
    if(currentValid)sessionPriceObservedCount++;
    if(referenceValid)referenceObservedCount++;
    if(!currentValid||!referenceValid)continue;
    observedCount++;
    if(end-(barStart+900_000)<=1_800_000)freshWithin30m++;
    if(current.c>previous.c)counts.rising++;
    else if(current.c<previous.c)counts.falling++;
    else counts.unchanged++;
  }
  return {version:1,phase:'PROVISIONAL',status:'PROVISIONAL',market:'usa',universe:'SP500',
    source:US_BREADTH_PROVISIONAL_SOURCE,referenceSource:US_BREADTH_PROVISIONAL_REFERENCE,
    methodologyVersion:US_BREADTH_PROVISIONAL_METHOD,observationDate,priorDate,
    slotEndUtc,collectedAt,expectedCount:members.length,sessionPriceObservedCount,
    referenceObservedCount,observedCount,missingCount:members.length-observedCount,
    freshWithin30m,coverage:observedCount/members.length,counts,
    collectionStatus:referencePageComplete&&currentPageComplete?'COMPLETE':'INCOMPLETE_PAGINATION'};
}

export function validUsIexProvisional(record){
  if(!record||record.version!==1||record.phase!=='PROVISIONAL'||record.status!=='PROVISIONAL'||
    record.market!=='usa'||record.universe!=='SP500'||record.source!==US_BREADTH_PROVISIONAL_SOURCE||
    record.referenceSource!==US_BREADTH_PROVISIONAL_REFERENCE||
    record.methodologyVersion!==US_BREADTH_PROVISIONAL_METHOD||
    !/^\d{4}-\d{2}-\d{2}$/.test(record.observationDate??'')||
    !/^\d{4}-\d{2}-\d{2}$/.test(record.priorDate??'')||
    !iso(record.slotEndUtc)||!iso(record.collectedAt)||
    !count(record.expectedCount)||record.expectedCount<490||record.expectedCount>520||
    !count(record.observedCount)||!count(record.missingCount)||
    !count(record.sessionPriceObservedCount)||!count(record.referenceObservedCount)||
    !count(record.freshWithin30m)||
    record.observedCount+record.missingCount!==record.expectedCount||
    record.sessionPriceObservedCount>record.expectedCount||
    record.referenceObservedCount>record.expectedCount||
    record.observedCount>record.sessionPriceObservedCount||
    record.observedCount>record.referenceObservedCount||record.freshWithin30m>record.observedCount||
    !record.counts||Object.keys(record.counts).sort().join(',')!=='falling,rising,unchanged'||
    !Object.values(record.counts).every(count)||
    record.counts.rising+record.counts.falling+record.counts.unchanged!==record.observedCount||
    !Number.isFinite(record.coverage)||
    Math.abs(record.coverage-record.observedCount/record.expectedCount)>1e-9||
    Date.parse(record.slotEndUtc)>Date.parse(record.collectedAt)||
    !['COMPLETE','INCOMPLETE_PAGINATION'].includes(record.collectionStatus))return false;
  return true;
}

/** R34 visitor-facing projection: percentages only, no constituent counts.
 * Missing IEX observations stay explicitly unobserved, never fabricated as flat.
 * All four shares use the same total eligible IEX membership denominator.
 */
export function usIexPublicPercentOnly(record){
  if(!validUsIexProvisional(record))return null;
  const scale=100/record.expectedCount;
  return {market:'usa',phase:'PROVISIONAL',status:'PROVISIONAL',
    source:record.source,referenceSource:record.referenceSource,
    methodologyVersion:record.methodologyVersion,
    observationDate:record.observationDate,priorDate:record.priorDate,
    slotEndUtc:record.slotEndUtc,collectedAt:record.collectedAt,
    collectionStatus:record.collectionStatus,
    risingPct:record.counts.rising*scale,
    fallingPct:record.counts.falling*scale,
    unchangedPct:record.counts.unchanged*scale,
    unobservedPct:record.missingCount*scale};
}

/** Do not present yesterday's provisional observation as live. */
export function currentUsIexProvisional(record,now=Date.now()){
  if(!validUsIexProvisional(record))return false;
  const slot=usProvisionalSlot(now),age=now-Date.parse(record.slotEndUtc);
  return !!slot&&record.observationDate===slot.observationDate&&age>=0&&age<=30*60_000;
}
