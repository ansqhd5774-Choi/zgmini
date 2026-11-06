// Official US Treasury International Capital (TIC) publication schedule.
// Source HTML is stored before parsing. The existing public event contract
// remains {id,date,title,source,sourceUrl}; issue/reference periods are not
// inferred, and the 4pm America/New_York timestamp is a UI-only derivation.
export const TIC_RELEASE_DATES_URL='https://home.treasury.gov/data/treasury-international-capital-tic-system/release-dates-of-tic-data';

const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
const series=[
 {slug:'monthly',title:'미국 TIC 월간 국제자본거래 발표'},
 {slug:'quarterly-nonfinancial',title:'미국 TIC 분기 비금융·파생상품 통계'},
 {slug:'quarterly-external-debt',title:'미국 TIC 분기 대외부채 통계'},
 {slug:'annual-foreign-us',title:'미국 TIC 연간 외국인 미국증권 보유'},
 {slug:'annual-us-foreign',title:'미국 TIC 연간 미국인 외국증권 보유'},
];
const entityText=s=>String(s).replace(/&nbsp;|&#(?:160|x[aA]0);/gi,' ')
 .replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')
 .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
 .replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));
const clean=s=>entityText(s.replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
const strictDate=s=>/^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(s)&&
 new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;

function officialTable(html){
 if(typeof html!=='string'||html.length<100||html.length>3*1024*1024)throw Error('TIC_HTML_INVALID');
 const candidates=[...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)]
  .map(m=>m[0]).filter(t=>/All data releases occur at 4 p\.m\./i.test(clean(t))&&
   /Washington, D\.C\. time/i.test(clean(t)));
 if(candidates.length!==1)throw Error('TIC_OFFICIAL_TABLE_NOT_UNIQUE');
 const table=candidates[0];
 const header=table.match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/i)?.[1];
 const body=table.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i)?.[1];
 if(!header||!body)throw Error('TIC_TABLE_SECTION_MISSING');
 const names=[...header.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map(m=>clean(m[1]));
 if(names.length!==6||!/Date:/i.test(names[0])||
  !/^Monthly:/i.test(names[1])||!/^Quarterly:/i.test(names[2])||
  !/^Quarterly:/i.test(names[3])||!/^Annual:/i.test(names[4])||
  !/^Annual:/i.test(names[5])||!/gross external debt/i.test(names[3])||
  !/Foreign portfolio holdings of U\.S\. securities/i.test(names[4])||
  !/U\.S\. portfolio holdings of foreign securities/i.test(names[5]))
  throw Error('TIC_COLUMN_CONTRACT_CHANGED');
 return body;
}

export function parseTicReleaseDatesHtml(html,{fromDate='2025-01-01'}={}){
 if(!strictDate(fromDate))throw Error('TIC_FROM_DATE_INVALID');
 const body=officialTable(html);
 const rows=[...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
 if(rows.length<26)throw Error('TIC_YEAR_MONTH_ROWS_MISSING');
 const events=[],seenRows=new Set(),years=new Map();
 let year=null;
 for(const row of rows){
  const cells=[];
  for(const m of row[1].matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/gi)){
   const span=Number(m[1].match(/\bcolspan\s*=\s*["']?(\d+)/i)?.[1]??1);
   if(!Number.isSafeInteger(span)||span<1||span>5)throw Error('TIC_CELL_SPAN_INVALID');
   cells.push(clean(m[2]),...Array(span-1).fill(''));
  }
  if(cells.length!==6)throw Error('TIC_ROW_COLUMNS_CHANGED');
  if(/^20\d\d$/.test(cells[0])){
   if(cells.slice(1).some(Boolean)||years.has(cells[0]))throw Error('TIC_YEAR_ROW_INVALID');
   year=Number(cells[0]);years.set(cells[0],new Set());continue;
  }
  if(cells.every(v=>!v))continue;
  if(year===null)throw Error('TIC_YEAR_MISSING');
  const month=months.findIndex(m=>m.toLowerCase()===cells[0].toLowerCase())+1;
  if(!month)throw Error('TIC_MONTH_INVALID');
  const monthKey=String(year)+'-'+String(month).padStart(2,'0');
  if(seenRows.has(monthKey))throw Error('TIC_MONTH_DUPLICATE');
  seenRows.add(monthKey);years.get(String(year)).add(month);
  for(let index=0;index<5;index++){
   const cell=cells[index+1];
   if(!cell)continue;
   const m=cell.match(/^([1-9]|[12]\d|3[01])(?:\s*[-–—]\s*(prelim\.?|final)|\s*\((delayed)\))?$/i);
   if(!m)throw Error('TIC_DAY_NOTE_UNRECOGNIZED');
   const date=monthKey+'-'+m[1].padStart(2,'0');
   if(!strictDate(date))throw Error('TIC_DAY_INVALID');
   const stage=m[2]?.toLowerCase().startsWith('prelim')?'preliminary':m[2]?'final':null;
   if(index>=3&&!stage)throw Error('TIC_ANNUAL_STAGE_MISSING');
   if(index<3&&stage)throw Error('TIC_UNEXPECTED_STAGE');
   const spec=series[index],id='tic-'+spec.slug+(stage?'-'+stage:'')+'-'+monthKey;
   const title=spec.title+(stage==='preliminary'?' · 잠정':stage==='final'?' · 최종':'')+
    (m[3]?' · 공휴일 지연':'');
   if(date>=fromDate)events.push({id,date,title,source:'tic',sourceUrl:TIC_RELEASE_DATES_URL});
  }
 }
 if(years.size<2||[...years.values()].some(v=>v.size!==12)||
  [...years.keys()].some(y=>[...years.keys()].some(z=>y!==z&&Math.abs(Number(y)-Number(z))>1)))
  throw Error('TIC_YEAR_COVERAGE_INCOMPLETE');
 if(!events.length)throw Error('TIC_RELEASES_EMPTY');
 return events.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
}
