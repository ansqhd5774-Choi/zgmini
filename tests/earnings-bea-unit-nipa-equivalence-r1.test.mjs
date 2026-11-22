import test from 'node:test';
import assert from 'node:assert/strict';
import {compareBeaUnitNipaToFred} from '../scripts/pc-writer/EARNINGS_BEA_UNIT_NIPA_EQUIVALENCE_R1.mjs';

const entries=[['2025Q2',0.216],['2025Q3',0.219],['2025Q4',0.222],['2026Q1',0.231],['2026Q2',0.250]];
const fred='observation_date,A463RD3Q052SBEA\n'+entries.map(([q,value])=>{
  const year=Number(q.slice(0,4)),quarter=Number(q.at(-1));
  return `${year}-${String((quarter-1)*3+1).padStart(2,'0')}-01,${value}`;
}).join('\n')+'\n';
const rows=()=>entries.map(([TimePeriod,DataValue])=>({TableName:'T11500',
  SeriesCode:'A463RD',LineNumber:'7',TimePeriod,DataValue:String(DataValue),CL_UNIT:'USD',UNIT_MULT:'0'}));
const api=Data=>({BEAAPI:{Results:{Data}}});
test('offline equivalence: exact BEA NIPA line 7 values and FRED series',()=>{
  const result=compareBeaUnitNipaToFred({beaResponse:api(rows().reverse()),fredCsv:fred});
  assert.deepEqual(result,{status:'MATCH',tableName:'T11500',seriesCode:'A463RD',
    lineNumber:'7',fredSeries:'A463RD3Q052SBEA',unit:'USD',comparedQuarters:5,lastQuarter:'2026Q2'});
});
test('reject different observations and periods, never silently substitute values',()=>{
  const changed=rows();changed.at(-1).DataValue='0.249';
  assert.throws(()=>compareBeaUnitNipaToFred({beaResponse:api(changed),fredCsv:fred}),
    /BEA_UNIT_NIPA_VALUE_MISMATCH/);
  const old=rows();old.at(-1).TimePeriod='2026Q3';
  assert.throws(()=>compareBeaUnitNipaToFred({beaResponse:api(old),fredCsv:fred}),
    /BEA_UNIT_NIPA_PERIOD_MISMATCH|BEA_UNIT_NIPA_NONCONTIGUOUS_QUARTERS/);
});
test('reject unknown multiplier, unit, table and duplicated quarter',()=>{
  for(const [key,value,code] of [
    ['UNIT_MULT','6','UNIT_UNVERIFIED'],['CL_UNIT','Index','UNIT_UNVERIFIED'],
    ['TableName','T10101','TABLE_MISMATCH']]){
    const changed=rows();changed[0][key]=value;
    assert.throws(()=>compareBeaUnitNipaToFred({beaResponse:api(changed),fredCsv:fred}),
      new RegExp('BEA_UNIT_NIPA_'+code));
  }
  assert.throws(()=>compareBeaUnitNipaToFred({beaResponse:api([...rows(),rows()[0]]),fredCsv:fred}),
    /BEA_UNIT_NIPA_DUPLICATE_QUARTER/);
});
test('no matching BEA row is unavailable, not a fabricated source',()=>{
  assert.throws(()=>compareBeaUnitNipaToFred({beaResponse:api(rows().map(r=>({...r,SeriesCode:'OTHER'}))),fredCsv:fred}),
    /BEA_UNIT_NIPA_SERIES_MISSING/);
});
