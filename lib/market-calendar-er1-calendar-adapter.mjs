// ER1 PC-only input adapter for SAVED EarningsAPI /v1/calendar/earnings responses.
// Never fetch, publish, or reinterpret an announcement date as a fiscal quarter end.
export const ER1_CALENDAR_INPUT_METHOD='ER1_EARNINGSAPI_SAVED_DAILY_CALENDAR_V1';

const DAY=/^20\d\d-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;
const TICKER=/^[A-Z0-9][A-Z0-9.\-]{0,11}$/;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const stop=code=>{throw Error(code)};

function validDay(value){
  return typeof value==='string'&&DAY.test(value)&&
    !Number.isNaN(Date.parse(value+'T00:00:00Z'))&&
    new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
}

/**
 * savedDays: [{body: {date,pre,after,notSupplied}, storedAt: ISO timestamp}]
 * An independent approved issuer roster must supply earningsSymbol and eligibility;
 * calendar event symbols themselves are NOT an approved issuer universe.
 * All raw actuals must remain in PC private storage. Do not publish this index.
 */
export function indexSavedER1CalendarDays(savedDays,{asOf}={}){
  if(!Array.isArray(savedDays)||!validDay(asOf))stop('ER1_CALENDAR_INPUT_INVALID');
  const seenDays=new Set(),symbolDates=new Map(),bySymbol=new Map();
  let rawEvents=0;
  for(const saved of savedDays){
    const body=saved?.body, storedAt=saved?.storedAt;
    if(!body||!validDay(body.date)||seenDays.has(body.date)||
      typeof storedAt!=='string'||!Number.isFinite(Date.parse(storedAt))||
      !['pre','after','notSupplied'].every(k=>Array.isArray(body[k])))
      stop('ER1_CALENDAR_DAY_INVALID');
    seenDays.add(body.date);
    for(const group of ['pre','after','notSupplied'])for(const event of body[group]){
      rawEvents++;
      if(!event||!TICKER.test(event.symbol)||
        (event.eps!==null&&!finite(event.eps))||
        (event.revenue!==null&&(!finite(event.revenue)||event.revenue<0)))
        stop('ER1_CALENDAR_EVENT_INVALID');
      if(body.date>=asOf)continue; // same-day release may still be upcoming
      const record={date:body.date,symbol:event.symbol,eps:event.eps,revenue:event.revenue};
      const key=record.symbol+'|'+record.date,prior=symbolDates.get(key);
      if(prior&& (prior.eps!==record.eps||prior.revenue!==record.revenue))
        stop('ER1_CALENDAR_CONFLICTING_REPORT');
      if(prior)continue;
      symbolDates.set(key,record);
      if(!bySymbol.has(record.symbol))bySymbol.set(record.symbol,[]);
      bySymbol.get(record.symbol).push(record);
    }
  }
  const releasesBySymbol=Object.fromEntries([...bySymbol.entries()].sort((a,b)=>
    a[0].localeCompare(b[0])).map(([ticker,rows])=>[
      ticker,rows.sort((a,b)=>b.date.localeCompare(a.date))]));
  return {status:'READY_PRIVATE_INPUT',method:ER1_CALENDAR_INPUT_METHOD,
    asOf,storedDayCount:seenDays.size,rawEvents,
    distinctSymbols:Object.keys(releasesBySymbol).length,releasesBySymbol};
}
