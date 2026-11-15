/**
 * Read-only W01 CPI #22 / #23 actual official BLS static file evidence.
 * This one-shot runs only for this exact PR branch. It cannot write to PC,
 * SQLite, D1, Cloudflare, or a provider quota ledger.
 * The Census official XLSX was separately proven in #1076: never refetch it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const BRANCH='support/w01-bls-housing-cpi-actual-once-20261115';
const LIVE=process.env.CI==='true'&&
 process.env.GITHUB_EVENT_NAME==='pull_request'&&
 process.env.GITHUB_HEAD_REF===BRANCH;
const MAX_BYTES=8_000_000;
const SOURCE_URL='https://download.bls.gov/pub/time.series/cu/cu.data.12.USHousing';
const RENT='CUSR0000SEHA';
const OER='CUSR0000SEHC01';

test('W01 one-time actual BLS rent/OER official static CPI source to safe two-series repair plan',
 {skip:!LIVE&&'Only W01 isolated head may issue the single official BLS static GET',timeout:110_000},
 async t=>{
  const {
   parseOfficialBlsHousingFlatfile,planOfficialManualCandidateDocuments,
   BLS_HOUSING_URL,BLS_RENT_ID,BLS_OER_ID,
  }=await import('../scripts/pc-writer/inflation-causal-candidate-manual-official-r1.mjs');
  assert.equal(BLS_HOUSING_URL,SOURCE_URL);
  assert.equal(BLS_RENT_ID,RENT);
  assert.equal(BLS_OER_ID,OER);
  const response=await fetch(SOURCE_URL,{
   method:'GET',redirect:'manual',signal:AbortSignal.timeout(50_000),
   headers:{accept:'text/plain,application/octet-stream,*/*',
    'user-agent':'ZGMINI-W01-SourceOnly/1.0'},
  });
  assert.equal(response.status,200,'W01_BLS_STATIC_HTTP_'+response.status);
  assert.equal(response.url,SOURCE_URL,'W01_BLS_REDIRECT_OR_ENDPOINT_DRIFT');
  assert.equal(response.redirected,false,'W01_BLS_UNAPPROVED_REDIRECT');
  assert.ok(response.body?.getReader,'W01_BLS_RESPONSE_BODY_UNAVAILABLE');
  const announced=Number(response.headers.get('content-length'));
  assert.ok(!Number.isFinite(announced)||announced===0||announced<=MAX_BYTES,
   'W01_BLS_DECLARED_BYTES_TOO_LARGE');
  const reader=response.body.getReader();
  let length=0;
  const parts=[];
  while(true){
   const {done,value}=await reader.read();
   if(done)break;
   length+=value.byteLength;
   if(length>MAX_BYTES){await reader.cancel();throw Error('W01_BLS_SOURCE_TOO_LARGE');}
   parts.push(Buffer.from(value));
  }
  assert.ok(length>1000,'W01_BLS_SOURCE_EMPTY');
  const source=Buffer.concat(parts);
  const sourceSha256=createHash('sha256').update(source).digest('hex');
  // Crucial: invoke the actual W01 production source parser on real bytes.
  const parsed=parseOfficialBlsHousingFlatfile(source);
  assert.equal(parsed.sourceSha256,sourceSha256);
  assert.equal(parsed.sourceUrl,SOURCE_URL);
  assert.equal(parsed.sourceKind,'BLS_OFFICIAL_CU_STATIC_FLATFILE');
  const rent=parsed.series[RENT],oer=parsed.series[OER];
  assert.ok(Array.isArray(rent)&&rent.length>120,'W01_RENT_LONG_HISTORY_UNAVAILABLE');
  assert.ok(Array.isArray(oer)&&oer.length>120,'W01_OER_LONG_HISTORY_UNAVAILABLE');
  for(const series of [rent,oer]){
   assert.ok(series.every((row,i)=>
    /^\d{4}-(0[1-9]|1[0-2])-01$/.test(row.date)&&
    Number.isFinite(row.value)&&row.value>0&&
    (i===0||series[i-1].date<row.date)),
    'W01_BLS_INVALID_OR_DUPLICATE_MONTH');
  }
  const latestRent=parsed.latestBySeries[RENT];
  const latestOer=parsed.latestBySeries[OER];
  assert.equal(latestRent,latestOer,'W01_BLS_SERIES_LATEST_MISMATCH');
  assert.ok(latestRent>='2026-09-01','W01_BLS_STATIC_DATA_STALE');
  assert.ok(parsed.missing.every(row=>
   [RENT,OER].includes(row.seriesID)&&
   !parsed.series[row.seriesID].some(item=>item.date===row.date)&&
   row.footnote==='X'),'W01_BLS_MISSING_MONTH_FABRICATED');

  // A completely synthetic old PC document models the two INVALID CPI
  // arrays and one unrelated, already valid PPI row. It is NOT a PC readback.
  const ppi=[{date:'2026-09-01',value:220.5,footnotes:[]}];
  const old={schemaVersion:1,provider:'BLS',
   sourceVersion:'INFLATION_CAUSAL_CANDIDATE_BLS3_R1',
   sourceStoredAt:'2026-11-07T22:40:02.928Z',
   series:{WPSFD4:ppi,[RENT]:[],[OER]:[]}};
  // Census is synthetic here only to satisfy the immutable planner contract.
  // The real Census XLSX was already proven by #1076 and is not fetched.
  const census={sourceKind:'CENSUS_OFFICIAL_NAICS_HISTORICAL_XLSX',
   sourceSha256:'c'.repeat(64),
   observations:[{date:'2026-09-01',value:1}]};
  const plan=planOfficialManualCandidateDocuments({
   bls:parsed,census,previousBls:old,
   now:'2026-11-15T00:00:00.000Z',
  });
  assert.equal(plan.status,'PREPARED');
  assert.deepEqual(plan.repairedInvalidBlsSeriesIds,[RENT,OER]);
  assert.deepEqual(plan.documents.bls.series.WPSFD4,ppi,
   'W01_EXISTING_VALID_PPI_MUST_REMAIN_UNTOUCHED');
  assert.deepEqual(plan.documents.bls.series[RENT],rent);
  assert.deepEqual(plan.documents.bls.series[OER],oer);
  assert.equal(plan.documents.bls.provenanceByGroup.cpi.provenanceVerified,false);
  assert.equal(plan.apiCalls,0);
  assert.equal(plan.dbWrites,0);
  assert.equal(plan.d1Writes,0);
  assert.equal(plan.coreCheckpointWrites,0);
  t.diagnostic(
   'W01_BLS_OFFICIAL_CPI_SOURCE_READY bytes='+length+
   ' sha256='+sourceSha256+' rentMonths='+rent.length+
   ' oerMonths='+oer.length+' latestRent='+latestRent+
   ' latestOer='+latestOer+' officialMissing='+parsed.missing.length+
   ' candidateRepairIds='+plan.repairedInvalidBlsSeriesIds.join(',')+
   ' preservedPPI=true operationalWrites=0');
});
