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


// <!-- W04-NATIONAL-NULL-VS-TRUE-ZERO-20261119 -->
test('W04 DOL National absent SA values never become numeric zero',()=>{
 const xml='<r539cyNational><week source="r539cy"><weekEnded>11/07/2026</weekEnded>'+
  '<InitialClaims><SA></SA><SA4WK> </SA4WK></InitialClaims></week></r539cyNational>';
 const rows=parseDolNationalClaimsXml(xml,{retrievedAt:'2026-11-12T14:00:00.000Z'});
 assert.deepEqual(rows,[],'empty and whitespace fields are missing, not zero claims');
});

test('W04 DOL National explicit zero is valid and remains distinguishable from missing',()=>{
 const xml='<r539cyNational><week source="r539cy"><weekEnded>11/07/2026</weekEnded>'+
  '<InitialClaims><SA>0</SA><SA4WK>0</SA4WK></InitialClaims></week></r539cyNational>';
 const rows=parseDolNationalClaimsXml(xml,{retrievedAt:'2026-11-12T14:00:00.000Z'});
 assert.deepEqual(rows.map(row=>row.logicalSeriesId),['INITIAL_CLAIMS','INITIAL_CLAIMS_4W']);
 assert.deepEqual(rows.map(row=>row.value),[0,0]);
 assert.ok(rows.every(row=>row.availableAt==='2026-11-12T14:00:00.000Z'));
});

test('W04 3/4 valid national series persist with immutable official XML evidence; 600w states survive',async()=>{
 let calls=0;
 const provider=createEmploymentR6Provider({now,fetchImpl:async url=>{
  calls++;
  return String(url)===DOL_ETA539_URL
   ?new Response(stateCsv,{status:200})
   :new Response(officialNationalXml(nationalWeek('10/31/2026',{iur:false})),{status:200});
 }});
 const fetched=await provider.fetchDolClaims({mode:'BACKFILL',currentYear:2026});
 assert.equal(calls,2,'no extra provider calls');
 assert.equal(fetched.requestCount,2);
 assert.equal(fetched.partialFailureCode,'DOL_NATIONAL_SERIES_INCOMPLETE');
 assert.deepEqual(fetched.missingSeries,['INSURED_UNEMPLOYMENT_RATE']);
 assert.equal(fetched.rows.length,54);
 assert.equal(fetched.rows.filter(r=>r.geographyType==='STATE').length,51);
 const nationalRows=fetched.rows.filter(r=>r.geographyType==='NATIONAL');
 assert.deepEqual(nationalRows.map(r=>r.logicalSeriesId),[
  'INITIAL_CLAIMS','INITIAL_CLAIMS_4W','CONTINUED_CLAIMS',
 ]);
 assert.equal(fetched.snapshots.length,2,'partial official National XML has its own immutable source snapshot');
 assert.match(fetched.snapshots[0].requestKey,/^DOL_NATIONAL:/);
 assert.equal(fetched.snapshots[0].detail.coverage,'PARTIAL');
 assert.deepEqual(fetched.snapshots[0].detail.missingSeries,['INSURED_UNEMPLOYMENT_RATE']);
 assert.equal(fetched.snapshots[1].requestKey,'DOL_ETA539:600w');
 assert.ok(nationalRows.every(row=>row.provenance.responseHash===fetched.snapshots[0].detail.responseHash));
 assert.ok(nationalRows.every(row=>/^[a-f0-9]{64}$/.test(row.sourceHash)));
 assert.equal(fetched.nationalResponseEvidence.parsedNationalSeriesCount,3);
 const written=[],runs=[],snapshots=[];
 const store={
  async initialize(){},async getLatestRunInMode(){return null;},
  async acquire(){return {acquired:true};},async release(){return true;},
  async writeRawSnapshot(snapshot){snapshots.push(snapshot);return {
   snapshotId:snapshots.length,bodySha256:'mocked',chunkCount:1,noop:false,
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
 assert.equal(written.length,54,'valid National rows must reach the writer');
 assert.equal(snapshots.length,2);
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

test('W04 DOL official POST form fields and attributed National 4-series XML are parsed',async()=>{
 const requests=[];
 // This shape follows the DOL web report's National/XML form with one
 // provider week carrying the exact four documented series fields.
 const body='<?xml version="1.0" encoding="UTF-8"?>\n<!-- DOL public XML -->\n'+
  '<r539cyNational><week source="r539cy"><weekEnded>10/31/2026</weekEnded>'+
  '<InitialClaims><SA>189,000</SA><SA4WK>195,000</SA4WK></InitialClaims>'+
  '<ContinuedClaims><SA>1,900,000</SA></ContinuedClaims>'+
  '<IUR><SA>1.2</SA></IUR></week></r539cyNational>\n<!-- footer -->';
 const provider=createEmploymentR6Provider({now,fetchImpl:async(url,options)=>{
  requests.push({url:String(url),options});
  return String(url)===DOL_ETA539_URL
   ?new Response(stateCsv,{status:200})
   :new Response(body,{status:200,headers:{'content-type':'application/xml'}});
 }});
 const result=await provider.fetchDolClaims({mode:'ONE_YEAR',currentYear:2026});
 assert.equal(requests.length,2);
 const nationalReq=requests[0];
 assert.equal(nationalReq.url,'https://oui.doleta.gov/unemploy/wkclaims/report.asp');
 assert.equal(nationalReq.options.method,'POST');
 assert.equal(nationalReq.options.headers['content-type'],'application/x-www-form-urlencoded');
 const form=new URLSearchParams(nationalReq.options.body);
 assert.equal(form.get('level'),'us');
 assert.equal(form.get('strtdate'),'2025');
 assert.equal(form.get('enddate'),'2026');
 assert.equal(form.get('filetype'),'xml');
 assert.equal(form.get('final_yr'),'2026');
 assert.equal(requests[1].url,DOL_ETA539_URL);
 assert.deepEqual(result.rows.filter(r=>r.geographyType==='NATIONAL').map(r=>r.value),
  [189000,195000,1900000,1.2]);
 assert.equal(result.nationalResponseEvidence.responseFormat,'NATIONAL_XML');
 assert.equal(result.nationalResponseEvidence.parsedNationalSeriesCount,4);
 assert.equal(result.snapshots.length,2);
 assert.equal(result.partialFailureCode,undefined);
});

test('W04 DOL HTTP-200 Informix outage is a supplier error, not an XML parsing rejection',async()=>{
 const bad='Unable to connect! SQLSTATE=HY000, SQLDriverConnect: -25546 [Informix]Invalid ASF assoc_id. PRIVATE_PROVIDER_ERROR';
 const provider=createEmploymentR6Provider({now,fetchImpl:async(url)=>
  String(url)===DOL_ETA539_URL
   ?new Response(stateCsv,{status:200,headers:{'content-type':'text/csv'}})
   :new Response(bad,{status:200,headers:{'content-type':'text/plain; charset=utf-8'}}),
 });
 const fetched=await provider.fetchDolClaims({mode:'ONE_YEAR',currentYear:2026});
 assert.equal(fetched.rows.length,51);
 assert.equal(fetched.snapshots.length,1,'do not archive provider private error text');
 assert.equal(fetched.partialFailureCode,'DOL_NATIONAL_SOURCE_UNAVAILABLE');
 assert.deepEqual(fetched.missingSeries,[
  'INITIAL_CLAIMS','INITIAL_CLAIMS_4W','CONTINUED_CLAIMS','INSURED_UNEMPLOYMENT_RATE']);
 assert.equal(fetched.nationalResponseEvidence.httpStatus,200);
 assert.equal(fetched.nationalResponseEvidence.contentTypeCategory,'text/plain');
 assert.equal(fetched.nationalResponseEvidence.responseFormat,'SOURCE_UNAVAILABLE');
 assert.equal(fetched.nationalResponseEvidence.requestFailureCode,'DOL_NATIONAL_SOURCE_UNAVAILABLE');
 assert.equal(fetched.nationalResponseEvidence.parsedNationalSeriesCount,0);
 assert.match(fetched.nationalResponseEvidence.bodySha256,/^[a-f0-9]{64}$/);
 assert.ok(!JSON.stringify(fetched.nationalResponseEvidence).includes('PRIVATE_PROVIDER_ERROR'));
 const runs=[];
 const store={
  async initialize(){},async getLatestRunInMode(){return null;},async getLatestRun(){return null;},
  async acquire(){return {acquired:true};},async release(){return true;},
  async writeRawSnapshot(){return {snapshotId:1,bodySha256:'mock',chunkCount:1,noop:false};},
  async upsertObservationRows({rows}){return {inserted:rows.length,revised:0,noop:0,rejected:0};},
  async recordRun(run){runs.push(run);return 1;},
 };
 const output=await runEmploymentR6CollectionStep({
  db:{prepare(){return {};}},mode:'ONE_YEAR',now,
  groups:['DOL_UI_WEEKLY_CLAIMS'],storeFactory:()=>store,
  providerFactory:()=>({async fetchGroup(){return fetched;}}),
 });
 assert.equal(output.status,'PARTIAL');
 assert.equal(output.groupResults[0].failureCode,'DOL_NATIONAL_SOURCE_UNAVAILABLE');
 assert.equal(runs[0].failureCode,'DOL_NATIONAL_SOURCE_UNAVAILABLE');
 assert.equal(runs[0].detail.nationalResponseEvidence.responseFormat,'SOURCE_UNAVAILABLE');
 assert.equal(output.publicOutput,false);
});

test('W04 HTTP-200 HTML error remains distinct from valid National XML',async()=>{
 const provider=createEmploymentR6Provider({now,fetchImpl:async(url)=>
  String(url)===DOL_ETA539_URL
   ?new Response(stateCsv,{status:200})
   :new Response('<html><title>Service unavailable</title></html>',{status:200}),
 });
 const fetched=await provider.fetchDolClaims({mode:'ONE_YEAR',currentYear:2026});
 assert.equal(fetched.partialFailureCode,'DOL_NATIONAL_RESPONSE_FORMAT_UNSUPPORTED');
 assert.equal(fetched.nationalResponseEvidence.responseFormat,'HTML');
 assert.equal(fetched.snapshots.length,1);
 assert.equal(fetched.rows.filter(r=>r.geographyType==='STATE').length,51);
 assert.equal(fetched.rows.filter(r=>r.geographyType==='NATIONAL').length,0);
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

// A mixed producer response can superficially look complete (four older
// series) while attributed newer weeks are invisible to a legacy parser.
// Regression is source-only; it cannot identify the active Windows Core parser.
test('W04 mixed legacy and attributed National weeks retain newer series dates',()=>{
 const retrievedAt='2026-11-12T14:00:00.000Z',releaseAt='2026-11-12T13:30:00.000Z';
 const legacy=nationalWeek('10/17/2026');
 const continued='<week source="r539cy"><weekEnded>10/31/2026</weekEnded>'+
  '<ContinuedClaims><SA>1697000</SA></ContinuedClaims><IUR><SA>1.2</SA></IUR></week>';
 const initial='<week source="r539cy"><weekEnded>11/07/2026</weekEnded>'+
  '<InitialClaims><SA>200000</SA><SA4WK>195250</SA4WK></InitialClaims></week>';
 const rows=parseDolNationalClaimsXml(officialNationalXml(legacy+continued+initial),{
  retrievedAt,releaseAt,
 });
 assert.equal(rows.length,8,'legacy week plus two attributed weeks are all parsed');
 const newest=rows.filter(r=>r.availableAt===retrievedAt);
 assert.deepEqual(Object.fromEntries(newest.map(r=>[r.logicalSeriesId,r.observationDate])),{
  INITIAL_CLAIMS:'2026-11-07',INITIAL_CLAIMS_4W:'2026-11-07',
  CONTINUED_CLAIMS:'2026-10-31',INSURED_UNEMPLOYMENT_RATE:'2026-10-31',
 });
 assert.ok(newest.every(r=>r.releaseDate===releaseAt));
 const older=rows.filter(r=>r.observationDate==='2026-10-17');
 assert.equal(older.length,4,'old-style records remain usable as historical observations');
 assert.ok(older.every(r=>r.availableAt===null&&r.releaseDate===null));
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

test('W04 invalid official values isolate only the affected series; invalid root remains quarantined',async()=>{
 const baseline=nationalWeek('10/31/2026');
 const invalid=[
  {xml:'<error>'+baseline+'</error>',code:'DOL_NATIONAL_RESPONSE_FORMAT_UNSUPPORTED',valid:0,raw:0},
  {xml:officialNationalXml(nationalWeek('11/21/2026')),code:'DOL_NATIONAL_INVALID_DATA',valid:0,raw:0},
  {xml:officialNationalXml(baseline.replace('<SA>189000</SA>','<SA>-5</SA>')),
   code:'DOL_NATIONAL_INVALID_DATA',valid:3,raw:1},
  {xml:officialNationalXml(baseline+
    baseline.replace('<SA>189000</SA>','<SA>189001</SA>')),
   code:'DOL_NATIONAL_INVALID_DATA',valid:6,raw:1},
 ];
 for(const scenario of invalid){
  let calls=0;
  const provider=createEmploymentR6Provider({now,fetchImpl:async url=>{
   calls++;
   return String(url)===DOL_ETA539_URL
    ?new Response(stateCsv,{status:200})
    :new Response(scenario.xml,{status:200});
  }});
  const data=await provider.fetchDolClaims({mode:'BACKFILL',currentYear:2026});
  assert.equal(calls,2);
  assert.equal(data.partialFailureCode,scenario.code);
  const national=data.rows.filter(x=>x.geographyType==='NATIONAL');
  assert.equal(national.length,scenario.valid);
  assert.equal(data.snapshots.length,1+scenario.raw);
  assert.equal(data.rows.filter(x=>x.geographyType==='STATE').length,51);
  assert.ok(!national.some(x=>x.logicalSeriesId==='INITIAL_CLAIMS'),
   'reject a source series with conflicting/negative/future observations');
  if(national.length){
   assert.equal(data.snapshots[0].detail.coverage,'PARTIAL');
   assert.ok(national.every(x=>x.provenance.responseHash===data.snapshots[0].detail.responseHash));
   assert.ok(national.every(x=>Number.isFinite(x.value)&&x.value>=0));
   assert.deepEqual(data.missingSeries,['INITIAL_CLAIMS']);
  }
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
