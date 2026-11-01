const finite=value=>typeof value==="number"&&Number.isFinite(value);
const mean=values=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;
const median=values=>{
  if(!values.length)return null;
  const sorted=[...values].sort((a,b)=>a-b);
  const mid=Math.floor(sorted.length/2);
  return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;
};
const strictMean=values=>values.length&&values.every(finite)?mean(values):null;

function normalizeStoredRows(rows=[]){
  return rows
    .map(row=>({
      observationDate:typeof row?.observationDate==="string"?row.observationDate:null,
      availableAt:typeof row?.availableAt==="string"?row.availableAt:null,
      value:Number(row?.value),
    }))
    .filter(row=>row.observationDate&&row.availableAt&&finite(row.value))
    .sort((a,b)=>a.observationDate.localeCompare(b.observationDate)||a.availableAt.localeCompare(b.availableAt));
}
function derived(rows,lag,fn){
  const input=normalizeStoredRows(rows),out=[];
  for(let index=lag;index<input.length;index+=1){
    const current=input[index],prior=input[index-lag];
    let value=null;
    try{value=fn(current.value,prior.value);}catch{}
    if(!finite(value))continue;
    out.push({
      observationDate:current.observationDate,
      availableAt:current.availableAt>prior.availableAt?current.availableAt:prior.availableAt,
      value,
    });
  }
  return out.sort((a,b)=>a.availableAt.localeCompare(b.availableAt)||a.observationDate.localeCompare(b.observationDate));
}
const yoy=rows=>derived(rows,12,(current,prior)=>current>0&&prior>0?100*(current/prior-1):null);
const annualized3m=rows=>derived(rows,3,(current,prior)=>current>0&&prior>0?100*((current/prior)**4-1):null);
const log3m=rows=>derived(rows,3,(current,prior)=>current>0&&prior>0?100*Math.log(current/prior):null);
const quarterlyYoy=rows=>derived(rows,4,(current,prior)=>current>0&&prior>0?100*(current/prior-1):null);
const level=rows=>normalizeStoredRows(rows).sort((a,b)=>a.availableAt.localeCompare(b.availableAt)||a.observationDate.localeCompare(b.observationDate));

function normalizationConfig(feature){
  if(["CORE_PCE","CORE_CPI","CORE_CPI_3M","MEDIAN_CPI","TRIM16_CPI","HEADLINE_PCE","INF_EXPECT"].includes(feature)){
    return {centerMode:"FIXED_2",riskMode:"ABS"};
  }
  if(["WTI","GASOLINE"].includes(feature))return {centerMode:"FIXED_0",riskMode:"UP"};
  if(["PPI_FINAL","PPI_CORE_FD","IMPORT_EX_FUEL","WAGE_YOY","ECI_COST","UNIT_LABOR_COST"].includes(feature)){
    return {centerMode:"STRICT_PAST_MEDIAN",riskMode:"UP"};
  }
  if(feature==="INDPRO")return {centerMode:"STRICT_PAST_MEDIAN",riskMode:"ABS"};
  throw new Error(`INFLATION_R2_UNKNOWN_FEATURE_${feature}`);
}
function normalizeFeature(feature,rows,{warmup=6,multiplier=3}={}){
  const config=normalizationConfig(feature),past=[],out=[];
  for(const row of rows){
    if(past.length>=warmup){
      const center=config.centerMode==="FIXED_2"
        ? 2
        : config.centerMode==="FIXED_0"
          ? 0
          : median(past);
      const scale=median(past.map(value=>Math.abs(value-center)));
      if(finite(center)&&finite(scale)&&scale>1e-12){
        const risk=config.riskMode==="ABS"
          ? Math.abs(row.value-center)
          : Math.max(0,row.value-center);
        out.push({
          ...row,
          center,
          scale,
          risk,
          score:100*Math.exp(-risk/(multiplier*scale)),
          priorCount:past.length,
        });
      }
    }
    past.push(row.value);
  }
  return out;
}
function latestAtOrBefore(rows,asOfDate){
  let best=null;
  for(const row of rows??[]){
    if(row.availableAt<=asOfDate)best=row;
    else break;
  }
  return best;
}
function requirePc1Rows(rows,seriesId){
  const normalized=normalizeStoredRows(rows);
  if(!normalized.length)throw new Error(`INFLATION_R2_PC1_MISSING_${seriesId}`);
  return normalized.sort((a,b)=>a.availableAt.localeCompare(b.availableAt)||a.observationDate.localeCompare(b.observationDate));
}

export const INFLATION_R2_AXES=Object.freeze([
  "TARGET_STABILITY",
  "UNDERLYING_MOMENTUM",
  "HEADLINE_PRESSURE",
  "EXPECTATIONS",
  "SUPPLY_PIPELINE",
  "LABOR_COST_PERSISTENCE",
  "DEMAND_CONTEXT",
]);

export const INFLATION_R2_METHOD_REVISION="INFLATION_R2_R29_56_IA";

export function scoreInflationR2Axes(axes={}){
  const missing=INFLATION_R2_AXES.filter(axis=>!finite(axes?.[axis]));
  if(missing.length)return {status:"PARTIAL",score:null,missing};
  return {
    status:"READY",
    score:mean(INFLATION_R2_AXES.map(axis=>axes[axis])),
    missing:[],
  };
}

export function buildInflationR2StoredHistory({pitSeries={},pcePc1={}}={}){
  const features={
    CORE_PCE:requirePc1Rows(pcePc1.PCEPILFE,"PCEPILFE"),
    CORE_CPI:yoy(pitSeries.CPILFESL),
    CORE_CPI_3M:annualized3m(pitSeries.CPILFESL),
    MEDIAN_CPI:annualized3m(pitSeries.MEDCPIM094SFRBCLE),
    TRIM16_CPI:annualized3m(pitSeries.TRMMEANCPIM094SFRBCLE),
    HEADLINE_PCE:requirePc1Rows(pcePc1.PCEPI,"PCEPI"),
    INF_EXPECT:level(pitSeries.EXPINF5YR),
    WTI:log3m(pitSeries.MCOILWTICO),
    GASOLINE:log3m(pitSeries.GASREGCOVM),
    PPI_FINAL:annualized3m(pitSeries.PPIFIS),
    PPI_CORE_FD:annualized3m(pitSeries.WPSFD49116),
    IMPORT_EX_FUEL:yoy(pitSeries.IREXFUELS),
    WAGE_YOY:yoy(pitSeries.CES0500000003),
    ECI_COST:quarterlyYoy(pitSeries.ECIALLCIV),
    UNIT_LABOR_COST:level(pitSeries.PRS85006111),
    INDPRO:annualized3m(pitSeries.INDPRO),
  };
  return Object.fromEntries(
    Object.entries(features).map(([feature,rows])=>[feature,normalizeFeature(feature,rows)])
  );
}

export function snapshotInflationR2Features(history,asOfDate){
  return Object.fromEntries(
    Object.entries(history??{}).map(([feature,rows])=>{
      const row=latestAtOrBefore(rows??[],asOfDate);
      return [feature,row?{
        observationDate:row.observationDate??null,
        availableAt:row.availableAt??null,
        value:finite(row.value)?row.value:null,
        center:finite(row.center)?row.center:null,
        scale:finite(row.scale)?row.scale:null,
        risk:finite(row.risk)?row.risk:null,
        score:finite(row.score)?row.score:null,
      }:null];
    })
  );
}

export function calculateInflationR2At(history,asOfDate){
  const score=feature=>latestAtOrBefore(history?.[feature]??[],asOfDate)?.score??null;
  const values={
    CORE_PCE:score("CORE_PCE"),
    CORE_CPI:score("CORE_CPI"),
    CORE_CPI_3M:score("CORE_CPI_3M"),
    MEDIAN_CPI:score("MEDIAN_CPI"),
    TRIM16_CPI:score("TRIM16_CPI"),
    HEADLINE_PCE:score("HEADLINE_PCE"),
    INF_EXPECT:score("INF_EXPECT"),
    WTI:score("WTI"),
    GASOLINE:score("GASOLINE"),
    PPI_FINAL:score("PPI_FINAL"),
    PPI_CORE_FD:score("PPI_CORE_FD"),
    IMPORT_EX_FUEL:score("IMPORT_EX_FUEL"),
    WAGE_YOY:score("WAGE_YOY"),
    ECI_COST:score("ECI_COST"),
    UNIT_LABOR_COST:score("UNIT_LABOR_COST"),
    INDPRO:score("INDPRO"),
  };
  const robust=strictMean([values.MEDIAN_CPI,values.TRIM16_CPI]);
  const energy=strictMean([values.WTI,values.GASOLINE]);
  const ppi=strictMean([values.PPI_FINAL,values.PPI_CORE_FD]);
  const axes={
    TARGET_STABILITY:strictMean([values.CORE_PCE,values.CORE_CPI]),
    UNDERLYING_MOMENTUM:strictMean([values.CORE_CPI_3M,robust]),
    HEADLINE_PRESSURE:values.HEADLINE_PCE,
    EXPECTATIONS:values.INF_EXPECT,
    SUPPLY_PIPELINE:strictMean([energy,ppi,values.IMPORT_EX_FUEL]),
    LABOR_COST_PERSISTENCE:strictMean([values.WAGE_YOY,values.ECI_COST,values.UNIT_LABOR_COST]),
    DEMAND_CONTEXT:values.INDPRO,
  };
  const scored=scoreInflationR2Axes(axes);
  return {
    ...scored,
    axes,
    methodologyVersion:INFLATION_R2_METHOD_REVISION,
    historyMode:"STORED_INITIAL_RELEASE_PLUS_PCE_PC1",
    lookAheadSafe:true,
  };
}
