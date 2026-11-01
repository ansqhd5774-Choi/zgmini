// Standalone synthetic Census QFR ZIP fixture: never contacts the network or PC/D1.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import zlib from 'node:zlib';
import {extractQfrCsv,analyzeQfrCsv,analyzeQfrZip,QFR_URL}
  from './EARNINGS_CENSUS_QFR_R1_READONLY.mjs';

const TIME='2026-10-27T13:00:00.000Z',SHA='a'.repeat(64);
const crc32=input=>{
  let crc=0xffffffff;
  for(const b of input){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
};

function fixture({gap=false,zeroSales=false,newerPartial=false}={}){
  const periods=['Q2-2025','Q3-2025','Q4-2025','Q1-2026','Q2-2026'];
  const data=[];
  for(let i=0;i<5;i++){
    if(gap&&i===2)continue;
    data.push(`${i+101},1,1,0,1,0,${zeroSales&&i===4?0:1000+i*100}`);
    data.push(`${i+101},1,9,0,1,0,${100+i*20}`);
  }
  if(newerPartial)data.push('106,1,1,0,1,0,1800');
  return [
    'CATEGORIES\ncat_idx,cat_code,cat_desc,cat_indent\n1,MFG,All Manufacturing,0',
    'DATA TYPES\ndt_idx,dt_code,dt_desc,dt_unit\n1,101,"Net Sales, Receipts",MLN$\n9,115,"Income After Taxes",MLN$',
    'GEO LEVELS\ngeo_idx,geo_code,geo_desc\n1,US,U.S. Total',
    'TIME PERIODS\nper_idx,per_name\n'+periods.map((p,i)=>`${101+i},${p}`).join('\n')
      +(newerPartial?'\n106,Q3-2026':''),
    'DATA UPDATED ON\nTuesday, 08-Sep-26 09:05:38 EDT',
    'DATA\nper_idx,cat_idx,dt_idx,et_idx,geo_idx,is_adj,val\n'+data.join('\n'),
  ].join('\n\n');
}

function zipFixture(csv,{method=8}={}){
  const raw=Buffer.from(csv,'utf8'),name=Buffer.from('QFR-mf.csv');
  const compressed=method===8?zlib.deflateRawSync(raw):raw;
  const crc=crc32(raw);
  const local=Buffer.alloc(30),central=Buffer.alloc(46),end=Buffer.alloc(22);
  local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(method,8);
  local.writeUInt32LE(crc,14);local.writeUInt32LE(compressed.length,18);
  local.writeUInt32LE(raw.length,22);local.writeUInt16LE(name.length,26);
  central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,4);
  central.writeUInt16LE(20,6);central.writeUInt16LE(method,10);
  central.writeUInt32LE(crc,16);central.writeUInt32LE(compressed.length,20);
  central.writeUInt32LE(raw.length,24);central.writeUInt16LE(name.length,28);
  const at=local.length+name.length+compressed.length;
  end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(1,8);
  end.writeUInt16LE(1,10);end.writeUInt32LE(central.length+name.length,12);
  end.writeUInt32LE(at,16);
  return Buffer.concat([local,name,compressed,central,name,end]);
}

test('deflate and stored official-format ZIP extract exact CSV',()=>{
  for(const method of [0,8]){
    const csv=fixture(),archive=zipFixture(csv,{method});
    assert.equal(extractQfrCsv(archive),csv);
    const result=analyzeQfrZip(archive,{retrievedAt:TIME});
    assert.equal(result.observedThrough,'2026-Q2');
    assert.equal(result.sourceURL,QFR_URL);
    assert.equal(result.sourceSha256.length,64);
    assert.equal(result.history.length,5);
    assert.equal(result.adjustment,'NOT_SEASONALLY_ADJUSTED');
    assert.equal(result.publishedToD1,false);
  }
});

test('Census raw units and derived margin remain separable, not a score',()=>{
  const result=analyzeQfrCsv(fixture(),{retrievedAt:TIME,sourceSha256:SHA});
  assert.deepEqual(result.history.map(row=>row.period),
    ['2025-Q2','2025-Q3','2025-Q4','2026-Q1','2026-Q2']);
  assert.equal(result.history.at(-1).salesMillionsUSD,1400);
  assert.equal(result.history.at(-1).afterTaxProfitMillionsUSD,180);
  assert.equal(result.value,100*180/1400);
  assert.equal(result.previousValue,100*160/1300);
  assert.equal(result.scoreModified,false);
  assert.equal(result.provenance.salesDataType,'101');
  assert.equal(result.provenance.afterTaxProfitDataType,'115');
});

test('changed archive CRC, stripped ZIP, or unexpected metadata fails closed',()=>{
  const zip=zipFixture(fixture());
  const changed=Buffer.from(zip);changed.writeUInt32LE(0,14);
  assert.throws(()=>extractQfrCsv(changed),/QFR_ZIP_INTEGRITY_FAILED/);
  assert.throws(()=>extractQfrCsv(Buffer.from('bad')),/QFR_ZIP_SIZE_INVALID/);
  assert.throws(()=>analyzeQfrCsv(fixture().replace('All Manufacturing','All Services'),
    {retrievedAt:TIME,sourceSha256:SHA}),/QFR_REQUIRED_METADATA_CHANGED/);
});

test('missing period, zero sales, and newer partially reported quarter never interpolate',()=>{
  for(const opts of [{gap:true},{zeroSales:true},{newerPartial:true}]){
    assert.throws(()=>analyzeQfrCsv(fixture(opts),{retrievedAt:TIME,sourceSha256:SHA}),
      /QFR_INSUFFICIENT_QUARTER_HISTORY|QFR_NEWER_PARTIAL_QUARTER/);
  }
});

test('duplicated source observation and numeric gaps are not treated as zero',()=>{
  const csv=fixture();
  const duplicate=csv+'\n105,1,9,0,1,0,999';
  assert.throws(()=>analyzeQfrCsv(duplicate,{retrievedAt:TIME,sourceSha256:SHA}),
    /QFR_DATA_DUPLICATE_OBSERVATION/);
  const unavailable=csv.replace('104,1,9,0,1,0,160','104,1,9,0,1,0,NA');
  assert.throws(()=>analyzeQfrCsv(unavailable,{retrievedAt:TIME,sourceSha256:SHA}),
    /QFR_DATA_MISSING_OR_NONNUMERIC/);
});
