// Source-only comparison: never calls BEA/FRED, writes a source archive or publishes D1.
// BEA NIPA Table 1.15, line 7 / A463RD-Q versus FRED A463RD3Q052SBEA.
import {parseBeaUnitProfitCsv} from '../../lib/market-score/earnings-bea-unit-profit-source-r1.mjs';

const SERIES='A463RD';
const QUARTER=/^(\d{4})Q([1-4])$/;
const NUMBER=/^-?\d+(?:\.\d+)?$/;
const quarterOrdinal=(year,q)=>year*4+q-1;

export function compareBeaUnitNipaToFred({beaResponse,fredCsv}={}){
  const bea=beaResponse?.BEAAPI?.Results?.Data;
  if(!Array.isArray(bea)||bea.length===0)throw Error('BEA_UNIT_NIPA_DATA_MISSING');
  const sourceRows=bea.filter(row=>String(row?.SeriesCode??'')===SERIES&&
    String(row?.LineNumber??'')==='7');
  if(sourceRows.length<5)throw Error('BEA_UNIT_NIPA_SERIES_MISSING');
  const points=sourceRows.map(row=>{
    if(row.TableName!=='T11500')
      throw Error('BEA_UNIT_NIPA_TABLE_MISMATCH');
    // No implicit multiplier or currency conversion is permitted.
    if(String(row.UNIT_MULT??'').trim()!=='0'||!['usd','dollars'].includes(String(row.CL_UNIT??'').trim().toLowerCase()))
      throw Error('BEA_UNIT_NIPA_UNIT_UNVERIFIED');
    const match=QUARTER.exec(String(row.TimePeriod??''));
    if(!match)throw Error('BEA_UNIT_NIPA_QUARTER_INVALID');
    const str=String(row.DataValue??'').replaceAll(',','');
    if(!NUMBER.test(str))throw Error('BEA_UNIT_NIPA_VALUE_INVALID');
    const year=Number(match[1]),q=Number(match[2]),value=Number(str);
    if(!Number.isFinite(value))throw Error('BEA_UNIT_NIPA_VALUE_INVALID');
    return {ordinal:quarterOrdinal(year,q),value,quarter:row.TimePeriod};
  }).sort((a,b)=>a.ordinal-b.ordinal);
  for(let i=1;i<points.length;i++){
    if(points[i].ordinal===points[i-1].ordinal)throw Error('BEA_UNIT_NIPA_DUPLICATE_QUARTER');
  }
  const recent=points.slice(-5);
  if(recent.some((point,i)=>i>0&&point.ordinal!==recent[i-1].ordinal+1))
    throw Error('BEA_UNIT_NIPA_NONCONTIGUOUS_QUARTERS');
  const fred=parseBeaUnitProfitCsv(fredCsv).slice(-5);
  for(let i=0;i<5;i++){
    if(recent[i].ordinal!==fred[i].ordinal)
      throw Error('BEA_UNIT_NIPA_PERIOD_MISMATCH');
    if(Math.abs(recent[i].value-fred[i].value)>0.000000001)
      throw Error('BEA_UNIT_NIPA_VALUE_MISMATCH');
  }
  return Object.freeze({status:'MATCH',tableName:'T11500',seriesCode:SERIES,
    lineNumber:'7',fredSeries:'A463RD3Q052SBEA',unit:'USD',
    comparedQuarters:5,lastQuarter:recent.at(-1).quarter});
}
