export const CONSUMPTION_R4 = 'CONSUMPTION_R4';
const clip = x => Math.max(0, Math.min(100, x));
const monthIndex = date => /^\d{4}-\d{2}-01$/.test(date ?? '') && Number(date.slice(5,7)) >= 1 && Number(date.slice(5,7)) <= 12
  ? Number(date.slice(0,4))*12+Number(date.slice(5,7))-1 : null;

// Calendar lags, not array offsets. Missing observations never become zero.
export function calculateConsumptionR4(rows = [], {asOfDate} = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate ?? '')) throw Error('CONSUMPTION_R4_ASOF_INVALID');
  const monthly = new Map();
  for (const row of rows) {
    const date = row.observationDate ?? row.date;
    const index = monthIndex(date);
    if (index === null || date > asOfDate) continue;
    if (monthly.has(index)) throw Error('CONSUMPTION_R4_DUPLICATE_MONTH');
    monthly.set(index, {date, value: row.value});
  }
  const results = [...monthly.entries()].sort(([a],[b])=>a-b).map(([index, current]) => {
    const valid = offset => {const value=monthly.get(index-offset)?.value;return typeof value==='number'&&Number.isFinite(value)&&value>0;};
    const missing = Array.from({length:13},(_,i)=>i).filter(offset=>!valid(offset));
    if (missing.length) return {date:current.date,status:'PARTIAL',score:null,missingOffsets:missing};
    const value = offset => monthly.get(index-offset).value;
    const shortGrowth = 100*((value(0)/value(3))**4-1);
    const annualGrowth = 100*(value(0)/value(12)-1);
    const shortScore = clip(50+10*shortGrowth), annualScore = clip(50+10*annualGrowth);
    const acceleration = shortGrowth-100*((value(3)/value(6))**4-1);
    return {date:current.date,status:'READY',score:0.7*shortScore+0.3*annualScore,shortGrowth,annualGrowth,shortScore,annualScore,acceleration};
  });
  const latest=results.at(-1)??null;
  const ready=latest?.status==='READY';
  return {
    status:ready?'READY':'PARTIAL',score:ready?latest.score:null,
    methodologyVersion:CONSUMPTION_R4,updatedAt:latest?.date??null,asOfDate,
    freshness:'STORED_MONTHLY_REAL_PCE',historyMode:'CURRENT_VINTAGE_ONLY',lookAheadSafe:false,
    interpretation:'실질 PCE 최근 3개월 연율 70% + 전년 대비 30%. 50점은 소비 정체 기준이며 확률이 아닙니다. 가속도·가계 여력은 합산하지 않습니다.',
    missingFactors:ready?[]:['CONSUMPTION_R4_MONTHLY_INPUT_INCOMPLETE'],
    trend:results.slice(-13).map(row=>({date:row.date,value:row.score,status:row.status})),
    indicators:ready?[
      {id:'realPce3m',name:'실질 소비 최근 3개월',value:latest.shortGrowth,unit:'% 연율',score:latest.shortScore,weight:70,status:'READY',observationDate:latest.date,source:'BEA / FRED PCEC96'},
      {id:'realPceYoY',name:'실질 소비 전년 대비',value:latest.annualGrowth,unit:'%',score:latest.annualScore,weight:30,status:'READY',observationDate:latest.date,source:'BEA / FRED PCEC96'},
      {id:'realPceAcceleration',name:'소비 가속·둔화',value:latest.acceleration,unit:'%p',score:null,weight:0,status:'READY',observationDate:latest.date,source:'BEA / FRED PCEC96'},
    ]:[],
    rows:results,
  };
}
