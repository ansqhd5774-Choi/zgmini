const finiteScore=value=>typeof value==="number"&&Number.isFinite(value)&&value>=0&&value<=100;
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);

function scoredRows(node){
  return (Array.isArray(node?.rows)?node.rows:[])
    .filter(row=>validDate(row?.observationDate)&&finiteScore(row?.score))
    .sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
}

function coverage(id,node){
  const rows=scoredRows(node);
  return {
    id,
    count:rows.length,
    first:rows.at(0)?.observationDate??null,
    last:rows.at(-1)?.observationDate??null,
  };
}

export function diagnoseLiquidityHistoryCoverage(r1,{asOfDate=null,requiredDays=365}={}){
  const components=[
    coverage("fundingStress",r1?.components?.fundingStress),
    coverage("bankReserves",r1?.components?.bankReserves),
    coverage("tga",r1?.components?.tga),
    coverage("onRrp",r1?.components?.onRrp),
    coverage("m2",r1?.components?.m2),
    coverage("bondVolatility",r1?.components?.bondVolatility),
  ];
  const complete=components.every(item=>item.first&&item.last);
  const historyStart=complete?components.map(item=>item.first).sort().at(-1):null;
  const historyEnd=complete?components.map(item=>item.last).sort().at(0):null;
  const availableDays=historyStart&&historyEnd
    ? Math.max(0,Math.floor((Date.parse(historyEnd+"T00:00:00Z")-Date.parse(historyStart+"T00:00:00Z"))/86400000))
    : 0;
  const bottlenecks=historyStart?components.filter(item=>item.first===historyStart).map(item=>item.id):components.filter(item=>!item.first).map(item=>item.id);
  const asOfValid=validDate(asOfDate);
  const oneYearStart=asOfValid?new Date(Date.parse(asOfDate+"T00:00:00Z")-requiredDays*86400000).toISOString().slice(0,10):null;
  return {
    status:complete&&historyStart&&oneYearStart&&historyStart<=oneYearStart?"READY_1Y":"INSUFFICIENT_1Y",
    components,
    historyStart,
    historyEnd,
    availableDays,
    requiredDays,
    oneYearStart,
    bottlenecks,
  };
}
