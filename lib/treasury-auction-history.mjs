import {TREASURY_AUCTIONS_PAGE} from './treasury-calendar.mjs';

// Pure conversion of already-retrieved FiscalData auctions_query JSON *rows*.
// Pagination, provider access, and storage belong to the caller, not this module.
const DAY_MS=24*60*60*1000;
const dateMs=value=>{
 if(typeof value!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(value))return null;
 const ms=Date.parse(value+'T00:00:00Z');
 return Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,10)===value?ms:null;
};
const eventKey=event=>`${event.id}:${event.date}`;

function historyTitle(row,kind){
 const type=typeof row.security_type==='string'?row.security_type.trim().toLowerCase():'';
 const term=typeof row.security_term==='string'?row.security_term.trim():'';
 const week=term.match(/^(\d{1,3})-Week$/i);
 const year=term.match(/^(\d{1,3})-Year$/i);
 let base='미국 재무부 국채';
 if(week&&['bill','cash management bill'].includes(type))base=`미국 ${week[1]}주물 단기국채`;
 else if(year&&['note','bond','tips','frn','inflation-protected note','inflation-protected bond'].includes(type))
  base=`미국 ${year[1]}년물 ${['tips','inflation-protected note','inflation-protected bond'].includes(type)?'물가연동국채':'국채'}`;
 const reopening=row.reopening===true||/^(Y|Yes)$/i.test(row.reopening??'');
 return `${base} ${kind==='auction'?'입찰':'입찰 공고'}${reopening?' · 재발행':''}`;
}

/**
 * Normalize the complete, caller-collected official auctions_query row set.
 * `fromDate` and `toDate` are inclusive, and span no more than 365 calendar days.
 * Only the official misspelled `announcemt_date` field represents announcements.
 */
export function parseTreasuryAuctionHistoryRows(rows,{fromDate,toDate}={}){
 const from=dateMs(fromDate),to=dateMs(toDate);
 if(from===null||to===null||to<from||to-from>=365*DAY_MS)
  throw Error('TREASURY_HISTORY_WINDOW_INVALID');
 if(!Array.isArray(rows))throw Error('TREASURY_HISTORY_ROWS_INVALID');
 const unique=new Map();
 for(const row of rows){
  if(!row||typeof row!=='object'||Array.isArray(row))throw Error('TREASURY_HISTORY_ROW_INVALID');
  const cusip=typeof row.cusip==='string'?row.cusip.trim().toUpperCase():'';
  if(!/^[A-Z0-9]{9}$/.test(cusip))throw Error('TREASURY_HISTORY_CUSIP_INVALID');
  const auctionMs=dateMs(row.auction_date);
  if(auctionMs===null)throw Error('TREASURY_HISTORY_AUCTION_DATE_INVALID');
  // A null/blank announcement is genuinely unknown, not the auction date.
  const announcement=row.announcemt_date;
  const hasAnnouncement=announcement!==null&&announcement!==undefined&&announcement!=='';
  const announcementMs=hasAnnouncement?dateMs(announcement):null;
  if(hasAnnouncement&&(announcementMs===null||announcementMs>auctionMs))
   throw Error('TREASURY_HISTORY_ANNOUNCEMENT_DATE_INVALID');
  if(row.reopening!==undefined&&row.reopening!==null&&row.reopening!==''&&
   ![true,false].includes(row.reopening)&&!/^(Y|N|Yes|No)$/i.test(row.reopening))
   throw Error('TREASURY_HISTORY_REOPENING_INVALID');
  for(const [kind,ms] of [['announcement',announcementMs],['auction',auctionMs]]){
   if(ms===null||ms<from||ms>to)continue;
   const date=new Date(ms).toISOString().slice(0,10);
   const event={id:`treasury-${kind}-${cusip.toLowerCase()}`,date,
    title:historyTitle(row,kind),source:'treasury',sourceUrl:TREASURY_AUCTIONS_PAGE};
   const key=eventKey(event);
   const previous=unique.get(key);
   if(previous&&previous.title!==event.title)throw Error('TREASURY_HISTORY_EVENT_CONFLICT');
   unique.set(key,event);
  }
 }
 return [...unique.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
}

// Existing weekly events take precedence on id+date; retain their extra fields
// (including any status) without manufacturing fields on historical events.
export function mergeTreasuryHistoryEvents(existingEvents,historyEvents){
 if(!Array.isArray(existingEvents)||!Array.isArray(historyEvents))
  throw Error('TREASURY_HISTORY_MERGE_INPUT_INVALID');
 const unique=new Map();
 for(const event of [...existingEvents,...historyEvents]){
  if(!event||typeof event!=='object'||typeof event.id!=='string'||
   !event.id||dateMs(event.date)===null)throw Error('TREASURY_HISTORY_MERGE_EVENT_INVALID');
  const key=eventKey(event);
  if(!unique.has(key))unique.set(key,event);
 }
 return [...unique.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
}
