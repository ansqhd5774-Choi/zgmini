const DAY_MS=86400000;
const iso=ms=>new Date(ms).toISOString().slice(0,10);

// Keep Feb 29 within February in non-leap comparison years.
export function employmentR6OneYearStart(asOfMs){
  const date=new Date(asOfMs);
  const year=date.getUTCFullYear(),month=date.getUTCMonth(),day=date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCFullYear(year-1);
  date.setUTCMonth(month);
  const monthEnd=new Date(date.getTime());
  monthEnd.setUTCMonth(month+1,0);
  date.setUTCDate(Math.min(day,monthEnd.getUTCDate()));
  return iso(date.getTime());
}

export const employmentR6RecentQuarterStart=asOfMs=>iso(asOfMs-92*DAY_MS);
