// R10 public score-only factor trends. 13 real completed common months,
// never R9 history or a copy of the composite score. Missing is not zero.
const IDS=Object.freeze(["G","E","O","P","I"]);
const validMonth=value=>typeof value==="string"&&/^\d{4}-(0[1-9]|1[0-2])$/.test(value);
const serial=month=>Number(month.slice(0,4))*12+Number(month.slice(5))-1;
const validRisk=value=>typeof value==="number"&&Number.isFinite(value)&&value>=0&&value<=100;
const empty=()=>Object.fromEntries(IDS.map(id=>[id,[]]));

export function supplyR10FactorMiniHistories(rows=[],lastMonth=null){
  const output=empty();
  if(!validMonth(lastMonth)||!Array.isArray(rows))return output;
  const last=serial(lastMonth),first=last-12;
  const byMonth=new Map();
  for(const row of rows){
    const month=row?.month;
    if(!validMonth(month))continue;
    const index=serial(month);
    if(index<first||index>last)continue;
    // Duplicate months cannot be resolved by silently selecting a later vintage.
    if(byMonth.has(month))return empty();
    byMonth.set(month,row);
  }
  const ordered=[...byMonth.values()].sort((a,b)=>a.month.localeCompare(b.month));
  for(const id of IDS){
    let previousMonth=null;
    for(const row of ordered){
      if(row.status!=="READY"||!validRisk(row.scores?.[id]))continue;
      const risk=row.scores[id],score=100-risk;
      const index=serial(row.month);
      output[id].push({
        date:row.month+"-01",value:score,
        ...(previousMonth!==null&&index-previousMonth>1?{breakBefore:true}:{})
      });
      previousMonth=index;
    }
  }
  return output;
}
