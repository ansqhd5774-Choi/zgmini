// Offline, read-only transformation of a previously persisted FRED CSV.
// The source is BEA NIPA Table 1.15 / A463RD; this is not a profit margin.
export const UNIT_PROFIT_SERIES = 'A463RD3Q052SBEA';
export const UNIT_PROFIT_PAGE = `https://fred.stlouisfed.org/series/${UNIT_PROFIT_SERIES}`;
export const UNIT_PROFIT_CSV = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${UNIT_PROFIT_SERIES}`;
export const UNIT_PROFIT_SCHEMA = 'earnings-bea-unit-profit-r1-v1';
export const UNIT_PROFIT_HISTORY_MODE = 'CURRENT_VINTAGE_SOURCE_PERIOD_END';

const finite = value => typeof value === 'number' && Number.isFinite(value);
const periodEnd = date => {
  const stamp = new Date(`${date}T00:00:00Z`);
  if(Number.isNaN(stamp.getTime()) || ![0,3,6,9].includes(stamp.getUTCMonth()) ||
    stamp.getUTCDate() !== 1 || stamp.toISOString().slice(0,10) !== date)
    throw Error('BEA_UNIT_INVALID_QUARTER_START');
  const year = stamp.getUTCFullYear(), quarter = Math.floor(stamp.getUTCMonth()/3)+1;
  return {ordinal:year*4+quarter-1, date:new Date(Date.UTC(year,quarter*3,0)).toISOString().slice(0,10)};
};

export function parseBeaUnitProfitCsv(text){
  if(typeof text !== 'string' || text.length > 100_000 || text.length < 20)
    throw Error('BEA_UNIT_INVALID_CSV_SIZE');
  const lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/);
  if(lines.shift() !== `observation_date,${UNIT_PROFIT_SERIES}`)
    throw Error('BEA_UNIT_INVALID_CSV_HEADER');
  const rows=[];
  for(const line of lines){
    const cells=line.split(',');
    if(cells.length !== 2 || !/^-?\d+(?:\.\d+)?$/.test(cells[1]))
      throw Error('BEA_UNIT_INVALID_CSV_VALUE');
    const {ordinal,date}=periodEnd(cells[0]);
    const value=Number(cells[1]);
    if(!finite(value) || rows.length && ordinal !== rows.at(-1).ordinal+1)
      throw Error('BEA_UNIT_NONCONTIGUOUS_QUARTERS');
    rows.push({ordinal,date,value});
  }
  if(rows.length < 5)throw Error('BEA_UNIT_INSUFFICIENT_HISTORY');
  return rows;
}

export function buildBeaUnitProfitSource(csv,{sourceVersion,sourceStoredAt}={}){
  const rows=parseBeaUnitProfitCsv(csv);
  if(typeof sourceVersion!=='string'||!/^[a-f0-9]{64}$/.test(sourceVersion) ||
    !Number.isSafeInteger(sourceStoredAt)||sourceStoredAt<=0)
    throw Error('BEA_UNIT_INVALID_SOURCE_CHECKPOINT');
  const last=rows.at(-1),previous=rows.at(-2);
  if(Date.parse(last.date+'T23:59:59Z')>sourceStoredAt)
    throw Error('BEA_UNIT_FUTURE_OBSERVATION');
  return {
    schemaVersion:UNIT_PROFIT_SCHEMA,status:'READY',sourceVersion,sourceStoredAt,
    retrievedAt:new Date(sourceStoredAt).toISOString(),historyMode:UNIT_PROFIT_HISTORY_MODE,
    indicator:{id:'bea_nonfinancial_unit_profit',source:'BEA NIPA Table 1.15 A463RD',
      seriesId:UNIT_PROFIT_SERIES,sourceURL:UNIT_PROFIT_PAGE,
      transport:'FRED_CSV',unit:'USD_PER_REAL_GVA_UNIT',
      observationPeriodEnd:last.date,previousPeriodEnd:previous.date,
      value:last.value,previousValue:previous.value,change:last.value-previous.value,
      history:rows.slice(-5).map(row=>({date:row.date,value:row.value}))},
  };
}
