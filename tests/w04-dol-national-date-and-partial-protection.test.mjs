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

const now=()=>new Date('2026-11-15T00:00:00.000Z');
const nationalWeek=(date,{iur=true}={})=>
  '<week><weekEnded>'+date+'</weekEnded>'+
  '<InitialClaims><SA>189000</SA><SA4WK>195000</SA4WK></InitialClaims>'+
  '<ContinuedClaims><SA>1900000</SA></ContinuedClaims>'+
  (iur?'<IUR><SA>1.2</SA></IUR>':'')+'</week>';
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

test('W04 3/4 national series cannot replace complete raw; 600w state rows and ledger survive',async()=>{
 let fetchedCount=0;
 const provider=createEmploymentR6Provider({
  now,fetchImpl:async(url)=>{
   fetchedCount++;
   return String(url)===DOL_ETA539_URL
    ?new Response(stateCsv,{status:200})
    :new Response(nationalWeek('10/31/2026',{iur:false}),{status:200});
  },
 });
 const fetched=await provider.fetchDolClaims({mode:'BACKFILL',currentYear:2026});
 assert.equal(fetchedCount,2,'no extra retries or requests');
 assert.equal(fetched.requestCount,2);
 assert.equal(fetched.partialFailureCode,'DOL_NATIONAL_SERIES_INCOMPLETE');
 assert.deepEqual(fetched.missingSeries,['INSURED_UNEMPLOYMENT_RATE']);
 assert.equal(fetched.rows.length,54,'3 valid national + 51 validated states');
 const nationalRows=fetched.rows.filter(r=>r.geographyType==='NATIONAL');
 assert.equal(nationalRows.length,3);
 assert.equal(fetched.rows.filter(r=>r.geographyType==='STATE').length,51);
 assert.equal(fetched.snapshots.length,1,'partial national raw cannot replace complete archive');
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
 assert.equal(written.length,54);
 assert.equal(snapshots.length,1);
 assert.equal(result.publicOutput,false);
});

test('W04 complete national 4-series retains raw archive and 51-region 600w path',async()=>{
 let count=0;
 const provider=createEmploymentR6Provider({now,fetchImpl:async(url)=>{
  count++;return String(url)===DOL_ETA539_URL
   ?new Response(stateCsv,{status:200})
   :new Response(nationalWeek('10/31/2026'),{status:200});
 }});
 const x=await provider.fetchDolClaims({mode:'BACKFILL',currentYear:2026});
 assert.equal(count,2);
 assert.equal(x.rows.length,55);
 assert.deepEqual(x.missingSeries,[]);
 assert.equal(x.partialFailureCode,undefined);
 assert.equal(x.snapshots.length,2);
 assert.match(x.snapshots[0].requestKey,/^DOL_NATIONAL:/);
 assert.equal(x.snapshots[1].requestKey,'DOL_ETA539:600w');
 const values=x.rows.filter(r=>r.geographyType==='NATIONAL');
 assert.deepEqual(values.map(r=>r.logicalSeriesId),[
  'INITIAL_CLAIMS','INITIAL_CLAIMS_4W','CONTINUED_CLAIMS',
  'INSURED_UNEMPLOYMENT_RATE']);
});
