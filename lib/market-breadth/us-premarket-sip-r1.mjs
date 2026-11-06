/** Free historical SIP premarket, isolated from the regular-session IEX contract. */
import {isMarketSession,latestCompletedSession} from '../market-score/breadth-b1-r3-calendar.mjs';
import {nyClock,calculateUsIexProvisional,validUsIexProvisional,
  usIexPublicPercentOnly} from './us-provisional-r1.mjs';

export const US_SIP_PREMARKET_KEY='public:market-breadth-premarket-sip-r1:usa';
export const US_SIP_PREMARKET_FILE='local-us-breadth-sip-premarket.json';
export const US_SIP_PREMARKET_SOURCE='ALPACA_SIP_PREMARKET_15MIN_DELAYED_SPLIT';
export const US_SIP_PREMARKET_REFERENCE='ALPACA_SIP_1DAY_SPLIT';

/** 04:00-09:30 ET trading; only complete 15m bars at least 16m old.
 * Thus 04:31 ET is the first eligible observation, never 04:00 ET.
 */
export function usSipPremarketSlot(now=Date.now()){
  const n=nyClock(now);
  if(!isMarketSession(n.date)||n.minutes<4*60+31||n.minutes>9*60+45)return null;
  const completed=Math.min(9*60+15,Math.floor((n.minutes-16)/15)*15);
  if(completed<4*60+15)return null;
  const summer=Date.parse(n.date+'T13:30:00Z');
  const regular=nyClock(summer).minutes===9*60+30?
    summer:Date.parse(n.date+'T14:30:00Z');
  const start=regular-330*60_000;
  const end=start+(completed-4*60)*60_000;
  if(now-end<16*60_000)return null;
  return {observationDate:n.date,priorDate:latestCompletedSession(new Date(now)),
    sessionStartUtc:new Date(start).toISOString(),slotEndUtc:new Date(end).toISOString(),
    slotKey:`SIP:${n.date}:${completed}`};
}

/** Reuse the approved counts algorithm without changing the existing IEX result. */
export function calculateUsSipPremarket(raw){
  return {...calculateUsIexProvisional(raw),source:US_SIP_PREMARKET_SOURCE,
    referenceSource:US_SIP_PREMARKET_REFERENCE};
}

function asIex(record){
  return {...record,source:'ALPACA_IEX_15MIN_SPLIT',
    referenceSource:'ALPACA_IEX_1DAY_SPLIT'};
}

export function validUsSipPremarket(record){
  return !!record&&record.source===US_SIP_PREMARKET_SOURCE&&
    record.referenceSource===US_SIP_PREMARKET_REFERENCE&&
    validUsIexProvisional(asIex(record));
}

export function currentUsSipPremarket(record,now=Date.now()){
  if(!validUsSipPremarket(record))return false;
  const slot=usSipPremarketSlot(now),age=now-Date.parse(record.slotEndUtc);
  return !!slot&&record.observationDate===slot.observationDate&&
    age>=16*60_000&&age<=31*60_000&&
    record.slotEndUtc<=slot.slotEndUtc;
}

/** Public output remains only percentages, with explicit SIP provenance. */
export function usSipPublicPercentOnly(record){
  if(!validUsSipPremarket(record))return null;
  return {...usIexPublicPercentOnly(asIex(record)),source:record.source,
    referenceSource:record.referenceSource};
}
