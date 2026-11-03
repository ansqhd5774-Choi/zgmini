import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {collectSceOneYear,parseSceOfficialWorkbook,SCE_OFFICIAL_FILE} from '../scripts/inflation-sce-collector.mjs';

const workbook=()=>{
  const rows=[{rowNum:4,cells:{A4:{value:'YYYYMM'},B4:{value:'Median one-year ahead expected inflation rate'}}}];
  for(let i=0;i<30;i++){
    const y=2024+Math.floor(i/12),m=i%12+1,serial=String(y)+String(m).padStart(2,'0'),rowNum=i+5;
    rows.push({rowNum,cells:{[`A${rowNum}`]:{value:serial},[`B${rowNum}`]:{value:String(i/10)}}});
  }
  return {sheets:new Map([['Inflation expectations',rows]])};
};
const file=Buffer.concat([Buffer.from('504b0304','hex'),Buffer.alloc(100,1)]);
const fakeFetch=async(url,opts)=>{
  assert.equal(url,SCE_OFFICIAL_FILE);
  assert.equal(opts.redirect,'manual');
  return new Response(file,{status:200,headers:{'content-type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}});
};

test('SCE saves immutable raw, parsed data and a read-back checkpoint',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'zgmini-sce-collector-'));
  try{
    const result=await collectSceOneYear({directory:root,fetcher:fakeFetch,
      readWorkbook:async()=>workbook(),now:()=>new Date('2026-11-04T00:00:00Z')});
    assert.equal(result.status,'STORED');assert.equal(result.count,30);
    assert.equal(result.firstMonth,'2024-01-01');
    assert.equal(result.latestMonth,'2026-06-01');
    assert.equal(result.attributionRequired,true);
    const saved=JSON.parse(await fs.readFile(path.join(root,'latest.json'),'utf8'));
    const detail=JSON.parse(await fs.readFile(path.join(root,`${saved.downloadSha256}.json`),'utf8'));
    assert.equal(detail.observations.length,30);
    assert.equal((await fs.readFile(path.join(root,`${saved.downloadSha256}.xlsx`))).length,file.length);
    const second=await collectSceOneYear({directory:root,fetcher:fakeFetch,readWorkbook:async()=>workbook(),
      now:()=>new Date('2026-11-04T00:02:00Z')});
    assert.equal(second.downloadSha256,saved.downloadSha256);
  }finally{await fs.rm(root,{recursive:true,force:true});}
});

test('requires an approved directory and an injected, quota-aware fetcher',async()=>{
  await assert.rejects(()=>collectSceOneYear({directory:'relative',fetcher:fakeFetch}),
    /APPROVED_DIRECTORY/);
});

test('wrong sheet or too few months fail before any save',async()=>{
  await assert.rejects(()=>parseSceOfficialWorkbook(file,{readWorkbook:async()=>({sheets:new Map()})}),
    /SCE_INFLATION_SHEET_MISSING/);
  const tiny={sheets:new Map([['Inflation expectations',workbook().sheets.get('Inflation expectations').slice(0,6)]])};
  await assert.rejects(()=>parseSceOfficialWorkbook(file,{readWorkbook:async()=>tiny}),
    /SCE_HISTORY_INCOMPLETE/);
});

test('HTML response or offsite redirect never becomes a valid workbook',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'zgmini-sce-invalid-'));
  try{
    await assert.rejects(()=>collectSceOneYear({directory:root,
      fetcher:async()=>new Response('<html>error</html>',{status:200}),
      readWorkbook:async()=>workbook()}),/SCE_NOT_XLSX/);
    await assert.rejects(()=>collectSceOneYear({directory:root,
      fetcher:async()=>new Response(null,{status:302,headers:{location:'https://evil.example/file.xlsx'}}),
      readWorkbook:async()=>workbook()}),/SCE_HOST_NOT_ALLOWED/);
    assert.deepEqual(await fs.readdir(root),[]);
  }finally{await fs.rm(root,{recursive:true,force:true});}
});
