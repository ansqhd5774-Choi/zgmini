import test from 'node:test';
import assert from 'node:assert/strict';
import {EMPLOYMENT_R4_CORE_STATES} from '../lib/market-score/employment-r4-shadow-contract.mjs';
import {
  DOL_ETA539_URL, parseEta539ShadowRows,
} from '../lib/market-score/employment-r4-shadow-provider.mjs';
import {
  createEmploymentR6Provider,parseDolNationalClaimsXml,
} from '../lib/market-score/employment-r6-provider.mjs';
import {runEmploymentR6CollectionStep} from '../lib/market-score/employment-r6-collector.mjs';
import {releasePlanForGroup,dolNationalSeriesFreshAtRelease} from '../lib/market-score/employment-r6-scheduler.mjs';

const now=()=>new Date('2026-11-15T00:00:00.000Z');
const nationalWeek=(date,{iur=true}={})=>
  '<week><weekEnded>'+date+'</weekEnded>'+
  '<InitialClaims><SA>189000</SA><SA4WK>195000</SA4WK></InitialClaims>'+
  '<ContinuedClaims><SA>1900000</SA></ContinuedClaims>'+
  (iur?'<IUR><SA>1.2</SA></IUR>':'')+'</week>';
const officialNationalXml=weeks=>'<r539cyNational>'+weeks+'</r539cyNational>';
const stateCsv=['st,rptdate,c2,c3',...EMPLOYMENT_R4_CORE_STATES.map(
  st=>st+',11/13/2026,10/24/2026,300',
)].join('\n');

test('W04 DOL national parser rejects impossible weeks instead of inventing observations',()=>{
 for(const invalid of ['02/30/2026','02/29/2026','04/31/2026',
   '00/15/2026','13/01/2026','12/00/2026','02/29/1899']){
  const rows=parseDolNationalClaimsXml(nationalWeek(invalid),{
   retrievedAt:'2026-11-15T00:00:00.000Z',
  });
  assert.deepEqual(rows,[],invalid);
 }
 for(const valid of [['02/29/2024','2024-02-29'],['12/31/2026','2026-12-31']]){
  const rows=parseDolNationalClaimsXml(nationalWeek(valid[0]),{
   retrievedAt:'2026-11-15T00:00:00.000Z',
  });
  assert.equal(rows.length,4,valid[0]);
  assert.ok(rows.every(r=>r.observationDate===valid[1]),valid[0]);
 }
});

test('W04 3/4 national series cannot write unarchived national observations; 600w states survive',async()=>{
 let fetchedCount=0;
 const provider=createEmploymentR6Provider({
  now,fetchImpl:async(url)=>{
   fetchedCount++;
   return String(url)===DOL_ETA539_URL
    ?new Response(stateCsv,{status:200})
    :new Response(officialNationalXml(nationalWeek('10/31/2026',{iur:false})),{status:200});
  },
 });
 const fetched=await provider.fetchDolClaims({mode:'BACKFILL',currentYear:2026});
 assert.equal(fetchedCount,2,'no extra retries or requests');
 assert.equal(fetched.requestCount,2);
 assert.equal(fetched.partialFailureCode,'DOL_NATIONAL_SERIES_INCOMPLETE');
 assert.deepEqual(fetched.missingSeries,[
  'INITIAL_CLAIMS','INITIAL_CLAIMS_4W','CONTINUED_CLAIMS',
  'INSURED_UNEMPLOYMENT_RATE']);
 assert.equal(fetched.rows.length,51,'quarantine 3 unarchived national; keep 51 validated states');
 const nationalRows=fetched.rows.filter(r=>r.geographyType==='NATIONAL');
 assert.equal(nationalRows.length,0,'unarchived national rows must not enter the ledger');
 assert.equal(fetched.rows.filter(r=>r.geographyType==='STATE').length,51);
 assert.equal(fetched.snapshots.length,1,'partial national raw cannot replace complete archive');
 assert.equal(fetched.nationalResponseEvidence.responseFormat,'NATIONAL_XML');
 assert.equal(fetched.nationalResponseEvidence.parsedNationalSeriesCount,3);
 assert.equal(fetched.nationalResponseEvidence.latestNationalObservationDate,'2026-10-31');
 assert.match(fetched.nationalResponseEvidence.bodySha256,/^[a-f0-9]{64}$/);
 assert.ok(fetched.snapshots.every(s=>!s.requestKey.startsWith('DOL_NATIONAL:')));
 assert.equal(fetched.snapshots[0].requestKey,'DOL_ETA539:600w');
 assert.equal(fetched.snapshots[0].detail.historyWeeks,600);
 const written=[],runs=[],snapshots=[];
 const store={
  async initialize(){},async getLatestRunInMode(){return null;},
  async acquire(){return {acquired:true};},async release(){},
  async writeRawSnapshot(snapshot){snapshots.push(snapshot);return {
   snapshotId:1,bodySha256:'mocked',chunkCount:1,noop:false,
  };},
  async upsertObservationRows({rows}){written.push(...rows);return {
   inserted:rows.length,revised:0,noop:0,rejected:0,changedSeriesIds:[],
  };},
  async recordRun(run){runs.push(run);return 1;},
 };
 const result=await runEmploymentR6CollectionStep({
  db:{prepare(){return {};}},mode:'BACKFILL',now,
  groups:['DOL_UI_WEEKLY_CLAIMS'],storeFactory:()=>store,
  providerFactory:()=>({async fetchGroup(){return fetched;}}),
 });
 assert.equal(result.status,'PARTIAL');
 assert.equal(result.groupResults[0].failureCode,'DOL_NATIONAL_SERIES_INCOMPLETE');
 assert.equal(runs[0].failureCode,'DOL_NATIONAL_SERIES_INCOMPLETE');
 assert.equal(runs[0].detail.backfillWindowVersion,'DOL_ETA539_600_WEEKS_V1');
 assert.deepEqual(runs[0].detail.nationalResponseEvidence,fetched.nationalResponseEvidence);
 assert.equal(written.length,51);
 assert.equal(snapshots.length,1);
 assert.equal(result.publicOutput,false);
});

test('W04 complete national 4-series retains raw archive and 51-region 600w path',async()=>{
 let count=0;
 const provider=createEmploymentR6Provider({now,fetchImpl:async(url)=>{
  count++;return String(url)===DOL_ETA539_URL
   ?new Response(stateCsv,{status:200})
   :new Response(officialNationalXml(nationalWeek('10/31/2026')),{status:200});
 }});
 const x=await provider.fetchDolClaims({mode:'BACKFILL',currentYear:2026});
 assert.equal(count,2);
 assert.equal(x.rows.length,55);
 assert.deepEqual(x.missingSeries,[]);
 assert.equal(x.partialFailureCode,undefined);
 assert.equal(x.snapshots.length,2);
 assert.equal(x.nationalResponseEvidence.parsedNationalSeriesCount,4);
 assert.equal(x.nationalResponseEvidence.responseFormat,'NATIONAL_XML');
 assert.match(x.snapshots[0].requestKey,/^DOL_NATIONAL:/);
 assert.equal(x.snapshots[1].requestKey,'DOL_ETA539:600w');
 const values=x.rows.filter(r=>r.geographyType==='NATIONAL');
 assert.deepEqual(values.map(r=>r.logicalSeriesId),[
  'INITIAL_CLAIMS','INITIAL_CLAIMS_4W','CONTINUED_CLAIMS',
  'INSURED_UNEMPLOYMENT_RATE']);
});

test('W04 failed national HTTP 200 classified without persisting provider error text',async()=>{
 const bad='Unable to connect! SQLSTATE=HY000 private-response-must-not-leak';
 const provider=createEmploymentR6Provider({now,fetchImpl:async(url)=>
  String(url)===DOL_ETA539_URL
   ?new Response(stateCsv,{status:200,headers:{'content-type':'text/csv'}})
   :new Response(bad,{status:200,headers:{'content-type':'text/plain; charset=utf-8'}}),
 });
 const fetched=await provider.fetchDolClaims({mode:'RELEASE',currentYear:2026});
 assert.equal(fetched.rows.length,51);
 assert.equal(fetched.snapshots.length,1,'do not archive invalid national body');
 assert.equal(fetched.partialFailureCode,'DOL_NATIONAL_NO_VALID_ROWS');
 assert.deepEqual(fetched.nationalResponseEvidence && {
  status:fetched.nationalResponseEvidence.httpStatus,
  type:fetched.nationalResponseEvidence.contentTypeCategory,
  format:fetched.nationalResponseEvidence.responseFormat,
  parsed:fetched.nationalResponseEvidence.parsedNationalSeriesCount,
  last:fetched.nationalResponseEvidence.latestNationalObservationDate,
 },{status:200,type:'text/plain',format:'TEXT',parsed:0,last:null});
 assert.match(fetched.nationalResponseEvidence.bodySha256,/^[a-f0-9]{64}$/);
 assert.equal(fetched.nationalResponseEvidence.bodyCharLength,bad.length);
 assert.ok(!JSON.stringify(fetched.nationalResponseEvidence).includes('private-response-must-not-leak'));
});

test('W04 national mixed-week release retains latest availableAt per separate series',()=>{
  const retrievedAt='2026-11-15T00:00:00.000Z';
  const releaseAt='2026-11-12T13:30:00.000Z';
  // Synthetic official weekly release shape: initial claims refers to a newer
  // week, while continued claims and IUR refer to the prior reporting week.
  const newer='<week><weekEnded>11/07/2026</weekEnded>'+
    '<InitialClaims><SA>200000</SA><SA4WK>195250</SA4WK></InitialClaims></week>';
  const rows=parseDolNationalClaimsXml(nationalWeek('10/31/2026')+newer,{
    retrievedAt,releaseAt,
  });
  assert.equal(rows.length,6,'two weeks of initial/4W, one of continued/IUR');
  const expected=new Map([
    ['INITIAL_CLAIMS','2026-11-07'],
    ['INITIAL_CLAIMS_4W','2026-11-07'],
    ['CONTINUED_CLAIMS','2026-10-31'],
    ['INSURED_UNEMPLOYMENT_RATE','2026-10-31'],
  ]);
  for(const [seriesId,expectedDate] of expected){
    const group=rows.filter(row=>row.logicalSeriesId===seriesId);
    const newest=group.filter(row=>row.availableAt===retrievedAt);
    assert.equal(newest.length,1,seriesId+' latest source availability');
    assert.equal(newest[0].observationDate,expectedDate);
    assert.equal(newest[0].releaseDate,releaseAt);
    assert.equal(newest[0].qualityStatus,'READY_FORWARD');
    for(const historical of group.filter(row=>row.observationDate!==expectedDate)){
      assert.equal(historical.availableAt,null);
      assert.equal(historical.releaseDate,null);
      assert.equal(historical.qualityStatus,'READY_CURRENT_OR_REVISED');
    }
  }
  assert.equal(rows.filter(row=>row.availableAt===retrievedAt).length,4,
    'all four newest distinct series must be available as of same release');
});

test('W04 national transport failure preserves 51-state source without exposing provider body',async()=>{
  const calls=[];
  const provider=createEmploymentR6Provider({now,fetchImpl:async url=>{
    calls.push(String(url));
    return String(url)===DOL_ETA539_URL
      ? new Response(stateCsv,{status:200,headers:{'content-type':'text/csv'}})
      : new Response('PRIVATE_DOL_HTTP_503_BODY_MUST_NOT_LEAK',{
          status:503,headers:{'content-type':'text/html'},
        });
  }});
  const fetched=await provider.fetchDolClaims({mode:'BACKFILL',currentYear:2026});
  assert.equal(calls.length,2,'one National POST and one ETA539 GET; no retry');
  assert.equal(fetched.requestCount,2);
  assert.equal(fetched.partialFailureCode,'DOL_NATIONAL_HTTP_FAILED');
  assert.equal(fetched.rows.length,51);
  assert.ok(fetched.rows.every(row=>row.geographyType==='STATE'));
  assert.deepEqual(fetched.missingSeries,[
    'INITIAL_CLAIMS','INITIAL_CLAIMS_4W','CONTINUED_CLAIMS',
    'INSURED_UNEMPLOYMENT_RATE',
  ]);
  assert.equal(fetched.snapshots.length,1);
  assert.equal(fetched.snapshots[0].requestKey,'DOL_ETA539:600w');
  assert.deepEqual(fetched.nationalResponseEvidence,{
    httpStatus:503,contentTypeCategory:'MISSING',responseFormat:'UNAVAILABLE',
    bodySha256:null,bodyCharLength:null,requestFailureCode:'DOL_NATIONAL_HTTP_FAILED',
    parsedNationalSeriesCount:0,latestNationalObservationDate:null,
  });
  assert.ok(!JSON.stringify(fetched).includes('PRIVATE_DOL_HTTP_503_BODY_MUST_NOT_LEAK'));
  const runs=[];
  const store={
    async initialize(){},async getLatestRunInMode(){return null;},
    async acquire(){return {acquired:true};},async release(){},
    async writeRawSnapshot(){return {snapshotId:1,bodySha256:'safe',chunkCount:1,noop:false};},
    async upsertObservationRows({rows}){return {inserted:rows.length,revised:0,noop:0,rejected:0};},
    async recordRun(run){runs.push(run);return 1;},
  };
  const output=await runEmploymentR6CollectionStep({
    db:{prepare(){return {};}},mode:'BACKFILL',now,
    groups:['DOL_UI_WEEKLY_CLAIMS'],storeFactory:()=>store,
    providerFactory:()=>({async fetchGroup(){return fetched;}}),
  });
  assert.equal(output.status,'PARTIAL');
  assert.equal(output.groupResults[0].failureCode,'DOL_NATIONAL_HTTP_FAILED');
  assert.equal(runs[0].failureCode,'DOL_NATIONAL_HTTP_FAILED');
  assert.equal(runs[0].detail.nationalResponseEvidence.httpStatus,503);
  assert.equal(runs[0].collectedRows,51);
  assert.equal(output.publicOutput,false);
});

test('W04 National network failure still performs independent ETA539 read once',async()=>{
  let calls=0;
  const provider=createEmploymentR6Provider({now,fetchImpl:async url=>{
    calls++;
    if(String(url)!==DOL_ETA539_URL)throw new Error('PRIVATE_PROVIDER_TOKEN_NETWORK_MESSAGE');
    return new Response(stateCsv,{status:200});
  }});
  const fetched=await provider.fetchDolClaims({mode:'BACKFILL',currentYear:2026});
  assert.equal(calls,2);
  assert.equal(fetched.requestCount,2);
  assert.equal(fetched.partialFailureCode,'DOL_NATIONAL_REQUEST_FAILED');
  assert.equal(fetched.rows.length,51);
  assert.equal(fetched.snapshots.length,1);
  assert.equal(fetched.nationalResponseEvidence.httpStatus,null);
  assert.equal(fetched.nationalResponseEvidence.requestFailureCode,'DOL_NATIONAL_REQUEST_FAILED');
  assert.ok(!JSON.stringify(fetched).includes('PRIVATE_PROVIDER_TOKEN_NETWORK_MESSAGE'));
});


test('W04 bounded National transport short-circuits a stalled HTTP 503 body and preserves ETA539',async()=>{
  let calls=0;
  const stuckBody=new ReadableStream({start(){}});
  const provider=createEmploymentR6Provider({
    now, dolResponseTimeoutMs:150,
    fetchImpl:async url=>{
      calls++;
      return String(url)===DOL_ETA539_URL
        ?new Response(stateCsv,{status:200})
        :new Response(stuckBody,{status:503});
    },
  });
  const data=await provider.fetchDolClaims({mode:'BACKFILL',currentYear:2026});
  assert.equal(calls,2);
  assert.equal(data.partialFailureCode,'DOL_NATIONAL_HTTP_FAILED');
  assert.equal(data.nationalResponseEvidence.httpStatus,503);
  assert.equal(data.rows.length,51);
  assert.equal(data.snapshots.length,1);
});

test('W04 stalled National transport cannot block the independent ETA539 request',async()=>{
  let calls=0;
  const provider=createEmploymentR6Provider({
    now,dolResponseTimeoutMs:60,
    fetchImpl:async (url,options)=>{
      calls++;
      if(String(url)===DOL_ETA539_URL)return new Response(stateCsv,{status:200});
      return new Promise((_,reject)=>{
        options.signal.addEventListener('abort',()=>reject(new Error('PRIVATE_TRANSPORT_ABORT')),{once:true});
      });
    },
  });
  const data=await provider.fetchDolClaims({mode:'BACKFILL',currentYear:2026});
  assert.equal(calls,2);
  assert.equal(data.partialFailureCode,'DOL_NATIONAL_REQUEST_FAILED');
  assert.equal(data.rows.length,51);
  assert.equal(data.snapshots.length,1);
  assert.ok(!JSON.stringify(data).includes('PRIVATE_TRANSPORT_ABORT'));
});

test('W04 bounded National body aborts when a 200 response never completes',async()=>{
  let calls=0;
  const stalled={
    ok:true,status:200,headers:{get:()=>null},
    body:{getReader:()=>({read:()=>new Promise(()=>{}),cancel:async()=>{}})},
  };
  const provider=createEmploymentR6Provider({
    now,dolResponseTimeoutMs:60,
    fetchImpl:async url=>{
      calls++;
      return String(url)===DOL_ETA539_URL
        ?new Response(stateCsv,{status:200}) :stalled;
    },
  });
  const data=await provider.fetchDolClaims({mode:'BACKFILL',currentYear:2026});
  assert.equal(calls,2);
  assert.equal(data.partialFailureCode,'DOL_NATIONAL_REQUEST_FAILED');
  assert.equal(data.rows.length,51);
});

test('W04 oversized National body is quarantined without rejecting a valid 51-state response',async()=>{
  let calls=0;
  const provider=createEmploymentR6Provider({
    now,dolResponseMaxBytes:3500,
    fetchImpl:async url=>{
      calls++;
      return String(url)===DOL_ETA539_URL
        ?new Response(stateCsv,{status:200})
        :new Response('x'.repeat(6000),{status:200});
    },
  });
  const data=await provider.fetchDolClaims({mode:'BACKFILL',currentYear:2026});
  assert.equal(calls,2);
  assert.equal(data.partialFailureCode,'DOL_NATIONAL_REQUEST_FAILED');
  assert.equal(data.rows.length,51);
  assert.equal(data.snapshots.length,1);
});

test('W04 nonofficial National root and invalid official values cannot enter National raw',async()=>{
  const invalid=[
    {xml:'<error>'+nationalWeek('10/31/2026')+'</error>',code:'DOL_NATIONAL_NO_VALID_ROWS'},
    {xml:officialNationalXml(nationalWeek('11/21/2026')),code:'DOL_NATIONAL_INVALID_DATA'},
    {xml:officialNationalXml(nationalWeek('10/31/2026').replace('<SA>189000</SA>','<SA>-5</SA>')),code:'DOL_NATIONAL_INVALID_DATA'},
    {xml:officialNationalXml(nationalWeek('10/31/2026')
      +nationalWeek('10/31/2026').replace('<SA>189000</SA>','<SA>189001</SA>')),code:'DOL_NATIONAL_INVALID_DATA'},
  ];
  for(const scenario of invalid){
    let calls=0;
    const provider=createEmploymentR6Provider({
      now,fetchImpl:async url=>{
        calls++;
        return String(url)===DOL_ETA539_URL
          ?new Response(stateCsv,{status:200})
          :new Response(scenario.xml,{status:200});
      },
    });
    const data=await provider.fetchDolClaims({mode:'BACKFILL',currentYear:2026});
    assert.equal(calls,2);
    assert.equal(data.partialFailureCode,scenario.code);
    assert.equal(data.rows.filter(x=>x.geographyType==='NATIONAL').length,0);
    assert.equal(data.snapshots.length,1);
    assert.equal(data.rows.length,51);
  }
});

test('W04 National freshness agrees for Collector and Scheduler across all four weekly series',()=>{
  const releaseAt='2026-11-12T13:30:00.000Z';
  const normal={
    INITIAL_CLAIMS:'2026-11-07',INITIAL_CLAIMS_4W:'2026-11-07',
    CONTINUED_CLAIMS:'2026-10-31',INSURED_UNEMPLOYMENT_RATE:'2026-10-31',
  };
  assert.equal(dolNationalSeriesFreshAtRelease(normal,releaseAt),true);
  assert.equal(dolNationalSeriesFreshAtRelease({...normal,CONTINUED_CLAIMS:'2026-09-05'},releaseAt),false);
  assert.equal(dolNationalSeriesFreshAtRelease({...normal,INSURED_UNEMPLOYMENT_RATE:null},releaseAt),false);
  const row=values=>({
    status:'SUCCESS',completed_at:'2026-11-12T19:30:00.000Z',
    detail_json:JSON.stringify({releaseAt,latestNationalSeriesObservationDates:values}),
  });
  const duePlan=latestRun=>releasePlanForGroup('DOL_UI_WEEKLY_CLAIMS',{
    now:new Date('2026-11-13T20:00:00.000Z'),latestRun,
  });
  assert.equal(duePlan(row(normal)).status,'RELEASE_ALREADY_STORED');
  assert.equal(duePlan(row({...normal,CONTINUED_CLAIMS:'2026-09-05'})).status,'DUE');
  assert.equal(duePlan({status:'SUCCESS',completed_at:'2026-11-12T19:30:00.000Z',
    detail_json:JSON.stringify({releaseAt,latestInitialClaimsObservationDate:'2026-11-07'})}).status,'DUE');
});

test('W04 simultaneous National and ETA failures report the original HTTP failure code',async()=>{
  const provider=createEmploymentR6Provider({now,fetchImpl:async()=>new Response('',{status:503})});
  const data=await provider.fetchDolClaims({mode:'BACKFILL',currentYear:2026});
  const runs=[];
  const store={
    async initialize(){},async getLatestRunInMode(){return null;},
    async acquire(){return {acquired:true};},async release(){},
    async writeRawSnapshot(){throw Error('NO_RAW_EXPECTED');},
    async upsertObservationRows({rows}){assert.deepEqual(rows,[]);return {inserted:0,revised:0,noop:0,rejected:0};},
    async recordRun(run){runs.push(run);return 1;},
  };
  const result=await runEmploymentR6CollectionStep({
    db:{prepare(){return {};}},mode:'BACKFILL',now,
    groups:['DOL_UI_WEEKLY_CLAIMS'],storeFactory:()=>store,
    providerFactory:()=>({async fetchGroup(){return data;}}),
  });
  assert.equal(result.status,'PARTIAL');
  assert.equal(result.groupResults[0].failureCode,'DOL_NATIONAL_HTTP_FAILED');
  assert.equal(runs[0].failureCode,'DOL_NATIONAL_HTTP_FAILED');
});
