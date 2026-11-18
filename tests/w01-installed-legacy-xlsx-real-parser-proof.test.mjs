// ONE-SHOT W01 SOURCE COMPATIBILITY DIAGNOSIS — not installed on the PC.
// Replays the immutable, pre-fix historical source bytes and the current
// production XLSX parser against the same official Census workbook.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parseOfficialCensusInventoryWorkbook,CENSUS_INVENTORY_URL}
 from '../scripts/pc-writer/inflation-causal-candidate-manual-official-r1.mjs';

const BRANCH='codex/w01-installed-legacy-xlsx-real-parser-proof-20261118';
const LIVE=process.env.CI==='true'
 &&process.env.GITHUB_EVENT_NAME==='pull_request'
 &&process.env.GITHUB_HEAD_REF===BRANCH;
const OLD_REF='643b7c7c4372ffad552443fc312c6cb1b944e2fc';
const OLD_RAW='https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/'
 +OLD_REF+'/lib/diagnostic-layer/xlsx-lite.mjs';
const INSTALLED_LEGACY_SHA='44d4c230a0620faea0d8bb2575e6f13c9ab7cfb5700aa11d752017db747f619a';
const OFFICIAL_SHA='8ec724a4c0bc3781b6dbc2617d2bfacead8d931b4d37e92bca0d06a7fbabaf06';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

async function readBounded(url,max){
 const host=new URL(url).hostname;
 assert.ok(['www.census.gov','raw.githubusercontent.com'].includes(host));
 const res=await fetch(url,{method:'GET',redirect:'manual',
  signal:AbortSignal.timeout(40_000)});
 assert.equal(res.status,200,'W01_SOURCE_HTTP_'+host+'_'+res.status);
 assert.equal(res.redirected,false,'W01_UNAPPROVED_REDIRECT');
 const stream=res.body?.getReader();assert.ok(stream,'W01_NO_BODY');
 let length=0;const chunks=[];
 while(true){
  const {done,value}=await stream.read();if(done)break;
  length+=value.byteLength;
  if(length>max){await stream.cancel();throw Error('W01_SOURCE_TOO_LARGE');}
  chunks.push(Buffer.from(value));
 }
 return Buffer.concat(chunks);
}

test('W01 approved legacy xlsx-lite exact source bytes versus real Census AMTMTI',
 {skip:!LIVE&&'Only this one-shot W01 diagnosis branch may fetch official bytes',
  timeout:110_000},async t=>{
 const legacyBytes=await readBounded(OLD_RAW,25_000);
 const lf=legacyBytes.toString('utf8').replace(/\r\n/g,'\n');
 const oldHash=hash(legacyBytes);
 const crlfHash=hash(Buffer.from(lf.replace(/\n/g,'\r\n')));
 // Must match *actual PC manifest*, not infer that an arbitrary historical
 // GitHub file is the installed source.
 assert.ok([oldHash,crlfHash].includes(INSTALLED_LEGACY_SHA),
  'W01_APPROVED_PC_LEGACY_SHA_MISMATCH githubRaw='+oldHash+
  ' githubCrlf='+crlfHash+' approved='+INSTALLED_LEGACY_SHA);
 const historical=await import('data:text/javascript;base64,'+
  Buffer.from(lf).toString('base64'));
 assert.equal(typeof historical.readXlsxWorkbook,'function');

 const official=await readBounded(CENSUS_INVENTORY_URL,6_000_000);
 assert.equal(official.length,974835,'W01_OFFICIAL_SOURCE_BYTES_CHANGED');
 assert.equal(hash(official),OFFICIAL_SHA,
  'W01_OFFICIAL_SOURCE_REVISION_NEEDS_REVALIDATION');

 const modern=await parseOfficialCensusInventoryWorkbook(official);
 assert.equal(modern.latest,'2026-09-01');
 assert.equal(modern.observations.length,417);
 assert.equal(modern.observations.at(-1).value,976044);

 let legacyResult='PASS',errorCode=null,legacyRows=null;
 try{
  const old=await parseOfficialCensusInventoryWorkbook(official,{
   readWorkbook:historical.readXlsxWorkbook,
  });
  legacyRows=old.observations.length;
  assert.equal(old.latest,modern.latest);
  assert.equal(legacyRows,modern.observations.length);
  assert.deepEqual(old.observations,modern.observations);
 }catch(error){
  legacyResult='FAIL';errorCode=String(error?.status??error?.code??error?.message??'UNKNOWN')
   .slice(0,100);
 }
 const result={verdict:legacyResult==='PASS'?'LEGACY_APPROVED_SOURCE_REAL_XLSX_PASS':
  'LEGACY_APPROVED_SOURCE_REAL_XLSX_FAIL',
  originalApprovedSourceSha256:INSTALLED_LEGACY_SHA,
  githubOldSha256:oldHash,githubOldCrlfSha256:crlfHash,
  officialSha256:OFFICIAL_SHA,officialSize:official.length,
  modernRows:modern.observations.length,legacyRows,legacyErrorCode:errorCode,
  providerCalls:2,pcWrites:0,sqliteWrites:0,d1Writes:0,
  installedPcRuntimeExecuted:false};
 console.log('W01_LEGACY_SOURCE_EXACT_SHA_REAL_CENSUS_DIAGNOSTIC '+JSON.stringify(result));
 t.diagnostic('Do not install/replace approved PC source based on CI alone');
});
