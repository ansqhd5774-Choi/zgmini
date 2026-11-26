// TreasuryDirect's weekly CUSIP release is an explicit, rolling set of
// announcement / competitive-auction / issue dates. Issue dates are not
// calendar release events. No weekday pattern or clock time is inferred.
export const TREASURY_CUSIP_XML_URL='https://www.treasurydirect.gov/xml/TreasuryCUSIPRelease.xml';
export const TREASURY_AUCTIONS_PAGE='https://www.treasurydirect.gov/auctions/auction-announcements/';

const validDate=value=>{
 if(!/^20\d{2}-\d{2}-\d{2}$/.test(value))return false;
 const parsed=Date.parse(value+'T00:00:00Z');
 return Number.isFinite(parsed)&&new Date(parsed).toISOString().slice(0,10)===value;
};
const tag=(text,name)=>{
 const found=text.match(new RegExp(`<${name}>\\s*([^<]*?)\\s*<\\/${name}>`,'i'));
 return found?.[1]?.trim()??null;
};
const titleFor=(description,kind,reopening)=>{
 const week=description.match(/^(\d+)-Week Bill$/i);
 const year=description.match(/^(\d+)-Year (Note|Bond|TIPS|FRN)$/i);
 const base=week?`미국 ${week[1]}주물 단기국채`:year?`미국 ${year[1]}년물 ${year[2]==='TIPS'?'물가연동국채':'국채'}`:`미국 재무부 ${description}`;
 return `${base} ${kind==='auction'?'입찰':'입찰 공고'}${reopening?' · 재발행':''}`;
};

export function parseTreasuryCusipXml(xml,{fromDate='2025-01-01'}={}){
 if(!validDate(fromDate))throw Error('TREASURY_FROM_DATE_INVALID');
 if(typeof xml!=='string'||xml.length<100||xml.length>3*1024*1024||
  !/<Data>\s*<TreasuryCUSIPRelease>/i.test(xml)||
  !/<\/Data>\s*$/i.test(xml.trim())||
  /<html\b|<!DOCTYPE/i.test(xml))throw Error('TREASURY_OFFICIAL_XML_INVALID');
 const rows=[...xml.matchAll(/<TreasuryCUSIPRelease>\s*([\s\S]*?)\s*<\/TreasuryCUSIPRelease>/gi)];
 if(!rows.length)throw Error('TREASURY_RELEASE_ENTRIES_MISSING');
 const events=[];
 for(const [,content] of rows){
  const offering=content.match(/<OfferingDescription>([\s\S]*?)<\/OfferingDescription>/i)?.[1];
  const dates=content.match(/<Dates>([\s\S]*?)<\/Dates>/i)?.[1];
  if(!offering||!dates)throw Error('TREASURY_ENTRY_SECTIONS_MISSING');
  const cusip=tag(offering,'CUSIP');
  const description=tag(offering,'SecurityDescription');
  const type=tag(offering,'SecurityType');
  const reopening=tag(offering,'Reopening');
  const announcement=tag(dates,'AnnouncementDate');
  const auction=tag(dates,'CompetitiveAuctionCloseDate');
  const issue=tag(dates,'IssueDate');
  if(!/^[A-Z0-9]{9}$/i.test(cusip??'')||
   !description||description.length>100||!/^([\w -]+)$/.test(description)||
   !/^(Bill|Note|Bond|TIPS|FRN)$/i.test(type??'')||
   !/^[YN]$/i.test(reopening??'')||
   !validDate(announcement)||!validDate(auction)||!validDate(issue)||
   announcement>auction||auction>issue)throw Error('TREASURY_ENTRY_FIELD_INVALID');
  const common={source:'treasury',sourceUrl:TREASURY_AUCTIONS_PAGE};
  for(const [kind,date] of [['announcement',announcement],['auction',auction]]){
   if(date<fromDate)continue;
   events.push({id:`treasury-${kind}-${cusip.toLowerCase()}`,date,
    title:titleFor(description,kind,reopening.toUpperCase()==='Y'),...common});
  }
 }
 const keys=new Set();
 for(const event of events){
  const key=event.id+':'+event.date;
  if(keys.has(key))throw Error('TREASURY_DUPLICATE_CUSIP_DATE');
  keys.add(key);
 }
 return events.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
}
