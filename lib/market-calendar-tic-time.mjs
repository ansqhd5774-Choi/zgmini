// Official TIC release time is 4pm Washington, D.C. local time. The stored
// five-field calendar event deliberately keeps only the US official date.
const validDate=s=>typeof s==='string'&&/^20\d\d-\d\d-\d\d$/.test(s)&&
 Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const ny=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',
 month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});

export function ticReleaseAt(officialDate){
 if(!validDate(officialDate))return null;
 for(const hour of [20,21]){
  const iso=officialDate+'T'+String(hour)+':00:00.000Z';
  const p=Object.fromEntries(ny.formatToParts(new Date(iso)).map(v=>[v.type,v.value]));
  if(p.year+'-'+p.month+'-'+p.day===officialDate&&p.hour==='16'&&p.minute==='00')return iso;
 }
 return null;
}
