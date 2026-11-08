import test from 'node:test';
import assert from 'node:assert/strict';
import {INFLATION_CANDIDATES_7} from '../../lib/inflation-causal-candidates-public-7-catalog.mjs';
import {INFLATION_CANDIDATES_7_PUBLIC_KEY,
  validateInflationCandidates7Public}
  from '../../worker/inflation-causal-candidates-public-7-r1.mjs';
import {inflationCandidates7PublicWriter}
  from '../../worker/inflation-causal-candidates-public-7-writer-r1.mjs';
import {publishInflationCandidates7Auto,comparableCandidates7}
  from './inflation-causal-candidates-public-7-auto-publication-r1.mjs';

const T0=Date.parse('2026-11-07T12:00:00Z'),T1=T0+60_000,T2=T1+60_000;
const pending=m=>({id:m.id,series:m.series,unit:m.unit,status:'PENDING',
  value:null,previousValue:null,observationDate:null,previousObservationDate:null,
  sourceStoredAt:null,availableAt:null,history:[]});
const ready=(m,at,value=10)=>({id:m.id,series:m.series,unit:m.unit,
  status:'READY',value,previousValue:null,observationDate:'2026-09-01',
  previousObservationDate:null,sourceStoredAt:new Date(at).toISOString(),
  availableAt:null,history:[{date:'2026-09-01',value}]});
const payload=(count,at=T0,code='a')=>({
  schemaVersion:'inflation-causal-candidates-7-r1-v1',
  status:count===7?'READY':'PARTIAL',score:null,
  sourceVersion:'INFL7_PRESENTATION_'+code.repeat(64),sourceStoredAt:at,
  indicators:INFLATION_CANDIDATES_7.map((m,i)=>i<count?ready(m,at):pending(m)),
});
const preview=p=>({status:'PASS_READONLY',ready:p.indicators.filter(x=>x.status==='READY').length,
  payload:p,providerCalls:0,coreWrites:0,dbWrites:0,d1Writes:0,schedulerWrites:0});

function fixture(){
  const rows=new Map(),calls=[];
  const db={prepare(sql){
    const op=sql.trim().split(/\s+/)[0].toUpperCase();
    return {bind(...args){return {
      async first(){assert.equal(op,'SELECT');return rows.get(args[0])??null;},
      async run(){
        calls.push(op);
        if(op==='INSERT'){
          if(rows.has(args[0]))return {meta:{changes:0}};
          rows.set(args[0],{body:args[1],stored_at:args[2]});
          return {meta:{changes:1}};
        }
        if(op==='UPDATE'){
          const old=rows.get(args[2]);
          if(!old||old.body!==args[3]||old.stored_at!==args[4])
            return {meta:{changes:0}};
          rows.set(args[2],{body:args[0],stored_at:args[1]});
          return {meta:{changes:1}};
        }
        throw Error('UNEXPECTED_WRITE');
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
    adapter(_db,{allowWrites}){assert.equal(allowWrites,true);return db;},
  };
  return {rows,calls,remote,db};
}

const run=(f,p,now=T1)=>publishInflationCandidates7Auto({
  pcHome:'TEST_ONLY',remote:f.remote,coreDb:'approved-core',now,
  previewFn:()=>preview(p),validate:validateInflationCandidates7Public,
  writerFactory:inflationCandidates7PublicWriter,
});

test('publishes only seven-row key via an existing remote adapter with readback',async()=>{
  const f=fixture(),p=payload(4);
  f.rows.set('detail:inflation-causal-public-19:r1',
    {body:'original-nineteen',stored_at:T0});
  assert.equal((await run(f,p)).status,'READBACK_VERIFIED');
  assert.deepEqual(f.calls,['INSERT']);
  assert.equal(f.rows.get('detail:inflation-causal-public-19:r1').body,'original-nineteen');
  const saved=JSON.parse(f.rows.get(INFLATION_CANDIDATES_7_PUBLIC_KEY).body);
  assert.equal(saved.payload.score,null);
  assert.equal(saved.payload.indicators.filter(row=>row.status==='READY').length,4);
  assert.equal(saved.payload.indicators[4].value,null);
});

test('unchanged and metadata-only repeat are skipped without touching D1',async()=>{
  const f=fixture(),p=payload(4);
  await run(f,p);
  assert.equal((await run(f,p,T2)).status,'UNCHANGED_VERIFIED');
  const later=structuredClone(p);
  later.sourceVersion='INFL7_PRESENTATION_'+'b'.repeat(64);
  later.sourceStoredAt=T1;
  for(const row of later.indicators)
    if(row.status==='READY')row.sourceStoredAt=new Date(T1).toISOString();
  assert.equal((await run(f,later,T2)).status,'SKIPPED_METADATA_ONLY');
  assert.deepEqual(f.calls,['INSERT']);
});

test('new source in lower-timestamp row advances even if envelope maximum is fixed',async()=>{
  const f=fixture(),before=payload(4),after=structuredClone(before);
  await run(f,before);
  after.sourceVersion='INFL7_PRESENTATION_'+'c'.repeat(64);
  after.indicators[4]=ready(INFLATION_CANDIDATES_7[4],T0-30_000,21);
  assert.equal((await run(f,after,T2)).status,'READBACK_VERIFIED');
  assert.deepEqual(f.calls,['INSERT','UPDATE']);
});

test('source loss exposes original last-good as STALE and still publishes other rows',async()=>{
  const f=fixture(),before=payload(4),after=payload(1,T1,'d');
  await run(f,before);
  const result=await run(f,after,T2);
  assert.equal(result.status,'READBACK_VERIFIED');
  assert.equal(result.d1Writes,1);
  assert.deepEqual(f.calls,['INSERT','UPDATE']);
  const saved=JSON.parse(f.rows.get(INFLATION_CANDIDATES_7_PUBLIC_KEY).body).payload;
  assert.equal(saved.status,'PARTIAL');
  assert.equal(saved.indicators[0].status,'READY');
  for(let i=1;i<4;i++){
    const retained=saved.indicators[i];
    assert.equal(retained.status,'STALE');
    assert.equal(retained.value,before.indicators[i].value);
    assert.equal(retained.observationDate,before.indicators[i].observationDate);
    assert.equal(retained.sourceStoredAt,before.indicators[i].sourceStoredAt);
    assert.deepEqual(retained.history,before.indicators[i].history);
  }
  assert.equal(saved.indicators[4].status,'PENDING');
  // The next independent READY update must not be blocked by STALE rows.
  const next=structuredClone(after);
  next.indicators[0]=ready(INFLATION_CANDIDATES_7[0],T2+1000,55);
  next.sourceVersion='INFL7_PRESENTATION_'+'e'.repeat(64);
  next.sourceStoredAt=T2+1000;
  assert.equal((await run(f,next,T2+2000)).status,'READBACK_VERIFIED');
  assert.deepEqual(f.calls,['INSERT','UPDATE','UPDATE']);
});

test('STALE row can recover as READY from identical stored evidence',async()=>{
  const f=fixture(),before=payload(4),lost=payload(1,T1,'d');
  await run(f,before);
  await run(f,lost,T2);
  const recovered=structuredClone(before);
  recovered.indicators[0]=lost.indicators[0];
  recovered.sourceStoredAt=T1;
  recovered.sourceVersion='INFL7_PRESENTATION_'+'e'.repeat(64);
  assert.equal((await run(f,recovered,T2+1000)).status,'READBACK_VERIFIED');
  const rows=JSON.parse(f.rows.get(INFLATION_CANDIDATES_7_PUBLIC_KEY).body).payload.indicators;
  for(let i=0;i<4;i++)assert.equal(rows[i].status,'READY');
  assert.deepEqual(f.calls,['INSERT','UPDATE','UPDATE']);
});

test('complete source outage marks the previous observations STALE, never fabricates an empty snapshot',async()=>{
  const f=fixture(),before=payload(4);
  await run(f,before);
  const request=()=>publishInflationCandidates7Auto({
    pcHome:'TEST_ONLY',remote:f.remote,coreDb:'approved-core',now:T2,
    previewFn:()=>({status:'PENDING',ready:0,payload:null,providerCalls:0,
      coreWrites:0,dbWrites:0,d1Writes:0,schedulerWrites:0}),
    validate:validateInflationCandidates7Public,
    writerFactory:inflationCandidates7PublicWriter,
  });
  assert.equal((await request()).status,'READBACK_VERIFIED');
  let saved=JSON.parse(f.rows.get(INFLATION_CANDIDATES_7_PUBLIC_KEY).body).payload;
  assert.equal(saved.status,'PARTIAL');
  assert.equal(saved.indicators.filter(row=>row.status==='STALE').length,4);
  assert.equal(saved.indicators.filter(row=>row.status==='PENDING').length,3);
  assert.deepEqual(saved.indicators[0].history,before.indicators[0].history);
  assert.equal(saved.indicators[0].sourceStoredAt,before.indicators[0].sourceStoredAt);
  assert.equal((await request()).status,'UNCHANGED_VERIFIED');
  assert.deepEqual(f.calls,['INSERT','UPDATE']);

  const blank=fixture();
  assert.equal((await publishInflationCandidates7Auto({
    pcHome:'TEST_ONLY',remote:blank.remote,coreDb:'approved-core',now:T2,
    previewFn:()=>({status:'PENDING',ready:0,payload:null,providerCalls:0,
      coreWrites:0,dbWrites:0,d1Writes:0,schedulerWrites:0}),
  })).status,'SKIPPED_INPUTS_NOT_READY');
  assert.equal(blank.calls.length,0);
});

test('unready or side-effectful preview, malformed stored checkpoint fail closed',async()=>{
  const f=fixture();
  const none=await publishInflationCandidates7Auto({pcHome:'TEST_ONLY',
    remote:f.remote,coreDb:'approved-core',now:T1,
    previewFn:()=>({status:'PENDING',ready:0})});
  assert.equal(none.status,'SKIPPED_INPUTS_NOT_READY');
  await assert.rejects(publishInflationCandidates7Auto({pcHome:'TEST_ONLY',
    remote:f.remote,coreDb:'approved-core',now:T1,
    previewFn:()=>({...preview(payload(4)),providerCalls:1})}),
    /INFL7_AUTO_PREVIEW_SIDE_EFFECT_DENIED/);
  f.rows.set(INFLATION_CANDIDATES_7_PUBLIC_KEY,{body:'{"bad":1}',stored_at:T0});
  await assert.rejects(run(f,payload(4)),/INFL7_AUTO_REMOTE_CONTRACT_DENIED/);
  assert.equal(f.calls.length,0);
});

test('payload comparison omits checkpoint metadata, not observation values',()=>{
  const a=payload(4),b=structuredClone(a);
  b.sourceVersion='INFL7_PRESENTATION_'+'f'.repeat(64);
  b.sourceStoredAt=T1;
  b.indicators[0].sourceStoredAt=new Date(T1).toISOString();
  assert.deepEqual(comparableCandidates7(a),comparableCandidates7(b));
  b.indicators[0].value++;
  assert.notDeepEqual(comparableCandidates7(a),comparableCandidates7(b));
});
