import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {publishInflationCandidates7Auto} from
  '../scripts/pc-writer/inflation-causal-candidates-public-7-auto-publication-r1.mjs';
import {INFLATION_CANDIDATES_7_PUBLIC_KEY,readInflationCandidates7PublicResponse} from
  '../worker/inflation-causal-candidates-public-7-r1.mjs';

const SOURCE0='2026-11-16T10:30:02.905Z';
const SOURCE1='2026-11-17T10:30:02.905Z';
const PUBLISH0=Date.parse('2026-11-17T14:00:00.000Z');
const PUBLISH1=PUBLISH0+60_000,PUBLISH2=PUBLISH1+60_000;
const KEY19='detail:inflation-causal-public-19:r1';
const folder='inflation-causal-candidates-r1';

function sourceFile(home,name,doc){
  const file=path.join(home,folder,name);
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,JSON.stringify(doc));
  return file;
}
const months=(v)=>[
  {date:'2026-09-01',value:v},
  {date:'2026-10-01',value:v+1},
];

function makePrivateSix(home){
  const files={};
  files.bls=sourceFile(home,'bls-cpi-ppi3.json',{
    schemaVersion:1,provider:'BLS',sourceVersion:'INFLATION_CAUSAL_CANDIDATE_BLS3_R1',
    sourceStoredAt:SOURCE0,frequency:'MONTHLY',series:{
      CUSR0000SEHA:months(430),CUSR0000SEHC01:months(440),
      WPSFD4:months(150),
    },
  });
  files.eia=sourceFile(home,'eia-us-regular-gasoline-weekly.json',{
    schemaVersion:1,provider:'EIA',
    sourceVersion:'INFLATION_CAUSAL_CANDIDATE_EIA_REGULAR_R1',
    sourceStoredAt:SOURCE0,selector:'EMM_EPMR_PTE_NUS_DPG',
    unit:'USD_PER_GALLON',frequency:'WEEKLY',
    observations:[
      {date:'2026-10-05',value:3.2,unit:'USD_PER_GALLON'},
      {date:'2026-10-12',value:3.3,unit:'USD_PER_GALLON'},
    ],
  });
  files.treasury=sourceFile(home,'treasury-mts-customs-duties.json',{
    schemaVersion:1,provider:'US_TREASURY_MTS',
    sourceVersion:'INFLATION_CAUSAL_CANDIDATE_TREASURY_MTS_R1',
    sourceStoredAt:SOURCE0,lineCode:'405',classification:'Customs Duties',
    frequency:'MONTHLY',observations:[
      {date:'2026-08-31',period:'2026-08',unit:'USD',
        valueKind:'MONTHLY_NET_CASH_RECEIPTS',netUsdDecimal:'101.00'},
      {date:'2026-09-30',period:'2026-09',unit:'USD',
        valueKind:'MONTHLY_NET_CASH_RECEIPTS',netUsdDecimal:'102.00'},
    ],
  });
  files.fed=sourceFile(home,'fed-g17-manufacturing-ip.json',{
    schemaVersion:1,provider:'FEDERAL_RESERVE_G17',
    sourceVersion:'INFLATION_CAUSAL_CANDIDATE_FED_G17_R1',
    sourceStoredAt:SOURCE0,selector:'GMF',frequency:'MONTHLY',
    unit:'CURRENT_G17_INDEX_SA',observations:months(98),
  });
  // Candidate #28 Census deliberately has no physical source.
  return files;
}

function remoteFixture(){
  const rows=new Map(),writes=[];
  const db={prepare(sql){
    const operation=sql.trim().split(/\s+/)[0].toUpperCase();
    return {bind(...args){return {
      async first(){
        assert.equal(operation,'SELECT');
        const row=rows.get(args[0]);
        return row?{...row}:null;
      },
      async run(){
        writes.push(operation);
        if(operation==='INSERT'){
          if(rows.has(args[0]))return {meta:{changes:0}};
          rows.set(args[0],{body:args[1],stored_at:args[2]});
          return {meta:{changes:1}};
        }
        if(operation==='UPDATE'){
          const previous=rows.get(args[2]);
          if(!previous||previous.body!==args[3]||previous.stored_at!==args[4])
            return {meta:{changes:0}};
          rows.set(args[2],{body:args[0],stored_at:args[1]});
          return {meta:{changes:1}};
        }
        throw Error('UNEXPECTED_D1_OPERATION');
      },
    };}};
  }};
  const remote={
    async query(_db,sql,args){
      assert.match(sql,/market_public_snapshots_v1/);
      assert.deepEqual(args,[INFLATION_CANDIDATES_7_PUBLIC_KEY]);
      const row=rows.get(args[0]);
      return {results:row?[{...row}]:[]};
    },
    adapter(_db,{allowWrites}){
      assert.equal(allowWrites,true);
      return db;
    },
  };
  return {db,remote,rows,writes};
}
const saved=f=>JSON.parse(f.rows.get(INFLATION_CANDIDATES_7_PUBLIC_KEY).body).payload;
const publish=(home,f,now)=>publishInflationCandidates7Auto({
  pcHome:home,remote:f.remote,coreDb:'FIXTURE_ONLY',now,
});
const indicator=(payload,id)=>payload.indicators.find(row=>row.id===id);

test('A4-08: real private six-file preview to Writer/D1 readback keeps last-good on a damaged CPI series and full outage',async()=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'w01-a408-real-'));
  try{
    const source=makePrivateSix(home),f=remoteFixture();
    f.rows.set(KEY19,{body:'PROTECTED_19_LAST_GOOD',stored_at:PUBLISH0-60_000});
    const first=await publish(home,f,PUBLISH0);
    assert.equal(first.status,'READBACK_VERIFIED');
    assert.equal(first.ready,6);
    const before=saved(f);
    assert.equal(before.score,null);
    assert.deepEqual(before.indicators.map(row=>row.status),
      ['READY','READY','READY','READY','READY','PENDING','READY']);
    const cpi22=structuredClone(indicator(before,'22'));
    const ppi24=structuredClone(indicator(before,'24'));
    assert.equal(indicator(before,'28').value,null);
    const untouchedEia=fs.readFileSync(source.eia);
    const untouchedTreasury=fs.readFileSync(source.treasury);

    // The physical BLS file remains valid JSON, including #23 and #24.
    // Only the saved #22 series is missing; no synthetic replacement is allowed.
    const bls=JSON.parse(fs.readFileSync(source.bls,'utf8'));
    delete bls.series.CUSR0000SEHA;
    fs.writeFileSync(source.bls,JSON.stringify(bls));
    const corruptedBls=fs.readFileSync(source.bls);
    // An independent valid Fed source advances in the same stored snapshot.
    const fed=JSON.parse(fs.readFileSync(source.fed,'utf8'));
    fed.sourceStoredAt=SOURCE1;
    fed.observations=months(100);
    fs.writeFileSync(source.fed,JSON.stringify(fed));
    const newFedBytes=fs.readFileSync(source.fed);

    const second=await publish(home,f,PUBLISH1);
    assert.equal(second.status,'READBACK_VERIFIED');
    assert.equal(second.ready,5);
    const after=saved(f);
    assert.equal(after.status,'PARTIAL');
    const stale22=indicator(after,'22');
    assert.equal(stale22.status,'STALE');
    assert.deepEqual({...stale22,status:'READY'},cpi22);
    assert.deepEqual(indicator(after,'24'),ppi24);
    assert.equal(indicator(after,'23').status,'READY');
    assert.equal(indicator(after,'29').status,'READY');
    assert.equal(indicator(after,'29').sourceStoredAt,SOURCE1);
    assert.equal(indicator(after,'29').value,101);
    assert.equal(indicator(after,'28').status,'PENDING');
    assert.equal(indicator(after,'28').value,null);
    assert.equal(after.score,null);
    assert.deepEqual(fs.readFileSync(source.bls),corruptedBls);
    assert.deepEqual(fs.readFileSync(source.fed),newFedBytes);
    assert.deepEqual(fs.readFileSync(source.eia),untouchedEia);
    assert.deepEqual(fs.readFileSync(source.treasury),untouchedTreasury);
    assert.equal(f.rows.get(KEY19).body,'PROTECTED_19_LAST_GOOD');

    const response=await readInflationCandidates7PublicResponse(
      new Request('https://zgmini.kr/api/inflation-candidate-inputs'),f.db,
      {now:PUBLISH2});
    assert.equal(response.status,200);
    const publicRows=await response.json();
    assert.equal(indicator(publicRows,'22').status,'STALE');
    assert.equal(indicator(publicRows,'22').value,cpi22.value);
    assert.equal(indicator(publicRows,'29').value,101);

    // Loss of the entire source directory must preserve all six last-valid
    // observations as STALE, never convert the absent Census to a number.
    fs.renameSync(path.join(home,folder),path.join(home,'offline-source'));
    const outage=await publish(home,f,PUBLISH2);
    assert.equal(outage.status,'READBACK_VERIFIED');
    const during=saved(f);
    assert.equal(during.indicators.filter(row=>row.status==='STALE').length,6);
    assert.equal(indicator(during,'28').status,'PENDING');
    assert.equal(indicator(during,'28').value,null);
    assert.equal(indicator(during,'22').value,cpi22.value);
    assert.equal(indicator(during,'29').value,101);
    assert.equal(f.rows.get(KEY19).body,'PROTECTED_19_LAST_GOOD');
    assert.equal((await publish(home,f,PUBLISH2+1000)).status,'UNCHANGED_VERIFIED');
    assert.deepEqual(f.writes,['INSERT','UPDATE','UPDATE']);
    for(const report of [first,second,outage])
      for(const key of ['providerCalls','coreWrites','dbWrites','schedulerWrites'])
        assert.equal(report[key],0);
  }finally{
    fs.rmSync(home,{recursive:true,force:true});
  }
});
