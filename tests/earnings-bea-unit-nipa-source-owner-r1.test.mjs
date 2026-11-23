import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {collectBeaUnitNipaSourceOnce}
  from '../scripts/pc-writer/EARNINGS_BEA_UNIT_NIPA_SOURCE_OWNER_R1.mjs';
import {beaUnitNipaArchivePaths,computeBeaUnitNipaStoredPreview}
  from '../scripts/pc-writer/EARNINGS_BEA_UNIT_NIPA_ARCHIVE_R1.mjs';

const AT=Date.parse('2026-11-23T00:00:00Z');
const KEY='TEST_ONLY_BEa_CREDENTIAL_DO_NOT_LOG';
const payload=()=>({BEAAPI:{
  Request:{RequestParam:[{ParameterName:'USERID',ParameterValue:KEY}]},
  Results:{Data:[
    ['2025Q2','0.216'],['2025Q3','0.219'],['2025Q4','0.222'],
    ['2026Q1','0.231'],['2026Q2','0.250']
  ].map(([TimePeriod,DataValue])=>({
    TableName:'T11500',SeriesCode:'A463RD',LineNumber:'7',TimePeriod,
    DataValue,CL_UNIT:'USD',UNIT_MULT:'0'
  }))}}});
const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-w05-bea-collector-'));
const fake=(body=payload())=>({
  ok:true,headers:{get:()=>null},
  arrayBuffer:async()=>Buffer.from(JSON.stringify(body),'utf8')
});

test('BEA approved caller can perform exactly one T11500 Q GET and sanitized archive readback',async()=>{
  const pcBase=temp();
  let hits=0,capturedUrl,options,ticks=0;
  try{
    const saved=await collectBeaUnitNipaSourceOnce({
      pcBase,providers:{BEA_API_KEY:KEY},now:()=>AT+(ticks++),
      fetchImpl:async(url,opts)=>{hits++;capturedUrl=new URL(url);options=opts;return fake();}
    });
    assert.equal(hits,1);
    assert.equal(saved.providerRequests,1);
    assert.equal(saved.status,'SOURCE_STORED_READBACK_VERIFIED');
    assert.equal(capturedUrl.origin,'https://apps.bea.gov');
    assert.equal(capturedUrl.pathname,'/api/data');
    assert.equal(capturedUrl.searchParams.get('method'),'GetData');
    assert.equal(capturedUrl.searchParams.get('datasetname'),'NIPA');
    assert.equal(capturedUrl.searchParams.get('TableName'),'T11500');
    assert.equal(capturedUrl.searchParams.get('Frequency'),'Q');
    assert.equal(capturedUrl.searchParams.get('Year'),'2025,2026');
    assert.equal(capturedUrl.searchParams.get('ResultFormat'),'JSON');
    assert.equal(options.redirect,'error');
    const paths=beaUnitNipaArchivePaths({pcBase,sourceSha:saved.sourceVersion});
    assert.equal(fs.readFileSync(paths.raw,'utf8').includes(KEY),false);
    assert.equal(fs.readFileSync(paths.meta,'utf8').includes(KEY),false);
    assert.notEqual(saved.sourceHttpSha256,saved.sourceVersion);
    const computed=computeBeaUnitNipaStoredPreview({
      pcBase,sourceSha:saved.sourceVersion});
    assert.equal(computed.currentValue,0.25);
    assert.ok(Math.abs(computed.change-0.019)<1e-12);
    const pinned=await collectBeaUnitNipaSourceOnce({
      pcBase,sourceSha:saved.sourceVersion,fetchImpl:()=>{throw Error('FETCH_FORBIDDEN');}
    });
    assert.equal(pinned.providerRequests,0);
    assert.equal(pinned.sourceStoredAt,saved.sourceStoredAt);
    assert.equal(hits,1);
  }finally{fs.rmSync(pcBase,{recursive:true,force:true});}
});

test('BEA missing credentials and invalid pin reject before any provider call or raw write',async()=>{
  const pcBase=temp();let hits=0;
  try{
    const fetchImpl=async()=>{hits++;return fake();};
    await assert.rejects(collectBeaUnitNipaSourceOnce({
      pcBase,providers:{},fetchImpl,now:()=>AT
    }),/BEA_UNIT_NIPA_COLLECT_CREDENTIAL_UNAVAILABLE/);
    await assert.rejects(collectBeaUnitNipaSourceOnce({
      pcBase,sourceSha:'not-a-sha',providers:{BEA_API_KEY:KEY},fetchImpl,now:()=>AT
    }),/BEA_UNIT_NIPA_COLLECT_SOURCE_PIN_INVALID/);
    assert.equal(hits,0);
    assert.equal(fs.existsSync(path.join(pcBase,'raw')),false);
  }finally{fs.rmSync(pcBase,{recursive:true,force:true});}
});

test('failed HTTP, overlarge response and invalid BEA JSON do not persist or retry',async()=>{
  for(const responseFactory of [
    ()=>({ok:false,headers:{get:()=>null}}),
    ()=>({ok:true,headers:{get:()=>String(2_000_001)}}),
    ()=>({ok:true,headers:{get:()=>null},arrayBuffer:async()=>Buffer.alloc(2_000_001)}),
    ()=>({ok:true,headers:{get:()=>null},arrayBuffer:async()=>Buffer.from('{}')})
  ]){
    const pcBase=temp();let hits=0;
    try{
      await assert.rejects(collectBeaUnitNipaSourceOnce({
        pcBase,providers:{BEA_API_KEY:KEY},now:()=>AT,
        fetchImpl:async()=>{hits++;return responseFactory();}
      }),/BEA_UNIT_NIPA_(?:COLLECT_|RAW_|DATA_)/);
      assert.equal(hits,1);
      assert.equal(fs.existsSync(path.join(pcBase,'raw')),false);
    }finally{fs.rmSync(pcBase,{recursive:true,force:true});}
  }
});

test('provider exception never exposes secrets in failure error or writes',async()=>{
  const pcBase=temp();let hits=0;
  try{
    await assert.rejects(collectBeaUnitNipaSourceOnce({
      pcBase,providers:{BEA_API_KEY:KEY},now:()=>AT,
      fetchImpl:async()=>{hits++;throw Error(KEY);}
    }),err=>{
      assert.equal(err.message,'BEA_UNIT_NIPA_COLLECT_PROVIDER_UNAVAILABLE');
      return true;
    });
    assert.equal(hits,1);
    assert.equal(fs.existsSync(path.join(pcBase,'raw')),false);
  }finally{fs.rmSync(pcBase,{recursive:true,force:true});}
});
