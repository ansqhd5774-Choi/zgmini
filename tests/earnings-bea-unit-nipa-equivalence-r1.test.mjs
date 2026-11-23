import test from 'node:test';
import assert from 'node:assert/strict';
import {compareBeaUnitNipaToFred,beaUnitNipaRequestSpec,inspectBeaUnitNipaRawJson} from '../scripts/pc-writer/EARNINGS_BEA_UNIT_NIPA_EQUIVALENCE_R1.mjs';
import {createHash} from 'node:crypto';

const entries=[['2025Q2',0.216],['2025Q3',0.219],['2025Q4',0.222],['2026Q1',0.231],['2026Q2',0.250]];
const fred='observation_date,A463RD3Q052SBEA\n'+entries.map(([q,value])=>{
  const year=Number(q.slice(0,4)),quarter=Number(q.at(-1));
  return `${year}-${String((quarter-1)*3+1).padStart(2,'0')}-01,${value}`;
}).join('\n')+'\n';
const rows=()=>entries.map(([TimePeriod,DataValue])=>({TableName:'T11500',
  SeriesCode:'A463RD',LineNumber:'7',TimePeriod,DataValue:String(DataValue),CL_UNIT:'USD',UNIT_MULT:'0'}));
const api=Data=>({BEAAPI:{Results:{Data}}});
test('BEA NIPA fixed request spec is bounded, pure and credential-free',()=>{
  const spec=beaUnitNipaRequestSpec({observationYear:2026});
  assert.deepEqual(spec,{method:'GetData',datasetname:'NIPA',TableName:'T11500',
    Frequency:'Q',Year:'2025,2026',ResultFormat:'JSON'});
  assert.equal(Object.isFrozen(spec),true);
  assert.equal('UserID' in spec,false);
  for(const year of [null,undefined,2000,2101,2026.5,'2026']){
    assert.throws(()=>beaUnitNipaRequestSpec({observationYear:year}),
      /BEA_UNIT_NIPA_YEAR_INVALID/);
  }
});
test('offline equivalence: exact BEA NIPA line 7 values and FRED series',()=>{
  const result=compareBeaUnitNipaToFred({beaResponse:api(rows().reverse()),fredCsv:fred});
  assert.deepEqual(result,{status:'MATCH',tableName:'T11500',seriesCode:'A463RD',
    lineNumber:'7',fredSeries:'A463RD3Q052SBEA',unit:'USD',comparedQuarters:5,lastQuarter:'2026Q2'});
});
test('accept official lowercase dollars and whitespace, without allowing nonzero multiplier',()=>{
  const withOfficialUnits=rows().map(row=>({...row,CL_UNIT:' dollars ',UNIT_MULT:' 0 '}));
  assert.equal(compareBeaUnitNipaToFred({beaResponse:api(withOfficialUnits),fredCsv:fred}).status,'MATCH');
  withOfficialUnits[0].UNIT_MULT='3';
  assert.throws(()=>compareBeaUnitNipaToFred({beaResponse:api(withOfficialUnits),fredCsv:fred}),
    /BEA_UNIT_NIPA_UNIT_UNVERIFIED/);
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
test('reject absent table identity, even when series and line number match',()=>{
  const withoutTable=rows().map(({TableName,...rest})=>rest);
  assert.throws(()=>compareBeaUnitNipaToFred({beaResponse:api(withoutTable),fredCsv:fred}),
    /BEA_UNIT_NIPA_TABLE_MISMATCH/);
});
test('no matching BEA row is unavailable, not a fabricated source',()=>{
  assert.throws(()=>compareBeaUnitNipaToFred({beaResponse:api(rows().map(r=>({...r,SeriesCode:'OTHER'}))),fredCsv:fred}),
    /BEA_UNIT_NIPA_SERIES_MISSING/);
});

test('reject malformed BEA numeric grouping before comparison',()=>{
  for(const malformed of ['1,2','12,34','1,234,56','1234,567','0,250']){
    const changed=rows();
    changed[0].DataValue=malformed;
    assert.throws(()=>compareBeaUnitNipaToFred({
      beaResponse:api(changed),fredCsv:fred}),/BEA_UNIT_NIPA_VALUE_INVALID/);
  }
  const grouped=rows();
  grouped[0].DataValue='1,234.50';
  const alternateFred=fred.replace('2025-04-01,0.216','2025-04-01,1234.5');
  assert.equal(compareBeaUnitNipaToFred({
    beaResponse:api(grouped),fredCsv:alternateFred}).status,'MATCH');
});

test('official BEA raw JSON receives its own exact-byte provenance, never a FRED alias',()=>{
  const raw=Buffer.from(JSON.stringify(api(rows().reverse())),'utf8');
  const at=Date.parse('2026-11-23T00:00:00Z');
  const inspected=inspectBeaUnitNipaRawJson({rawBytes:raw,sourceStoredAt:at});
  assert.equal(inspected.status,'SOURCE_ONLY_VALIDATED');
  assert.equal(inspected.transport,'BEA_API_JSON');
  assert.equal(inspected.dataset,'NIPA');
  assert.equal(inspected.tableName,'T11500');
  assert.equal(inspected.seriesCode,'A463RD');
  assert.equal(inspected.lineNumber,'7');
  assert.equal(inspected.sourceVersion,createHash('sha256').update(raw).digest('hex'));
  assert.equal(inspected.observedThrough,'2026-06-30');
  assert.deepEqual(inspected.recent.map(x=>x.value),entries.map(x=>x[1]));
  assert.equal(Object.isFrozen(inspected),true);
  assert.equal(Object.isFrozen(inspected.recent),true);
  assert.equal('indicator' in inspected,false); // Never advertise publishable FRED transport.
  assert.equal('sourceUrl' in inspected,false);
});

test('BEA source preflight rejects malformed raw bytes, oversized body and future period',()=>{
  const at=Date.parse('2026-11-23T00:00:00Z');
  for(const rawBytes of [Buffer.alloc(2_000_001),Buffer.from([0xff,0xff,...Buffer.alloc(30)]),
    Buffer.from('{not json}','utf8'),Buffer.from(fred,'utf8')]){
    assert.throws(()=>inspectBeaUnitNipaRawJson({rawBytes,sourceStoredAt:at}),
      /BEA_UNIT_NIPA_RAW_(?:SIZE|JSON)_INVALID/);
  }
  assert.throws(()=>inspectBeaUnitNipaRawJson({
    rawBytes:Buffer.from(JSON.stringify(api(rows()))),
    sourceStoredAt:Date.parse('2026-01-01T00:00:00Z')
  }),/BEA_UNIT_NIPA_FUTURE_OBSERVATION/);
  assert.throws(()=>inspectBeaUnitNipaRawJson({
    rawBytes:Buffer.from(JSON.stringify(api(rows()))),sourceStoredAt:0
  }),/BEA_UNIT_NIPA_SOURCE_TIME_INVALID/);
  const bad=rows();bad[0].UNIT_MULT='3';
  assert.throws(()=>inspectBeaUnitNipaRawJson({
    rawBytes:Buffer.from(JSON.stringify(api(bad))),sourceStoredAt:at
  }),/BEA_UNIT_NIPA_UNIT_UNVERIFIED/);
});
