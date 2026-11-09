import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  prepareOfficialManualStore,applyOfficialManualStore,
} from './inflation-causal-candidate-manual-official-store-r1.mjs';

const d=['2025-09','2025-10','2025-11','2025-12','2026-01','2026-02','2026-03',
  '2026-04','2026-05','2026-06','2026-07','2026-08','2026-09'];
const fixture={
  CUSR0000SEHA:[438.237,null,439.002,440.189,441.285,441.865,442.705,
    445.118,446.729,447.397,448.542,449.321,450.429],
  CUSR0000SEHC01:[431.134,null,432.524,433.866,434.814,435.784,437.024,
    439.341,440.620,441.685,442.836,443.677,445.195],
};
const blsBytes=Buffer.from(['series_id year period value footnote_codes',
  ...Object.entries(fixture).flatMap(([id,values])=>values.map((value,i)=>{
    const [year,month]=d[i].split('-');
    return `${id} ${year} M${month} ${value??'-'}${value===null?' X':''}`;
  })),
].join('\n'));
const xlsxBytes=Buffer.from([0x50,0x4b,0x03,0x04,...Array(28).fill(0)]);
const monthCols='CDEFGHIJKLMN';
function xlsxRow(number,year,values){
  const cells={[`A${number}`]:{value:'AMTMTI'},[`B${number}`]:{value:year}};
  values.forEach((v,i)=>{cells[`${monthCols[i]}${number}`]={value:v};});
  return {rowNum:number,cells};
}
const readWorkbook=async()=>({sheets:new Map([['m3-outp-invp',[
  xlsxRow(34,2025,[941981,943013,944064,943249,944036,946202,948226,947640,946694,947012,948592,949081]),
  xlsxRow(35,2026,[949640,950428,956676,959836,962037,963357,967298,972304,976044,'','','']),
]]])});
const now=new Date('2026-11-09T12:00:00.000Z');
const approved=async(_meta,action)=>action({scope:'APPROVED_WRITER_B',requestId:'test-only-lease'});
const options=base=>({base,blsBytes,censusBytes:xlsxBytes,now,readWorkbook});
function scratch(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'infl-manual-test-'));
  const base=path.join(root,'pc-writer');fs.mkdirSync(base);
  return {root,base};
}

test('manual prepare never creates source files or archives',async t=>{
  const {root,base}=scratch();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const plan=await prepareOfficialManualStore(options(base));
  assert.equal(plan.status,'PREPARED');
  assert.equal(plan.plan.apiCalls,0);
  assert.equal(plan.plan.dbWrites,0);
  assert.equal(fs.existsSync(path.join(base,'inflation-causal-candidates-r1')),false);
});

test('storage refuses absent or counterfeit Writer-B lease before any mutation',async t=>{
  const {root,base}=scratch();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  await assert.rejects(()=>applyOfficialManualStore(options(base)),
    /INFL_MANUAL_STORE_WRITER_B_LEASE_REQUIRED/);
  await assert.rejects(()=>applyOfficialManualStore({
    ...options(base),withApprovedWriterB:async(_meta,action)=>action({scope:'READ_ONLY',requestId:'x'}),
  }),/INFL_MANUAL_STORE_WRITER_B_LEASE_INVALID/);
  assert.equal(fs.existsSync(path.join(base,'inflation-causal-candidates-r1')),false);
});

test('approved storage fails closed when the existing PPI candidate is missing',async t=>{
  const {root,base}=scratch();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  await assert.rejects(()=>applyOfficialManualStore({...options(base),withApprovedWriterB:approved}),
    /INFL_MANUAL_STORE_PPI_PREIMAGE_REQUIRED/);
  assert.equal(fs.existsSync(path.join(base,'inflation-causal-candidates-r1')),false);
});

test('approved maintenance staging preserves old PPI, archives exact bytes, reads back and is idempotent',async t=>{
  const {root,base}=scratch();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const target=path.join(base,'inflation-causal-candidates-r1');fs.mkdirSync(target);
  const blsPath=path.join(target,'bls-cpi-ppi3.json');
  fs.writeFileSync(blsPath,JSON.stringify({schemaVersion:1,provider:'BLS',
    sourceVersion:'INFLATION_CAUSAL_CANDIDATE_BLS3_R1',
    sourceStoredAt:'2026-11-07T10:00:00.000Z',frequency:'MONTHLY',
    series:{WPSFD4:[{date:'2026-09-01',value:220.5,footnotes:[]}]}}));
  const result=await applyOfficialManualStore({...options(base),withApprovedWriterB:approved});
  assert.equal(result.status,'SAVED_READBACK');
  assert.equal(result.stored,true);
  assert.equal(result.apiCalls,0);
  assert.equal(result.coreCheckpointWrites,0);
  const bls=JSON.parse(fs.readFileSync(blsPath,'utf8'));
  assert.equal(bls.series.WPSFD4[0].value,220.5);
  assert.equal(bls.series.CUSR0000SEHA.at(-1).value,450.429);
  assert.equal(bls.provenanceByGroup.cpi.provenanceVerified,false);
  const census=JSON.parse(fs.readFileSync(path.join(target,'census-m3-manufacturing-inventories.json'),'utf8'));
  assert.equal(census.observations.at(-1).value,976044);
  assert.ok(fs.existsSync(result.archives.bls.file));
  assert.ok(fs.existsSync(result.archives.census.file));
  assert.ok(fs.existsSync(result.writes.bls.backup));
  const before=fs.readFileSync(blsPath,'utf8');
  const again=await applyOfficialManualStore({...options(base),withApprovedWriterB:approved});
  assert.equal(again.status,'UNCHANGED');
  assert.equal(fs.readFileSync(blsPath,'utf8'),before);
});

test('corrupt prior Census provenance is rejected and not replaced',async t=>{
  const {root,base}=scratch();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const target=path.join(base,'inflation-causal-candidates-r1');fs.mkdirSync(target);
  const censusPath=path.join(target,'census-m3-manufacturing-inventories.json');
  const before=JSON.stringify({schemaVersion:1,provider:'US_CENSUS_M3',
    sourceVersion:'INFLATION_CAUSAL_CANDIDATE_CENSUS_M3_R1',
    sourceStoredAt:'2026-11-07T10:00:00.000Z',selector:'MTM/TI',
    observations:[{date:'2026-08-01',value:972304}],provenance:{bad:'shape'}});
  fs.writeFileSync(censusPath,before);
  await assert.rejects(()=>applyOfficialManualStore({...options(base),withApprovedWriterB:approved}),
    /INFL_MANUAL_PRIOR_CENSUS_INVALID/);
  assert.equal(fs.readFileSync(censusPath,'utf8'),before);
});
