// W01 official-input qualification ONLY: no PC, SQLite, D1 or public publishing.
// This one-shot CI proof deliberately fetches the *real* government workbook
// and the public FRED mirror, rather than a hand-built workbook fixture.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {
  CENSUS_INVENTORY_URL, parseOfficialCensusInventoryWorkbook,
} from '../pc-writer/inflation-causal-candidate-manual-official-r1.mjs';

const EXPECTED_SHA='8ec724a4c0bc3781b6dbc2617d2bfacead8d931b4d37e92bca0d06a7fbabaf06';
const EXPECTED_SIZE=974_835;
const FIRST='2025-01-01',LAST='2026-09-01';
const FRED_URL='https://fred.stlouisfed.org/graph/fredgraph.csv?id=AMTMTI';
const KNOWN=[
  941981,943013,944064,943249,944036,946202,948226,947640,946694,
  947012,948592,949081,949640,950428,956676,959836,962037,963357,
  967298,972304,976044,
];
const sha256=b=>createHash('sha256').update(b).digest('hex');
const fail=code=>{throw Error(code);};
function monthDays(){
 const dates=[];
 for(let year=2025;year<=2026;year++)for(let month=1;month<=12;month++){
  const d=year+'-'+String(month).padStart(2,'0')+'-01';
  if(d>LAST)break;
  dates.push(d);
 }
 return dates;
}
const DATES=monthDays();
assert.equal(DATES.length,21);

async function load(url,limit){
 let location=new URL(url);
 for(let n=0;n<3;n++){
  if(location.protocol!=='https:'||
    !['www.census.gov','fred.stlouisfed.org'].includes(location.hostname))
   fail('W01_OFFICIAL_HOST_DENIED');
  const res=await fetch(location,{redirect:'manual',signal:AbortSignal.timeout(35_000),
    headers:{'user-agent':'ZGMINI-source-validation-readonly/1.0'}});
  if([301,302,303,307,308].includes(res.status)){
   const next=res.headers.get('location');
   if(!next)fail('W01_OFFICIAL_REDIRECT_MISSING');
   location=new URL(next,location);continue;
  }
  if(!res.ok)fail('W01_OFFICIAL_HTTP_'+res.status);
  if(Number(res.headers.get('content-length'))>limit)fail('W01_OFFICIAL_BODY_TOO_LARGE');
  const reader=res.body?.getReader();
  if(!reader)fail('W01_OFFICIAL_BODY_NOT_STREAMED');
  const chunks=[];let total=0;
  while(true){
   const {done,value}=await reader.read();if(done)break;
   total+=value.byteLength;
   if(total>limit){await reader.cancel();fail('W01_OFFICIAL_BODY_TOO_LARGE');}
   chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
 }
 fail('W01_OFFICIAL_REDIRECT_CAP');
}

const workbook=await load(CENSUS_INVENTORY_URL,6_000_000);
const originalHash=sha256(workbook);
assert.equal(workbook.length,EXPECTED_SIZE,
 'Official workbook bytes have changed: revalidate source, never silently reuse a new vintage');
assert.equal(originalHash,EXPECTED_SHA,
 'Official workbook SHA differs from 2026-11-18 independently inspected XLSX');
const parsed=await parseOfficialCensusInventoryWorkbook(workbook);
assert.equal(parsed.provider,'US_CENSUS_M3');
assert.equal(parsed.sourceKind,'CENSUS_OFFICIAL_NAICS_HISTORICAL_XLSX');
assert.equal(parsed.selector,'MTM/TI');
assert.equal(parsed.unit,'USD_MILLION_SA_NOMINAL');
assert.equal(parsed.sourceSha256,EXPECTED_SHA);
assert.equal(parsed.latest,LAST);
const rows=new Map(parsed.observations.map(x=>[x.date,x]));
assert.equal(rows.size,parsed.observations.length);
for(let i=0;i<DATES.length;i++){
 const row=rows.get(DATES[i]);
 assert.ok(row,'Official XLSX missing '+DATES[i]);
 assert.equal(row.value,KNOWN[i],'Official XLSX changed value '+DATES[i]);
 assert.equal(row.unit,'USD_MILLION_SA_NOMINAL');
 assert.equal(row.selector,'MTM/TI');
 assert.equal(row.seasonallyAdjusted,true);
}
for(const month of ['2026-10-01','2026-11-01','2026-12-01'])
 assert.equal(rows.has(month),false,'Future/empty official month must not become zero');

const text=await load(FRED_URL,4_000_000);
const csv=text.toString('utf8');
const lines=csv.replace(/^\uFEFF/,'').trim().split(/\r?\n/);
assert.equal(lines[0].trim(),'observation_date,AMTMTI');
const fred=new Map();
for(const line of lines.slice(1)){
 const pair=line.split(',');
 if(pair.length!==2)fail('W01_FRED_CSV_SHAPE');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(pair[0]))fail('W01_FRED_CSV_DATE');
 const n=Number(pair[1]);
 if(pair[1]==='.'||pair[1]==='')continue;
 if(!Number.isFinite(n))fail('W01_FRED_CSV_VALUE');
 if(fred.has(pair[0]))fail('W01_FRED_CSV_DUPLICATE');
 fred.set(pair[0],n);
}
let compared=0;
for(let i=0;i<DATES.length;i++){
 const date=DATES[i],other=fred.get(date);
 assert.ok(Number.isFinite(other),'FRED overlapping month missing '+date);
 assert.equal(other,KNOWN[i],'FRED source changed for '+date);
 assert.equal(rows.get(date).value,other,'Cross-source mismatch for '+date);
 compared++;
}
assert.equal(compared,21);
console.log('W01_CENSUS_REAL_XLSX_AND_FRED_PARITY_PASS '+JSON.stringify({
 sourceKind:parsed.sourceKind,sha256:originalHash,bytes:workbook.length,
 latest:parsed.latest,overlap:compared,mismatches:0,
 emptyMonths:['2026-10','2026-11','2026-12'],
 providerCalls:2,pcWrites:0,sqliteWrites:0,d1Writes:0,
 publication:false,installedPcCollectorVerified:false,
}));
