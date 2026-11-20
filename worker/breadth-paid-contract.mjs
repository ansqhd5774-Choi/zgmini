export const PAID_BREADTH_KEY='breadth-paid-b1-r5-v1';
export const PAID_BREADTH_VERSION='ZGMINI_BREADTH_PAID_B1_R5_V1';
export const PAID_BREADTH_SOURCE='MARKETPARQUET_PAID_SPLIT_ADJUSTED_DAILY';
const num=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;
const date=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
const hash=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
export function validPaidBreadthRecord(b){
 const d=b?.domain;
 return b?.version===PAID_BREADTH_VERSION&&b.plan==='full'&&b.source===PAID_BREADTH_SOURCE&&date(b.observationDate)&&b.sourceLatestDate>=b.observationDate&&date(b.sourceLatestDate)&&hash(b.sourceVersion)&&hash(b.pitSha256)&&Array.isArray(b.inputSha256)&&[1,3].includes(b.inputSha256.length)&&b.inputSha256.every(hash)&&
 d?.id==='breadth'&&d.name==='수급·폭'&&d.status==='READY'&&d.source===PAID_BREADTH_SOURCE&&d.methodologyVersion==='B1-R5-STORED-BREADTH-4FACTOR-EMA3-R2'&&d.observationDate===b.observationDate&&num(d.score)&&
 Array.isArray(d.trend)&&d.trend.length>0&&d.trend.length<=260&&d.trend.every((p,i)=>date(p?.label)&&num(p.value)&&(!i||p.label>d.trend[i-1].label))&&d.trend.at(-1).label===b.observationDate&&d.trend.at(-1).value===d.score&&
 Array.isArray(d.indicators)&&d.indicators.length===4&&d.indicators.every((p,i)=>p.id==='breadth-'+(41+i)&&p.status==='READY'&&num(p.score)&&num(p.value)&&p.observationDate===b.observationDate)&&
 b.quality?.returnCoverage>=.98&&b.quality?.returnCoverage<=1&&b.quality?.tradingValueCoverage>=.98&&b.quality?.tradingValueCoverage<=1;
}
