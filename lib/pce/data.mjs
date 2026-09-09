export function normalizeCorePce(fred,bea,asOf) {
 const validDate=d=>/^\d{4}-(0[1-9]|1[0-2])-01$/.test(d)&&d<=asOf;
 for(const rows of [fred,bea]){if(!Array.isArray(rows)||!rows.length)throw Error('EMPTY_DATA');const seen=new Set();for(const p of rows){if(!validDate(p.date)||typeof p.value!=='number'||!Number.isFinite(p.value)||p.value<=0||seen.has(p.date))throw Error('INVALID_OBSERVATIONS');seen.add(p.date);}}
 const a=[...fred].sort((a,b)=>a.date.localeCompare(b.date)),b=[...bea].sort((a,b)=>a.date.localeCompare(b.date));
 if(a.at(-1).date!==b.at(-1).date)throw Error('SOURCE_LATEST_MONTH_MISMATCH');
 const actual=[];
 for(const p of b){const previousYear=String(Number(p.date.slice(0,4))-1)+p.date.slice(4);const fa=a.find(x=>x.date===p.date),fb=a.find(x=>x.date===previousYear),bb=b.find(x=>x.date===previousYear);if(!fa||!fb||!bb)continue;
 const value=(fa.value/fb.value-1)*100,beaYoy=(p.value/bb.value-1)*100;
 if(Math.abs(fa.value-p.value)>0.001||value.toFixed(1)!==beaYoy.toFixed(1))throw Error('CROSS_VALIDATION_MISMATCH');
 actual.push({date:p.date.slice(0,7),value:Number(value.toFixed(1)),rawYoy:value,status:'actual'});}
 if(actual.length<2||actual.at(-1).date!==a.at(-1).date.slice(0,7))throw Error('INSUFFICIENT_MATCHED_HISTORY');
 return actual;
}
export function periodData(actual,months){if(![1,3,6,12].includes(months)||!actual.length)return [];const latest=actual.at(-1).date;const end=Number(latest.slice(0,4))*12+Number(latest.slice(5))-1;return actual.filter(p=>{const n=Number(p.date.slice(0,4))*12+Number(p.date.slice(5))-1;return n>=end-months+1&&n<=end;});}
export function parseBeaCalendar(ics,now) {
 if(!ics.includes('BEGIN:VCALENDAR'))throw Error('INVALID_CALENDAR');
 const text=ics.replace(/\r?\n[ \t]/g,'');
 const events=text.split('BEGIN:VEVENT').slice(1).flatMap(block=>{const title=block.match(/SUMMARY:([^\r\n]+)/)?.[1]?.replace(/\\,/g,',');const stamp=block.match(/DTSTART:(\d{8}T\d{6}Z)/)?.[1];if(!title?.startsWith('Personal Income and Outlays,')||!stamp)return [];const utc=stamp.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,'$1-$2-$3T$4:$5:$6Z');return [{title,utc}];}).sort((a,b)=>a.utc.localeCompare(b.utc));
 return {next:events.find(e=>Date.parse(e.utc)>Date.parse(now))??null,events};
}
export function pceInterpretation(actual){const current=actual.at(-1),previous=actual.at(-2);if(!current||!previous)return '최신 데이터 확인 불가';const move=current.value===previous.value?'전월과 동일한 수준입니다.':current.value>previous.value?`전월(${previous.value.toFixed(1)}%)보다 상승했습니다.`:`전월(${previous.value.toFixed(1)}%)보다 하락했습니다.`;return `전년동월비 근원 PCE는 ${current.value.toFixed(1)}%로 ${move}`;}
export function releaseDDay(utc,now=new Date().toISOString()){if(!utc)return '확인 불가';const date=s=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(s));const days=Math.round((Date.parse(date(utc))-Date.parse(date(now)))/86400000);return days===0?'D-DAY':days>0?`D-${days}`:`D+${-days}`;}
