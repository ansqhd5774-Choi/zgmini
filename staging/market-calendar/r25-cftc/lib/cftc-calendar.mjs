// R25: parse exact CFTC COT release dates published by the US regulator.
// Never infer Fridays or fabricate dates for a year not on the source page.
export const CFTC_COT_URL='https://www.cftc.gov/MarketReports/CommitmentsofTraders/ReleaseSchedule/index.htm';
const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
const monthIndex=new Map(months.map((m,i)=>[m.toLowerCase(),i+1]));
const clean=value=>value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
 .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
 .replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;|&#x0*a0;/gi,' ')
 .replace(/&amp;/gi,'&').replace(/[\u00a0\u2007\u202f]/g,' ')
 .replace(/\s+/g,' ').trim();
const validDate=date=>{
 if(!/^20\d\d-\d\d-\d\d$/.test(date))return false;
 const at=Date.parse(date+'T00:00:00Z');
 return Number.isFinite(at)&&new Date(at).toISOString().slice(0,10)===date;
};

export function parseCftcCotHtml(html,{fromDate='2025-01-01'}={}){
 if(!validDate(fromDate))throw Error('CFTC_FROM_DATE_INVALID');
 if(typeof html!=='string'||html.length<150||html.length>2*1024*1024||
  !/<html\b/i.test(html)||!/Commitments?\s+of\s+Traders/i.test(clean(html))||
  !/3\s*:\s*30\s*p\.m\.\s*Eastern\s+time/i.test(clean(html)))
  throw Error('CFTC_OFFICIAL_PAGE_INVALID');
 const years=new Set(),events=[];
 const headings=[...html.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi)];
 for(let i=0;i<headings.length;i++){
  const label=clean(headings[i][1]);
  const match=label.match(/^(20\d\d)\s+Release\s+Schedule$/i);
  if(!match)continue;
  const year=Number(match[1]);
  if(years.has(year))throw Error('CFTC_DUPLICATE_YEAR');
  years.add(year);
  const start=headings[i].index+headings[i][0].length;
  const end=i+1<headings.length?headings[i+1].index:html.length;
  const section=html.slice(start,end);
  const table=section.match(/<table\b[^>]*>([\s\S]*?)<\/table>/i);
  if(!table||table.index>1000)throw Error('CFTC_OFFICIAL_TABLE_MISSING');
  const rows=[...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
  const observedMonths=new Set();
  let holidayMarkers=0;
  for(const row of rows){
   const cells=[...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>clean(m[1]));
   if(cells[0]==='Month')continue;
   const month=monthIndex.get((cells[0]??'').toLowerCase());
   if(!month)throw Error('CFTC_MONTH_ROW_UNRECOGNIZED');
   if(observedMonths.has(month))throw Error('CFTC_DUPLICATE_MONTH');
   observedMonths.add(month);
   if(cells.length<2||cells.slice(1).every(s=>!s))throw Error('CFTC_MONTH_DATES_MISSING');
   const monthDates=new Set();
   for(const cell of cells.slice(1)){
    if(!cell)continue;
    if(!/^\d{1,2}\*?$/.test(cell))throw Error('CFTC_DATE_CELL_INVALID');
    const day=Number(cell.replace('*',''));
    const date=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    if(!validDate(date)||monthDates.has(date))throw Error('CFTC_INVALID_OR_DUPLICATE_DATE');
    monthDates.add(date);
    const delayed=cell.endsWith('*');
    if(delayed)holidayMarkers++;
    if(date>=fromDate)events.push({id:'cftc-cot',date,
     title:delayed?'Commitments of Traders (COT) · Holiday-delayed':'Commitments of Traders (COT)',
     source:'cftc',sourceUrl:CFTC_COT_URL});
   }
  }
  if(observedMonths.size!==12)throw Error('CFTC_YEAR_MONTHS_INCOMPLETE');
  if(holidayMarkers&&!/\*\s*Delayed\s+release\s+date\s+due\s+to\s+a\s+federal\s+holiday/i.test(clean(section.slice(table.index+table[0].length))))
   throw Error('CFTC_HOLIDAY_MARKER_EXPLANATION_MISSING');
 }
 if(!years.size)throw Error('CFTC_OFFICIAL_YEAR_MISSING');
 return events.sort((a,b)=>a.date.localeCompare(b.date));
}
