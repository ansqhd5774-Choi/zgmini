// Chart-only current calculation overlay for the CM-R1 economic domain cards.
// Never persists synthetic history or changes a verified daily/long-range point.
const valid=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;

/**
 * @param {Array<{label:string,value:number}>} daily Verified published trend points.
 * @param {{label:string,value:number}|null} current Verified currently published calculation.
 * @param {number} periodDays
 */
export function appendPublishedDomainCurrent(daily=[],current=null,periodDays=365){
 const rows=Array.isArray(daily)?daily:[];
 // Long-range history retains the approved daily points, exactly as the CM-R1
 // composite does; an intraday point is not a new confirmed historical day.
 if(periodDays>=180||!valid(current?.value))return rows;
 const label=current?.label;
 if(typeof label!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(label))return rows;
 const at=Date.parse(label);
 if(!Number.isFinite(at))return rows;
 const last=rows.at(-1);
 const lastAt=last?Date.parse(last.label):null;
 if(last&&(!Number.isFinite(lastAt)||at<=lastAt||!valid(last.value)))return rows;
 // Repeating an identical score merely because the clock advanced must not
 // create another flat "observation" in the chart.
 if(last&&Math.abs(last.value-current.value)<=1e-7)return rows;
 return [...rows,{label:new Date(at).toISOString(),value:current.value}];
}
