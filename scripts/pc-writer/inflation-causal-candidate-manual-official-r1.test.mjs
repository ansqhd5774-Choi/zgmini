import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseOfficialBlsHousingFlatfile,parseOfficialCensusInventoryRows,
  parseOfficialCensusInventoryWorkbook,planOfficialManualCandidateDocuments,
  BLS_RENT_ID,BLS_OER_ID,fetchOfficialManualCandidateSources,
  BLS_HOUSING_URL,CENSUS_INVENTORY_URL,
} from './inflation-causal-candidate-manual-official-r1.mjs';

const header='series_id\tyear\tperiod\tvalue\tfootnote_codes';
const dates=['2025-09','2025-10','2025-11','2025-12','2026-01',
  '2026-02','2026-03','2026-04','2026-05','2026-06',
  '2026-07','2026-08','2026-09'];
const values={
  [BLS_RENT_ID]:[438.237,null,439.002,440.189,441.285,441.865,
    442.705,445.118,446.729,447.397,448.542,449.321,450.429],
  [BLS_OER_ID]:[431.134,null,432.524,433.866,434.814,435.784,
    437.024,439.341,440.620,441.685,442.836,443.677,445.195],
};
const rows=Object.entries(values).flatMap(([series,observations])=>
  observations.map((value,index)=>{
    const [year,month]=dates[index].split('-');
    return `${series}\t${year}\tM${month}\t${value??'-'}${value===null?'\tX':''}`;
  }));
const encode=x=>Buffer.from(x,'utf8');

test('explicit one-time static GET uses official URLs and no registered API endpoint',async()=>{
  const requests=[];
  const fakeFetch=async(url,options)=>{
    requests.push({url,options});
    const bytes=url===BLS_HOUSING_URL?encode([header,...rows].join('\n')):
      Buffer.from([0x50,0x4b,0x03,0x04,...Array(28).fill(0)]);
    return new Response(bytes,{status:200});
  };
  const collected=await fetchOfficialManualCandidateSources({fetchImpl:fakeFetch});
  assert.deepEqual(requests.map(x=>x.url),[BLS_HOUSING_URL,CENSUS_INVENTORY_URL]);
  assert.ok(requests.every(x=>x.options.redirect==='manual'));
  assert.equal(collected.supplierApiCalls,0);
  assert.equal(collected.coreCheckpointWrites,0);
  assert.match(collected.sourceHashes.bls,/^[a-f0-9]{64}$/);
  await assert.rejects(()=>fetchOfficialManualCandidateSources({
    fetchImpl:async()=>new Response('',{status:302,headers:{location:'https://example.com'}}),
  }),/INFL_MANUAL_OFFICIAL_DOWNLOAD_REDIRECT_DENIED/);
});

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

test('BLS rejects a short excerpt and mismatched latest observation',()=>{
  const short=rows.filter(x=>x.includes('\tM08\t')||x.includes('\tM09\t'));
  assert.throws(()=>parseOfficialBlsHousingFlatfile(encode([header,...short].join('\n'))),
    /INFL_MANUAL_BLS_RECENT_HISTORY_INCOMPLETE/);
  assert.throws(()=>parseOfficialBlsHousingFlatfile(encode([
    header,...rows.filter(x=>!(x.startsWith(BLS_OER_ID)&&x.includes('2026\tM09'))),
  ].join('\n'))),/INFL_MANUAL_BLS_LATEST_MISMATCH/);
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
  assert.equal(result.documents.bls.provenanceByGroup.cpi.origin,'CLAIMED_BLS_OFFICIAL_STATIC_COPY');
  assert.equal(result.documents.census.provenance[0].origin,'CLAIMED_CENSUS_OFFICIAL_XLSX_COPY');
  assert.equal(result.documents.bls.provenanceByGroup.cpi.provenanceVerified,false);
  assert.equal(result.apiCalls,0);
  assert.equal(result.dbWrites,0);
  assert.equal(result.coreCheckpointWrites,0);
});

test('manual plan rejects unapproved revisions to existing BLS and Census observations',()=>{
  const bls=parseOfficialBlsHousingFlatfile(encode([header,...rows].join('\n')));
  const census={sourceKind:'CENSUS_OFFICIAL_NAICS_HISTORICAL_XLSX',
    sourceSha256:'c'.repeat(64),observations:parseOfficialCensusInventoryRows([
      row(34,'AMTMTI',2025,c2025),row(35,'AMTMTI',2026,c2026),
    ])};
  const previousBls={schemaVersion:1,provider:'BLS',
    sourceVersion:'INFLATION_CAUSAL_CANDIDATE_BLS3_R1',
    sourceStoredAt:'2026-11-07T10:00:00.000Z',
    series:{[BLS_RENT_ID]:[{date:'2026-09-01',value:999.9}]}};
  assert.throws(()=>planOfficialManualCandidateDocuments({bls,census,previousBls}),
    /INFL_MANUAL_HISTORICAL_REVISION_UNAPPROVED/);
  const previousCensus={schemaVersion:1,provider:'US_CENSUS_M3',
    sourceVersion:'INFLATION_CAUSAL_CANDIDATE_CENSUS_M3_R1',
    sourceStoredAt:'2026-11-07T10:00:00.000Z',selector:'MTM\/TI',
    observations:[{date:'2026-09-01',value:999999}]};
  assert.throws(()=>planOfficialManualCandidateDocuments({bls,census,previousCensus}),
    /INFL_MANUAL_HISTORICAL_REVISION_UNAPPROVED/);
});

test('manual plan repairs only invalid existing CPI, preserving valid PPI without historical rewrites',()=>{
  const bls=parseOfficialBlsHousingFlatfile(encode([header,...rows].join('\n')));
  const census={sourceKind:'CENSUS_OFFICIAL_NAICS_HISTORICAL_XLSX',
    sourceSha256:'c'.repeat(64),observations:parseOfficialCensusInventoryRows([
      row(34,'AMTMTI',2025,c2025),row(35,'AMTMTI',2026,c2026),
    ])};
  const ppi=[{date:'2026-09-01',value:220.5,footnotes:[]}];
  const brokenBls={schemaVersion:1,provider:'BLS',
    sourceVersion:'INFLATION_CAUSAL_CANDIDATE_BLS3_R1',
    sourceStoredAt:'2026-11-07T10:00:00.000Z',
    series:{WPSFD4:ppi,
      [BLS_RENT_ID]:[{date:'2026-09-01',value:null}],
      [BLS_OER_ID]:[{date:'2026-08-01',value:440},
        {date:'2026-08-01',value:440}]}};
  const planned=planOfficialManualCandidateDocuments({bls,census,previousBls:brokenBls});
  assert.equal(planned.status,'PREPARED');
  assert.deepEqual(planned.repairedInvalidBlsSeriesIds,[BLS_RENT_ID,BLS_OER_ID]);
  assert.deepEqual(planned.documents.bls.series.WPSFD4,ppi);
  assert.equal(planned.documents.bls.series[BLS_RENT_ID].at(-1).value,450.429);
  assert.equal(planned.documents.bls.series[BLS_OER_ID].at(-1).value,445.195);
  assert.deepEqual(planned.documents.bls.provenanceByGroup.cpi.repairedInvalidBlsSeriesIds,
    [BLS_RENT_ID,BLS_OER_ID]);
  const brokenPpi={...brokenBls,series:{...brokenBls.series,
    WPSFD4:[{date:'2026-09-01',value:null}]}};
  assert.throws(()=>planOfficialManualCandidateDocuments({bls,census,previousBls:brokenPpi}),
    /INFL_MANUAL_PRIOR_BLS_INVALID/);
});

test('manual reimport with identical overlap keeps previous timestamps and historical rows',()=>{
  const bls=parseOfficialBlsHousingFlatfile(encode([header,...rows].join('\n')));
  const census={sourceKind:'CENSUS_OFFICIAL_NAICS_HISTORICAL_XLSX',
    sourceSha256:'c'.repeat(64),observations:parseOfficialCensusInventoryRows([
      row(34,'AMTMTI',2025,c2025),row(35,'AMTMTI',2026,c2026),
    ])};
  const first=planOfficialManualCandidateDocuments({bls,census,
    now:'2026-11-09T10:00:00.000Z'});
  const second=planOfficialManualCandidateDocuments({bls,census,
    previousBls:first.documents.bls,previousCensus:first.documents.census,
    now:'2026-11-09T11:00:00.000Z'});
  assert.equal(second.status,'UNCHANGED');
  assert.deepEqual(second.writes,{bls:false,census:false});
  assert.equal(second.documents.bls.sourceStoredAt,'2026-11-09T10:00:00.000Z');
  assert.equal(second.documents.census.sourceStoredAt,'2026-11-09T10:00:00.000Z');

  const priorRow={date:'2024-01-01',value:400};
  const withHistory={...first.documents.bls,series:{...first.documents.bls.series,
    [BLS_RENT_ID]:[priorRow,...first.documents.bls.series[BLS_RENT_ID]]}};
  const updated=planOfficialManualCandidateDocuments({bls,census,
    previousBls:withHistory,previousCensus:first.documents.census});
  assert.equal(updated.status,'UNCHANGED');
  assert.deepEqual(updated.documents.bls.series[BLS_RENT_ID][0],priorRow);
});
