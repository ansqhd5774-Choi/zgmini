import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseOfficialBlsHousingFlatfile,parseOfficialCensusInventoryRows,
  parseOfficialCensusInventoryWorkbook,planOfficialManualCandidateDocuments,
  BLS_RENT_ID,BLS_OER_ID,
} from './inflation-causal-candidate-manual-official-r1.mjs';

const header='series_id\tyear\tperiod\tvalue\tfootnote_codes';
const rows=[
  `${BLS_RENT_ID}\t2025\tM09\t438.237`,
  `${BLS_RENT_ID}\t2025\tM10\t-\tX`,
  `${BLS_RENT_ID}\t2026\tM08\t449.321`,
  `${BLS_RENT_ID}\t2026\tM09\t450.429`,
  `${BLS_OER_ID}\t2025\tM09\t431.134`,
  `${BLS_OER_ID}\t2025\tM10\t-\tX`,
  `${BLS_OER_ID}\t2026\tM08\t443.677`,
  `${BLS_OER_ID}\t2026\tM09\t445.195`,
];
const encode=x=>Buffer.from(x,'utf8');

test('BLS official flatfile recognizes both original CPI series, preserving official missing month',()=>{
  const result=parseOfficialBlsHousingFlatfile(encode([header,...rows].join('\n')));
  assert.equal(result.sourceKind,'BLS_OFFICIAL_CU_STATIC_FLATFILE');
  assert.equal(result.series[BLS_RENT_ID].at(-1).value,450.429);
  assert.equal(result.series[BLS_OER_ID].at(-1).value,445.195);
  assert.equal(result.missing.length,2);
  assert.deepEqual(result.missing.map(x=>x.date),['2025-10-01','2025-10-01']);
  assert.match(result.sourceSha256,/^[a-f0-9]{64}$/);
});

test('BLS flatfile stops on duplicate month instead of silently overwriting',()=>{
  assert.throws(()=>parseOfficialBlsHousingFlatfile(encode([header,...rows,rows[0]].join('\n'))),
    /INFL_MANUAL_BLS_DUPLICATE/);
});

test('BLS flatfile never converts a nonofficial missing value to zero',()=>{
  const bad=rows.map(x=>x.replace('\t-\tX','\t-\t'));
  assert.throws(()=>parseOfficialBlsHousingFlatfile(encode([header,...bad].join('\n'))),
    /INFL_MANUAL_BLS_UNEXPLAINED_MISSING/);
});

const row=(rowNum,series,year,values)=>{
  const columns='CDEFGHIJKLMN';
  const cells={
    [`A${rowNum}`]:{value:series},[`B${rowNum}`]:{value:String(year)},
  };
  values.forEach((value,index)=>{cells[`${columns[index]}${rowNum}`]={value};});
  return {rowNum,cells};
};
const c2025=[941981,943013,944064,943249,944036,946202,948226,947640,946694,947012,948592,949081];
const c2026=[949640,950428,956676,959836,962037,963357,967298,972304,976044,'','',''];

test('Census official workbook AMTMTI rows preserve year/month and latest 2026-09 value',async()=>{
  const rows=[row(5,'AOTHER',2026,[100]),row(34,'AMTMTI',2025,c2025),row(35,'AMTMTI',2026,c2026)];
  const observations=parseOfficialCensusInventoryRows(rows);
  assert.equal(observations.length,21);
  assert.deepEqual(observations.at(-1),{
    date:'2026-09-01',value:976044,unit:'USD_MILLION_SA_NOMINAL',
    selector:'MTM/TI',seasonallyAdjusted:true,
  });
  assert.equal(observations.find(x=>x.date==='2025-10-01').value,947012);
  const bytes=Buffer.alloc(32,0);bytes.set([0x50,0x4b,0x03,0x04]);
  const got=await parseOfficialCensusInventoryWorkbook(bytes,{
    readWorkbook:async()=>({sheets:new Map([['m3-outp-invp',rows]])}),
  });
  assert.equal(got.latest,'2026-09-01');
  assert.match(got.sourceSha256,/^[a-f0-9]{64}$/);
  assert.equal(got.observations.length,21);
});

test('Census workbook rejects a duplicate AMTMTI year and an internal missing month',()=>{
  assert.throws(()=>parseOfficialCensusInventoryRows([
    row(34,'AMTMTI',2025,c2025),row(35,'AMTMTI',2025,c2025),
  ]),/INFL_MANUAL_CENSUS_YEAR_INVALID/);
  assert.throws(()=>parseOfficialCensusInventoryRows([
    row(34,'AMTMTI',2025,c2025),row(35,'AMTMTI',2026,[949640,'',950428]),
  ]),/INFL_MANUAL_CENSUS_INTERNAL_GAP/);
});

test('manual plan preserves existing PPI/history and keeps static origin auditable',()=>{
  const bls=parseOfficialBlsHousingFlatfile(encode([header,...rows].join('\n')));
  const census={provider:'US_CENSUS_M3',sourceKind:'CENSUS_OFFICIAL_NAICS_HISTORICAL_XLSX',
    sourceUrl:'https://www.census.gov/manufacturing/m3/prel/historical_data/histshts/naics/naicsinvp.xlsx',
    sourceSha256:'c'.repeat(64),observations:parseOfficialCensusInventoryRows([
      row(34,'AMTMTI',2025,c2025),row(35,'AMTMTI',2026,c2026),
    ])};
  const prevBls={schemaVersion:1,provider:'BLS',
    sourceVersion:'INFLATION_CAUSAL_CANDIDATE_BLS3_R1',
    sourceStoredAt:'2026-11-07T10:00:00.000Z',frequency:'MONTHLY',
    series:{WPSFD4:[{date:'2026-09-01',value:220.5,footnotes:[]}]}};
  const result=planOfficialManualCandidateDocuments({bls,census,previousBls:prevBls,
    now:new Date('2026-11-09T12:00:00.000Z')});
  assert.equal(result.status,'PREPARED');
  assert.deepEqual(result.documents.bls.series.WPSFD4,prevBls.series.WPSFD4);
  assert.equal(result.documents.bls.series[BLS_RENT_ID].at(-1).value,450.429);
  assert.equal(result.documents.census.observations.at(-1).value,976044);
  assert.equal(result.documents.bls.provenanceByGroup.cpi.origin,'BLS_OFFICIAL_STATIC_FILE');
  assert.equal(result.documents.census.provenance[0].origin,'CENSUS_OFFICIAL_HISTORICAL_XLSX');
  assert.equal(result.apiCalls,0);
  assert.equal(result.dbWrites,0);
  assert.equal(result.coreCheckpointWrites,0);
});
