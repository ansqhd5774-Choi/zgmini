// Official CFTC COT schedule: 3:30pm America/New_York on each listed date.
// The existing five-field event contract has no timestamp; derive the verified
// clock for UI presentation without adding fields to the stored event schema.
const dateValid=value=>{
 if(typeof value!=='string'||!/^20\d\d-\d\d-\d\d$/.test(value))return false;
 const ms=Date.parse(value+'T00:00:00Z');
 return Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,10)===value;
};
const nyParts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',
 year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});

export function cftcCotReleaseAt(officialDate){
 if(!dateValid(officialDate))return null;
 // 15:30 New York is 19:30 UTC in EDT and 20:30 UTC in EST.
 // Compare the actual IANA time-zone clock, not a hard-coded DST switch date.
 for(const utcHour of [19,20]){
  const iso=`${officialDate}T${utcHour}:30:00.000Z`;
  const parts=Object.fromEntries(nyParts.formatToParts(new Date(iso)).map(p=>[p.type,p.value]));
  if(`${parts.year}-${parts.month}-${parts.day}`===officialDate&&
   parts.hour==='15'&&parts.minute==='30')return iso;
 }
 return null;
}
