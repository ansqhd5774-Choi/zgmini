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


/**
 * Construct an intraday chart point only from this domain's verified full
 * timestamp. The global snapshot can refresh while monthly data remains old.
 * Its timestamp must never masquerade as a new domain observation.
 * Date-only domain.updatedAt identifies an observation period, not a new
 * calculation instant; the period belongs to the saved domain trend.
 *
 * @param {{status?:string,score?:number|null,updatedAt?:string|null}|null} domain
 * @param {string|null|undefined} snapshotUpdatedAt
 * @returns {{label:string,value:number}|null}
 */
export function verifiedPublishedDomainCurrentR4(domain,snapshotUpdatedAt){
 if(domain?.status!=='READY'||!valid(domain?.score))return null;
 const stored=domain?.updatedAt;
 if(typeof stored!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(stored))return null;
 const at=Date.parse(stored),snapshotAt=Date.parse(snapshotUpdatedAt??'');
 if(!Number.isFinite(at)||!Number.isFinite(snapshotAt)||at>snapshotAt)return null;
 return {label:new Date(at).toISOString(),value:domain.score};
}
