export const AIS_DAILY_URL='https://hormuz.now/api/daily.json';
const DAY=86400000;
export function parseAisDaily(body,{now=Date.now()}={}){
 const data=JSON.parse(body);
 if(!Array.isArray(data.days)||data.days.length>2000||!Number.isSafeInteger(data.generatedAt)||data.generatedAt>now)throw Error('AIS_RESPONSE_INVALID');
 const seen=new Set(),rows=[];
 for(const r of data.days){
  if(typeof r.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||new Date(r.date+'T00:00:00Z').toISOString().slice(0,10)!==r.date||seen.has(r.date))throw Error('AIS_DATE_INVALID');
  seen.add(r.date);
  if(!['live','legacy','mixed'].includes(r.source)||r.partial!=null&&typeof r.partial!=='boolean')throw Error('AIS_PROVENANCE_INVALID');
  // Reconstructed rows and current partial UTC day cannot enter the calculation.
  if(r.source!=='live'||r.partial===true||Date.parse(r.date+'T00:00:00Z')+DAY>data.generatedAt)continue;
  if(![r.in,r.out,r.total].every(n=>Number.isSafeInteger(n)&&n>=0)||r.in+r.out!==r.total)throw Error('AIS_COUNTS_INVALID');
  // Allowlist only: no PortWatch values, averages, equivalent counts or site status.
  rows.push({date:r.date,inbound:r.in,outbound:r.out,value:r.total,source:'live',partial:false,qualityVerified:false});
 }
 rows.sort((a,b)=>a.date.localeCompare(b.date));
 return {source:'hormuz.now',rows,observationDate:rows.at(-1)?.date??null,generatedAt:data.generatedAt,
  attribution:{name:'hormuz.now',url:'https://hormuz.now/data',license:'CC BY 4.0',modified:true},
  upstreamTermsVerified:false,reason:'DAILY_COVERAGE_AND_UPSTREAM_RIGHTS_NOT_ESTABLISHED'};
}
