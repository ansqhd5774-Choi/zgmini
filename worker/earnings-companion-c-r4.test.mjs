import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EARNINGS_C_FRESHNESS,EARNINGS_C_ROUTE,EARNINGS_C_SNAPSHOT_KEY,
  validateEarningsCompanionPayload,earningsCompanionFreshness,
  earningsCompanionWriter,readEarningsCompanionResponse,
} from './earnings-companion-c-r4.mjs';

const NOW=Date.parse('2026-10-27T10:00:00.000Z');
const SOURCE_AT=Date.parse('2026-10-26T17:02:53.996Z');
const iso=new Date(SOURCE_AT).toISOString();
const monthlyPeriods=Array.from({length:13},(_,i)=>`202${i<4?'5':'6'}-${String((i+8)%12+1).padStart(2,'0')}`);
const qPeriods=['2025-Q2','2025-Q3','2025-Q4','2026-Q1','2026-Q2'];

function row({id,seriesId,frequency,periods,values,unit='INDEX',method='SOURCE_INDEX'}={}){
  const value=values.at(-1),previousValue=values.at(-2);
  return {indicatorId:id,name:'검증된 테스트 지표',category:'COST_PRESSURE',
    kind:method==='YOY_SA_T_MINUS_12'?'DERIVED':'RAW',value,unit,frequency,
    adjustment:'SA',observationPeriod:periods.at(-1),previousPeriod:periods.at(-2),
    previousValue,change:value-previousValue,
    changeUnit:unit==='INDEX'?'INDEX_POINTS':'PERCENTAGE_POINTS',
    releaseDate:null,nextReleaseDate:null,retrievedAt:iso,
    provider:'BLS',seriesId,publisher:'U.S. Bureau of Labor Statistics',
    sourceURL:`https://data.bls.gov/timeseries/${seriesId}`,method,status:'READY',
    unavailableReason:null,history:periods.map((period,i)=>({period,value:values[i]})),
    historyCoverage:{actualPoints:periods.length,expectedPeriods:periods.length,complete:true}};
}

function fixture({quarterPeriods=qPeriods}={}){
  const monthly=row({id:'bls_ppi_final_demand_index',seriesId:'WPSFD4',
    frequency:'MONTHLY',periods:monthlyPeriods,values:monthlyPeriods.map((_,i)=>100+i)});
  const quarterly=row({id:'bls_unit_labor_cost_yoy',seriesId:'PRS85006111',
    frequency:'QUARTERLY',periods:quarterPeriods,values:quarterPeriods.map((_,i)=>i+1),
    method:'SOURCE_YOY',unit:'PERCENT'});
  return {schemaVersion:'earnings-companion-c-r4-v1',status:'READY',
    sourceVersion:'a'.repeat(64),sourceStoredAt:SOURCE_AT,
    generatedAt:'2026-10-27T06:13:08.700Z',
    historicalMode:'CURRENT_RETRIEVAL_NOT_PIT',
    observedThroughBySeries:{WPSFD4:monthly.observationPeriod,PRS85006111:quarterly.observationPeriod},
    coverage:{configured:2,ready:2,partial:0,unavailable:0},rows:[monthly,quarterly]};
}
const clone=x=>structuredClone(x);
const request=(method='GET',search='')=>new Request(`https://zgmini.kr${EARNINGS_C_ROUTE}${search}`,{method});

function d1(){
  const records=new Map(),queries=[];
  return {records,queries,prepare(sql){
    return {bind(...params){return {
      async first(){queries.push({kind:'READ',sql,params});return records.get(params[0])??null;},
      async run(){queries.push({kind:'WRITE',sql,params});
        assert.match(sql,/^INSERT INTO market_public_snapshots_v1/);
        const [key,body,storedAt,newSource,upperAt]=params,prior=records.get(key);
        const oldSource=prior?JSON.parse(prior.body).projection.sourceStoredAt:null;
        if(prior&&!(oldSource<newSource&&prior.stored_at<=upperAt))return {meta:{changes:0}};
        records.set(key,{body,stored_at:storedAt});return {meta:{changes:1}};
      }
    };}};
  }};
}

test('dynamic BLS C registry: monthly + quarterly passes without relying on fixed row count',()=>{
  const payload=fixture();assert.equal(validateEarningsCompanionPayload(payload,{now:NOW}),payload);
  assert.equal(EARNINGS_C_SNAPSHOT_KEY,'detail:earnings-recession-indicators:v1');
  assert.equal(EARNINGS_C_FRESHNESS.MONTHLY.observationMaxAgeDays,75);
  assert.equal(EARNINGS_C_FRESHNESS.QUARTERLY.observationMaxAgeDays,165);
  assert.equal(payload.rows.every(r=>earningsCompanionFreshness(r,{now:NOW}).status==='FRESH'),true);
});

test('zero is real, null is missing; no invented observation or released date',()=>{
  const payload=fixture(),r=payload.rows[1];
  r.value=0;r.history.at(-1).value=0;r.change=-r.previousValue;
  assert.equal(validateEarningsCompanionPayload(payload,{now:NOW}),payload);
  r.value=null;r.history.at(-1).value=null;r.change=null;r.status='PARTIAL';
  r.unavailableReason='LATEST_OBSERVATION_MISSING';
  r.historyCoverage.actualPoints=4;r.historyCoverage.complete=false;
  payload.status='PARTIAL';payload.coverage.ready=1;payload.coverage.partial=1;
  assert.equal(validateEarningsCompanionPayload(payload,{now:NOW}),payload);
  r.releaseDate='2026-10-27';
  assert.throws(()=>validateEarningsCompanionPayload(payload,{now:NOW}),/INVALID_ROW/);
});

test('blocks secret fields, duplicate IDs, fabricated history, future stored source, false checkpoint',()=>{
  let p=fixture();p.blsApiKey='SECRET';
  assert.throws(()=>validateEarningsCompanionPayload(p,{now:NOW}),/INVALID_PAYLOAD/);
  p=fixture();p.rows[1].indicatorId=p.rows[0].indicatorId;
  assert.throws(()=>validateEarningsCompanionPayload(p,{now:NOW}),/INVALID_ROW/);
  p=fixture();p.rows[0].history[0].period='2025-08';
  assert.throws(()=>validateEarningsCompanionPayload(p,{now:NOW}),/INVALID_HISTORY/);
  p=fixture();p.sourceStoredAt=NOW+1000;
  assert.throws(()=>validateEarningsCompanionPayload(p,{now:NOW}),/INVALID_META/);
  p=fixture();p.rows[0].retrievedAt=new Date(NOW+1000).toISOString();
  assert.throws(()=>validateEarningsCompanionPayload(p,{now:NOW}),/INVALID_ROW/);
});

test('reader GET/HEAD: only separate D1 key, no remote write or provider access',async()=>{
  const db=d1();
  let res=await readEarningsCompanionResponse(request(),db,{now:NOW});
  assert.equal(res.status,503);assert.equal((await res.json()).reason,'STORED_PROJECTION_PENDING');
  assert.equal((await readEarningsCompanionResponse(request('GET','?asOf=2026-10-27'),db,{now:NOW})).status,400);
  assert.equal((await readEarningsCompanionResponse(request('POST'),db,{now:NOW})).status,405);
  const w=await earningsCompanionWriter(db).write(fixture(),{storedAt:NOW-1000});
  assert.equal(w.status,'READBACK_VERIFIED');
  res=await readEarningsCompanionResponse(request(),db,{now:NOW});
  assert.equal(res.status,200);const body=await res.json();
  assert.equal(body.status,'READY');assert.equal(body.rows.length,2);
  assert.equal(body.historicalMode,'CURRENT_RETRIEVAL_NOT_PIT');
  const head=await readEarningsCompanionResponse(request('HEAD'),db,{now:NOW});
  assert.equal(head.status,200);assert.equal(await head.text(),'');
  assert.equal(db.queries.filter(q=>q.kind==='WRITE').length,1);
  assert.ok(db.queries.every(q=>q.params[0]===EARNINGS_C_SNAPSHOT_KEY));
});

test('freshness per period: stale quarterly does not erase valid monthly',async()=>{
  const p=fixture({quarterPeriods:['2025-Q1','2025-Q2','2025-Q3','2025-Q4','2026-Q1']});
  const db=d1();await earningsCompanionWriter(db).write(p,{storedAt:NOW-1000});
  const res=await readEarningsCompanionResponse(request(),db,{now:NOW});
  assert.equal(res.status,200);const body=await res.json();
  assert.equal(body.status,'PARTIAL');assert.equal(body.coverage.ready,1);
  assert.equal(body.coverage.stale,1);
  assert.equal(body.rows[1].status,'STALE');
  assert.equal(body.rows[1].freshness.reason,'OBSERVATION_EXPIRED');
  assert.equal(body.rows[0].status,'READY');
});

test('freshness ignores a newly rewritten D1 stored_at when source observations are old',async()=>{
  const db=d1(),p=fixture(),future=Date.parse('2027-02-01T10:00:00.000Z');
  const envelope={payload:p,projection:{status:'READY',builtAt:future-100,
    sourceStoredAt:p.sourceStoredAt,sourceVersion:p.sourceVersion,
    expectedSourceStoredAt:p.sourceStoredAt,expectedSourceVersion:p.sourceVersion}};
  db.records.set(EARNINGS_C_SNAPSHOT_KEY,{body:JSON.stringify(envelope),stored_at:future-100});
  const res=await readEarningsCompanionResponse(request(),db,{now:future});
  assert.equal(res.status,503);
  assert.equal((await res.json()).reason,'STORED_PROJECTION_STALE');
});

test('snapshot version ordering: duplicate no-op, same-time conflict, older reject',async()=>{
  const db=d1(),pub=earningsCompanionWriter(db),p=fixture();
  const first=await pub.write(p,{storedAt:NOW-1000});
  assert.equal(first.status,'READBACK_VERIFIED');
  const same=await pub.write(p,{storedAt:NOW-500});
  assert.equal(same.status,'ALREADY_STORED');
  assert.equal(db.queries.filter(q=>q.kind==='WRITE').length,1);
  const conflicting=clone(p);conflicting.sourceVersion='b'.repeat(64);
  await assert.rejects(pub.write(conflicting,{storedAt:NOW-100}),/CONFLICTING_VERSION/);
  const older=clone(p);older.sourceStoredAt-=1000;
  await assert.rejects(pub.write(older,{storedAt:NOW-100}),/SUPERSEDED/);
});

test('invalid readback is not a publication PASS, snapshot corruption returns 503',async()=>{
  const db=d1(),p=fixture();
  const orig=db.prepare.bind(db);
  let readings=0;
  db.prepare=sql=>{const s=orig(sql);return {
    bind(...args){const b=s.bind(...args);return {...b,async first(){readings++;
      const x=await b.first();return readings===2?{...x,stored_at:NOW+500}:x;
    }};}
  };};
  await assert.rejects(earningsCompanionWriter(db).write(p,{storedAt:NOW-1000}),/READBACK_MISMATCH/);
  const rawDb=d1();rawDb.records.set(EARNINGS_C_SNAPSHOT_KEY,{body:'{}',stored_at:NOW-10});
  const res=await readEarningsCompanionResponse(request(),rawDb,{now:NOW});
  assert.equal(res.status,503);assert.equal((await res.json()).reason,'STORED_PROJECTION_INVALID');
});
