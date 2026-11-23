// US Fear & Greed multi-day chart tooltip: show the observation's US market calendar day.
// Preserve date-only historical keys as published, and never interpret them as UTC instants
// (which would shift them back a day in America/New_York).
const usMarketDateParts=new Intl.DateTimeFormat('en-US',{
 timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',
});

export function cnnUsMultiDayTooltipDate(value){
 if(typeof value!=='string')return '—';
 if(/^\d{4}-\d{2}-\d{2}$/.test(value)){
  const time=Date.parse(value+'T00:00:00Z');
  return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===value?value:'—';
 }
 if(!/^\d{4}-\d{2}-\d{2}T/.test(value))return '—';
 const ms=Date.parse(value);
 if(!Number.isFinite(ms))return '—';
 const pieces=usMarketDateParts.formatToParts(new Date(ms));
 const part=type=>pieces.find(x=>x.type===type)?.value;
 const year=part('year'),month=part('month'),day=part('day');
 return year&&month&&day?`${year}-${month}-${day}`:'—';
}
