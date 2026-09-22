const finiteScore=value=>typeof value==="number"&&Number.isFinite(value)&&value>=0&&value<=100;
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);

function latestFieldAtOrBefore(rows,asOfDate,field){
  if(!Array.isArray(rows)||!validDate(asOfDate))return null;
  let best=null;
  for(const row of rows){
    const date=row?.observationDate;
    const value=row?.[field];
    if(!validDate(date)||date>asOfDate||!finiteScore(value))continue;
    if(!best||date>best.observationDate)best={observationDate:date,value};
  }
  return best;
}

function latestRowAtOrBefore(rows,asOfDate){
  if(!Array.isArray(rows)||!validDate(asOfDate))return null;
  let best=null;
  for(const row of rows){
    const date=row?.observationDate;
    if(!validDate(date)||date>asOfDate)continue;
    if(!best||date>best.observationDate)best=row;
  }
  return best;
}

export function buildConsumptionC1({recessionRows=[],asOfDate}={}){
  const realPce=latestFieldAtOrBefore(recessionRows,asOfDate,"realPceScore");
  const retailSales=latestFieldAtOrBefore(recessionRows,asOfDate,"retailSalesScore");
  const missing=[];
  if(!realPce)missing.push("REAL_PCE_SCORE_MISSING");
  if(!retailSales)missing.push("RETAIL_SALES_SCORE_MISSING");

  const indicators=[
    {name:"실질 PCE",score:realPce?.value??null,status:realPce?"READY":"UNAVAILABLE"},
    {name:"실질 소매판매",score:retailSales?.value??null,status:retailSales?"READY":"UNAVAILABLE"},
  ];

  if(missing.length){
    return {
      status:"PARTIAL",score:null,missingFactors:missing,
      indicators,trend:[],freshness:"CURRENT_VINTAGE_ONLY",
      updatedAt:null,
      interpretation:"C1: 실질 PCE 50% + 실질 소매판매 50%; 두 구성요소 모두 필요",
    };
  }

  return {
    status:"READY",
    score:0.50*realPce.value+0.50*retailSales.value,
    missingFactors:[],
    indicators,
    trend:[],
    freshness:"CURRENT_VINTAGE_ONLY",
    updatedAt:[realPce.observationDate,retailSales.observationDate].sort().at(-1),
    interpretation:"C1: 실질 PCE 50% + 실질 소매판매 50%",
  };
}

// Keep only the uninterrupted, fully scored monthly suffix. Missing inputs are
// never interpolated, carried forward, or replaced with the diagnostic score.
function commoditiesTrend(rows,asOfDate){
  const dated=new Map();
  for(const row of rows){
    if(validDate(row?.observationDate)&&row.observationDate<=asOfDate&&!dated.has(row.observationDate)){
      dated.set(row.observationDate,row);
    }
  }
  let trend=[],previousMonth=null;
  for(const [date,row] of [...dated].sort(([a],[b])=>a.localeCompare(b))){
    const month=Number(date.slice(0,4))*12+Number(date.slice(5,7))-1;
    if(previousMonth!==null&&month!==previousMonth+1)trend=[];
    previousMonth=month;
    if(![row.oilScore,row.gasolineScore,row.copperScore].every(finiteScore)){
      trend=[];
      continue;
    }
    trend.push({label:date,value:commoditiesScore(row)});
  }
  return trend;
}
const commoditiesScore=row=>0.50*row.oilScore+0.25*row.gasolineScore+0.25*row.copperScore;

export function buildCommoditiesK1({supplyRows=[],asOfDate}={}){
  const row=latestRowAtOrBefore(supplyRows,asOfDate);
  const oil=row?.oilScore;
  const gasoline=row?.gasolineScore;
  const copper=row?.copperScore;
  const missing=[];
  if(!finiteScore(oil))missing.push("OIL_SCORE_MISSING");
  if(!finiteScore(gasoline))missing.push("GASOLINE_SCORE_MISSING");
  if(!finiteScore(copper))missing.push("COPPER_SCORE_MISSING");

  const indicators=[
    {name:"WTI",score:finiteScore(oil)?oil:null,status:finiteScore(oil)?"READY":"UNAVAILABLE"},
    {name:"휘발유",score:finiteScore(gasoline)?gasoline:null,status:finiteScore(gasoline)?"READY":"UNAVAILABLE"},
    {name:"구리",score:finiteScore(copper)?copper:null,status:finiteScore(copper)?"READY":"UNAVAILABLE"},
  ];

  if(missing.length){
    return {
      status:"PARTIAL",score:null,missingFactors:missing,
      indicators,trend:[],freshness:"CURRENT_VINTAGE_ONLY",
      updatedAt:validDate(row?.observationDate)?row.observationDate:null,
      interpretation:"K1: WTI 50% + 휘발유 25% + 구리 25%; 세 구성요소 모두 필요",
    };
  }

  return {
    status:"READY",
    score:commoditiesScore(row),
    missingFactors:[],
    indicators,
    trend:commoditiesTrend(supplyRows,asOfDate),
    freshness:"CURRENT_VINTAGE_ONLY",
    updatedAt:row.observationDate,
    interpretation:"K1: WTI 50% + 휘발유 25% + 구리 25%",
  };
}
