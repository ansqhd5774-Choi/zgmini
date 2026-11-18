// W05-only, pure read-model guards for public QFR/BEA C sidecar displays.
// These verify published quarter history; never recompute the official indicator
// or mutate an approved source, calculation, checkpoint or public API payload.
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const near=(a,b)=>finite(a)&&finite(b)
  &&Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(a),Math.abs(b));

export function earningsQuarterIndexFromEnd(date){
  if(typeof date!=='string'||!/^([0-9]{4})-(03-31|06-30|09-30|12-31)$/.test(date))
    return null;
  const ms=Date.parse(date+'T00:00:00.000Z');
  if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,10)!==date)return null;
  const year=Number(date.slice(0,4)),month=Number(date.slice(5,7));
  return year*4+month/3-1;
}
export function earningsQuarterIndexFromLabel(label){
  if(typeof label!=='string'||!/^([0-9]{4})-Q([1-4])$/.test(label))return null;
  const [year,quarter]=label.split('-Q').map(Number);
  return year*4+quarter-1;
}
const five=(history)=>Array.isArray(history)&&history.length===5;

export function earningsQfrQuarterHistoryMatches(row){
  const last=earningsQuarterIndexFromLabel(row?.observationPeriod);
  if(last===null||earningsQuarterIndexFromLabel(row?.previousPeriod)!==last-1
    ||!five(row?.history)||!finite(row?.value)||!finite(row?.previousValue)
    ||!finite(row?.change)||!near(row.change,row.value-row.previousValue))
    return false;
  if(!row.history.every((point,i)=>
    earningsQuarterIndexFromLabel(point?.period)===last-4+i&&finite(point?.value)))
    return false;
  return row.history[4].value===row.value&&row.history[3].value===row.previousValue;
}

export function earningsBeaUnitQuarterHistoryMatches(row){
  const last=earningsQuarterIndexFromEnd(row?.observationPeriodEnd);
  if(last===null||earningsQuarterIndexFromEnd(row?.previousPeriodEnd)!==last-1
    ||!five(row?.history)||!finite(row?.value)||!finite(row?.previousValue)
    ||!finite(row?.change)||!near(row.change,row.value-row.previousValue))
    return false;
  if(!row.history.every((point,i)=>
    earningsQuarterIndexFromEnd(point?.date)===last-4+i&&finite(point?.value)))
    return false;
  return row.history[4].value===row.value&&row.history[3].value===row.previousValue;
}

export function earningsBeaManufacturingQuarterHistoryMatches(row){
  const last=earningsQuarterIndexFromEnd(row?.observationPeriodEnd);
  if(last===null||earningsQuarterIndexFromLabel(row?.observationPeriod)!==last
    ||earningsQuarterIndexFromEnd(row?.yearAgoPeriodEnd)!==last-4
    ||earningsQuarterIndexFromLabel(row?.yearAgoPeriod)!==last-4
    ||!five(row?.history)||!finite(row?.currentProfitsBillionsUsdAnnualRate)
    ||!finite(row?.yearAgoProfitsBillionsUsdAnnualRate))return false;
  if(!row.history.every((point,i)=>
    earningsQuarterIndexFromEnd(point?.periodEnd)===last-4+i
    &&earningsQuarterIndexFromLabel(point?.period)===last-4+i
    &&finite(point?.profitsBillionsUsdAnnualRate)))return false;
  return row.history[0].profitsBillionsUsdAnnualRate===row.yearAgoProfitsBillionsUsdAnnualRate
    &&row.history[4].profitsBillionsUsdAnnualRate===row.currentProfitsBillionsUsdAnnualRate;
}
