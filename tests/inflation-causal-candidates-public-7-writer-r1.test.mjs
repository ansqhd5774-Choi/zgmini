import test from 'node:test';
import assert from 'node:assert/strict';
import {INFLATION_CANDIDATES_7} from '../lib/inflation-causal-candidates-public-7-catalog.mjs';
import {INFLATION_CANDIDATES_7_PUBLIC_KEY,
  readInflationCandidates7PublicResponse}
  from '../worker/inflation-causal-candidates-public-7-r1.mjs';
import {inflationCandidates7PublicWriter}
  from '../worker/inflation-causal-candidates-public-7-writer-r1.mjs';

const T0=Date.parse('2026-11-07T12:00:00Z');
const T1=T0+60_000;
const T2=T1+60_000;
const pending=m=>({id:m.id,series:m.series,unit:m.unit,status:'PENDING',
  value:null,previousValue:null,observationDate:null,previousObservationDate:null,
  sourceStoredAt:null,availableAt:null,history:[]});
const ready=(m,at,value=0,date='2026-11-02')=>({id:m.id,series:m.series,unit:m.unit,
  status:'READY',value,previousValue:null,observationDate:date,
  previousObservationDate:null,sourceStoredAt:new Date(at).toISOString(),
  availableAt:null,history:[{date,value}]});
const payload=(readyCount=1,at=T0)=>({
  schemaVersion:'inflation-causal-candidates-7-r1-v1',
  status:readyCount===7?'READY':'PARTIAL',score:null,
  sourceVersion:`INFL7_TEST_${at}_${readyCount}`,
  sourceStoredAt:at,indicators:INFLATION_CANDIDATES_7.map((m,i)=>
    i<readyCount?ready(m,at):pending(m)),
});

function dbFixture(){
  const rows=new Map(),calls=[];
  let race=null,brokenReadback=false;
  const db={prepare(sql){
    const type=sql.trim().split(/\s+/)[0].toUpperCase();
    return {bind(...args){return {
      async first(){
        assert.equal(type,'SELECT');
        calls.push({type,key:args[0]});
        const row=rows.get(args[0]);
        if(brokenReadback&&calls.some(c=>c.type==='UPDATE'||c.type==='INSERT'))
          return {...row,stored_at:row.stored_at+1};
        return row?{...row}:null;
      },
      async run(){
        calls.push({type,key:type==='UPDATE'?args[2]:args[0]});
        if(type==='INSERT'){
          if(rows.has(args[0]))return {meta:{changes:0}};
          rows.set(args[0],{body:args[1],stored_at:args[2]});
          return {meta:{changes:1}};
        }
        if(type==='UPDATE'){
          if(race){race(rows);race=null;}
          const old=rows.get(args[2]);
          if(!old||old.body!==args[3]||old.stored_at!==args[4])
            return {meta:{changes:0}};
          rows.set(args[2],{body:args[0],stored_at:args[1]});
          return {meta:{changes:1}};
        }
        throw Error('UNEXPECTED_QUERY');
      },
    };}};
  }};
  return {db,rows,calls,setRace:fn=>{race=fn;},
    setBrokenReadback:x=>{brokenReadback=x;}};
}

test('writes one separate seven-key snapshot and verifies exact D1 readback',async()=>{
  const f=dbFixture(),writer=inflationCandidates7PublicWriter(f.db);
  f.rows.set('detail:inflation-causal-public-19:r1',{body:'original19',stored_at:T0});
  const result=await writer.write(payload(4),{storedAt:T1});
  assert.equal(result.status,'READBACK_VERIFIED');
  assert.equal(result.key,INFLATION_CANDIDATES_7_PUBLIC_KEY);
  assert.equal(f.rows.get('detail:inflation-causal-public-19:r1').body,'original19');
  const saved=JSON.parse(f.rows.get(INFLATION_CANDIDATES_7_PUBLIC_KEY).body);
  assert.equal(saved.payload.indicators.length,7);
  assert.equal(saved.payload.indicators.filter(r=>r.status==='READY').length,4);
  assert.equal(saved.payload.indicators[0].value,0);
  assert.equal(saved.payload.indicators[4].value,null);
  assert.equal(saved.payload.score,null);
  assert.deepEqual(Object.keys(saved),['payload','projection']);
  assert.deepEqual(Object.keys(saved.projection),
    ['status','sourceVersion','sourceStoredAt','builtAt']);
  const response=await readInflationCandidates7PublicResponse(
    new Request('https://zgmini.kr/api/inflation-candidate-inputs'),f.db,{now:T2});
  assert.equal(response.status,200);
  assert.equal((await response.json()).indicators.length,7);
});

test('identical repeat is idempotent without another D1 mutation',async()=>{
  const f=dbFixture(),w=inflationCandidates7PublicWriter(f.db),p=payload(1);
  await w.write(p,{storedAt:T1});
  const before=f.calls.filter(x=>x.type==='UPDATE'||x.type==='INSERT').length;
  const repeated=await w.write(p,{storedAt:T2});
  assert.equal(repeated.status,'ALREADY_STORED');
  assert.equal(f.calls.filter(x=>x.type==='UPDATE'||x.type==='INSERT').length,before);
});

test('a four-to-seven advance retains last good values and no score',async()=>{
  const f=dbFixture(),w=inflationCandidates7PublicWriter(f.db);
  await w.write(payload(4),{storedAt:T1});
  const newer=payload(7,T1);
  const result=await w.write(newer,{storedAt:T2});
  assert.equal(result.status,'READBACK_VERIFIED');
  assert.equal(JSON.parse(f.rows.get(INFLATION_CANDIDATES_7_PUBLIC_KEY).body).payload.status,'READY');
  assert.equal(f.calls.filter(x=>x.type==='UPDATE').length,1);
});

test('older source checkpoint and same-source conflicting value cannot overwrite',async()=>{
  const f=dbFixture(),w=inflationCandidates7PublicWriter(f.db);
  await w.write(payload(4,T1),{storedAt:T2});
  await assert.rejects(w.write(payload(1,T0),{storedAt:T2}),/INFL7_PUBLIC_SUPERSEDED/);
  const different=payload(4,T1);different.indicators[0].value=12;
  different.indicators[0].history[0].value=12;
  await assert.rejects(w.write(different,{storedAt:T2}),/INFL7_PUBLIC_CHECKPOINT_CONFLICT/);
  assert.equal(f.calls.filter(x=>x.type==='UPDATE').length,0);
});

test('READY row cannot regress to PENDING or older observation',async()=>{
  const f=dbFixture(),w=inflationCandidates7PublicWriter(f.db);
  await w.write(payload(4,T0),{storedAt:T1});
  await assert.rejects(w.write(payload(1,T1),{storedAt:T2}),/INFL7_PUBLIC_LAST_GOOD_REGRESSION/);
  const older=payload(4,T1);older.indicators[0].observationDate='2026-10-01';
  older.indicators[0].history=[{date:'2026-10-01',value:0}];
  await assert.rejects(w.write(older,{storedAt:T2}),/INFL7_PUBLIC_LAST_GOOD_REGRESSION/);
});

test('malformed existing D1 record is never silently overwritten',async()=>{
  const f=dbFixture(),w=inflationCandidates7PublicWriter(f.db);
  f.rows.set(INFLATION_CANDIDATES_7_PUBLIC_KEY,{body:'{"bad":"raw"}',stored_at:T0});
  await assert.rejects(w.write(payload(4),{storedAt:T1}),/INFL7_PUBLIC_EXISTING_INVALID/);
  assert.equal(f.calls.filter(x=>x.type==='UPDATE').length,0);
});

test('stale simultaneous writer loses exact-row CAS without clobbering',async()=>{
  const f=dbFixture(),w=inflationCandidates7PublicWriter(f.db);
  await w.write(payload(4,T0),{storedAt:T1});
  f.setRace(rows=>rows.set(INFLATION_CANDIDATES_7_PUBLIC_KEY,
    {body:'some-other-writer',stored_at:T2}));
  await assert.rejects(w.write(payload(7,T1),{storedAt:T2}),/INFL7_PUBLIC_CONCURRENT_WRITE/);
  assert.equal(f.rows.get(INFLATION_CANDIDATES_7_PUBLIC_KEY).body,'some-other-writer');
});

test('readback mismatch cannot be reported as success',async()=>{
  const f=dbFixture(),w=inflationCandidates7PublicWriter(f.db);
  f.setBrokenReadback(true);
  await assert.rejects(w.write(payload(4),{storedAt:T1}),/INFL7_PUBLIC_READBACK_MISMATCH/);
});

test('invalid score, raw field and time are rejected without D1 writes',async()=>{
  const f=dbFixture(),w=inflationCandidates7PublicWriter(f.db);
  const s=payload();s.score=50;
  const raw=payload();raw.indicators[0].raw='secret';
  for(const [p,at] of [[s,T1],[raw,T1],[payload(),T0-1]])
    await assert.rejects(w.write(p,{storedAt:at}));
  assert.equal(f.calls.length,0);
});

test('missing D1 binding is denied and no provider access is present',()=>{
  assert.throws(()=>inflationCandidates7PublicWriter(null),/INFL7_PUBLIC_STORAGE_UNAVAILABLE/);
  const source=inflationCandidates7PublicWriter.toString();
  assert.ok(!source.includes('fetch('));
});
