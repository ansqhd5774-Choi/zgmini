// R24 staging only. Official USDA WASDE explicit release dates, not a
// reconstructed monthly recurrence. No PC/Core integration in this phase.
export const USDA_WASDE_URL='https://www.usda.gov/about-usda/general-information/staff-offices/office-chief-economist/commodity-markets/wasde-report';

const monthByName=new Map(['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].map((name,i)=>[name,i+1]));
const validDate=value=>/^20\d\d-\d\d-\d\d$/.test(value)&&
 new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;

function officialText(html){
 if(typeof html!=='string'||html.length<100||html.length>1500000)throw Error('USDA_HTML_SIZE_INVALID');
 if(!/<html\b/i.test(html)||!/WASDE\s*Report/i.test(html))throw Error('USDA_PAGE_INVALID');
 const main=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
  .replace(/<[^>]+>/g,' ')
  .replace(/&nbsp;|&#160;|&#x0*a0;/gi,' ')
  .replace(/&amp;/gi,'&')
  .replace(/[\u00a0\u2007\u202f]/g,' ')
  .replace(/\s+/g,' ');
 return main;
}

export function parseUsdaWasdeHtml(html,{fromDate='2025-01-01'}={}){
 if(!validDate(fromDate))throw Error('USDA_FROM_DATE_INVALID');
 const text=officialText(html),events=[],coveredYears=[];
 const yearPattern=/(20\d{2})\s+WASDE\s+Release\s+Dates\s*\(\s*12\s*:\s*00\s*(?:pm|p\.m\.)\s*ET\s*\)/gi;
 for(const heading of text.matchAll(yearPattern)){
  const year=Number(heading[1]);
  const following=text.slice(heading.index+heading[0].length,heading.index+heading[0].length+520);
  const releaseSentence=new RegExp(`In\\s+${year}\\s+the\\s+WASDE\\s+report\\s+will\\s+be\\s+released\\s+on\\s+`,'i');
  const sentence=releaseSentence.exec(following);
  if(!sentence)throw Error('USDA_WASDE_YEAR_SENTENCE_MISSING');
  const body=following.slice(sentence.index+sentence[0].length, sentence.index+sentence[0].length+300);
  const dates=new Map();
  for(const part of body.matchAll(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s*(\d{1,2})\b/gi)){
   const month=monthByName.get(part[1].toLowerCase());
   if(!month||dates.has(month))continue;
   const date=`${year}-${String(month).padStart(2,'0')}-${part[2].padStart(2,'0')}`;
   if(!validDate(date))throw Error('USDA_WASDE_INVALID_DATE');
   dates.set(month,date);
   if(dates.size===12)break;
  }
  if(dates.size!==12)throw Error('USDA_WASDE_YEAR_INCOMPLETE');
  coveredYears.push(year);
  for(const date of dates.values())if(date>=fromDate)events.push({
   id:'usda-wasde',date,title:'World Agricultural Supply and Demand Estimates (WASDE)',
   source:'usda',sourceUrl:USDA_WASDE_URL,
  });
 }
 if(!coveredYears.length)throw Error('USDA_WASDE_OFFICIAL_DATES_MISSING');
 if(new Set(coveredYears).size!==coveredYears.length)throw Error('USDA_WASDE_DUPLICATE_YEAR');
 return events.sort((a,b)=>a.date.localeCompare(b.date));
}
