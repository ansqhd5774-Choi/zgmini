import {SECTOR_FEAR_GREED_R3_SECTORS} from './sector-fear-greed-r3-public.mjs';
export const SECTOR_PROVISIONAL_KEY='sector-fear-greed-r3-provisional';
export function newYorkClock(now=Date.now()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',weekday:'short'}).formatToParts(now).map(p=>[p.type,p.value]));
 return {date:`${parts.year}-${parts.month}-${parts.day}`,minutes:Number(parts.hour)*60+Number(parts.minute),weekday:parts.weekday};
}
export function provisionalCollectionWindow(now){const c=newYorkClock(now);return !['Sat','Sun'].includes(c.weekday)&&c.minutes>=585&&c.minutes<=975;}
export function validSectorProvisional(p,confirmedDate,now=Date.now()){
 const asOf=Date.parse(p?.asOf??''),stored=Date.parse(p?.updatedAt??'');
 return p?.status==='READY'&&p?.phase==='PROVISIONAL'&&p?.source==='ALPACA_IEX_SPLIT'&&p?.delayMinutes===15&&p?.observationDate===newYorkClock(now).date&&p.observationDate>confirmedDate&&Number.isFinite(asOf)&&asOf<=now&&now-asOf<=6*3600000&&Number.isFinite(stored)&&stored<=now&&p?.point?.date===p.observationDate&&SECTOR_FEAR_GREED_R3_SECTORS.every(({id})=>typeof p.point[id]==='number'&&Number.isFinite(p.point[id])&&p.point[id]>=0&&p.point[id]<=100);
}
