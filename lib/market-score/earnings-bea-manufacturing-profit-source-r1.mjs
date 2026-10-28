// Pure, read-only BEA manufacturing profits projection from a previously captured FRED CSV.
// No Census request, PC storage, D1 access, scheduler, market score, or publication.
export const BEA_MFG_PROFIT_SERIES='N400RC1Q027SBEA';
export const BEA_MFG_PROFIT_PAGE=`https://fred.stlouisfed.org/series/${BEA_MFG_PROFIT_SERIES}`;
export const BEA_MFG_PROFIT_CSV=`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${BEA_MFG_PROFIT_SERIES}`;
export const BEA_MFG_PROFIT_SCHEMA='earnings-bea-manufacturing-profits-r1-v1';

const finite=value=>typeof value==='number'&&Number.isFinite(value);
const quarterStart=value=>{
  if(typeof value!=='string'||!/^\d{4}-(01-01|04-01|07-01|10-01)$/.test(value))
    throw Error('BEA_MFG_INVALID_QUARTER');
  const ms=Date.parse(`${value}T00:00:00Z`);
  if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,10)!==value)
    throw Error('BEA_MFG_INVALID_QUARTER');
  const year=Number(value.slice(0,4)),quarter=(Number(value.slice(5,7))-1)/3+1;
  return {ordinal:year*4+quarter-1,period:`${year}-Q${quarter}`,
    end:new Date(Date.UTC(year,quarter*3,0)).toISOString().slice(0,10)};
};

export function parseBeaManufacturingProfitCsv(text){
  if(typeof text!=='string'||text.length<25||text.length>100_000)
    throw Error('BEA_MFG_INVALID_CSV_SIZE');
  const lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/);
  if(lines.shift()!==`observation_date,${BEA_MFG_PROFIT_SERIES}`)
    throw Error('BEA_MFG_INVALID_CSV_HEADER');
  const rows=[];
  for(const line of lines){
    const cells=line.split(',');
    if(cells.length!==2||!/^[-+]?\d+(?:\.\d+)?$/.test(cells[1]))
      throw Error('BEA_MFG_INVALID_VALUE');
    const q=quarterStart(cells[0]),value=Number(cells[1]);
    if(!finite(value))throw Error('BEA_MFG_INVALID_VALUE');
    if(rows.length&&q.ordinal!==rows.at(-1).ordinal+1)
      throw Error('BEA_MFG_NONCONTIGUOUS_QUARTERS');
    rows.push({...q,value});
  }
  if(rows.length<5)throw Error('BEA_MFG_INSUFFICIENT_HISTORY');
  return rows;
}

export function buildBeaManufacturingProfitPreview(csv,{sourceVersion,sourceStoredAt}={}){
  const rows=parseBeaManufacturingProfitCsv(csv);
  if(typeof sourceVersion!=='string'||!/^[a-f0-9]{64}$/.test(sourceVersion)
    ||!Number.isSafeInteger(sourceStoredAt)||sourceStoredAt<=0)
    throw Error('BEA_MFG_INVALID_SOURCE_CHECKPOINT');
  const current=rows.at(-1),yearAgo=rows.at(-5);
  if(Date.parse(`${current.end}T23:59:59Z`)>sourceStoredAt)
    throw Error('BEA_MFG_FUTURE_OBSERVATION');
  // Negative/zero base profits cannot yield an interpretable percentage growth rate.
  if(yearAgo.value<=0)throw Error('BEA_MFG_YOY_BASE_NONPOSITIVE');
  const yoyPercent=(current.value/yearAgo.value-1)*100;
  if(!finite(yoyPercent))throw Error('BEA_MFG_YOY_NOT_FINITE');
  return {
    schemaVersion:BEA_MFG_PROFIT_SCHEMA,status:'READY',
    sourceVersion,sourceStoredAt,sourceRetrievedAt:new Date(sourceStoredAt).toISOString(),
    historicalMode:'CURRENT_VINTAGE_NOT_PIT',
    indicator:{id:'bea_manufacturing_corporate_profits_yoy',
      name:'미국 제조업 기업이익 증가율',source:'BEA NIPA Table 6.16D N400RC',
      seriesId:BEA_MFG_PROFIT_SERIES,sourceURL:BEA_MFG_PROFIT_PAGE,
      transport:'FRED_CSV',frequency:'QUARTERLY',adjustment:'SAAR',
      profitsDefinition:'WITH_INVENTORY_VALUATION_ADJUSTMENT',
      unit:'PERCENT_YOY',value:yoyPercent,
      observationPeriod:current.period,observationPeriodEnd:current.end,
      yearAgoPeriod:yearAgo.period,yearAgoPeriodEnd:yearAgo.end,
      currentProfitsBillionsUsdAnnualRate:current.value,
      yearAgoProfitsBillionsUsdAnnualRate:yearAgo.value,
      officialReleaseDate:null,
      history:rows.slice(-5).map(x=>({period:x.period,periodEnd:x.end,
        profitsBillionsUsdAnnualRate:x.value}))},
  };
}
