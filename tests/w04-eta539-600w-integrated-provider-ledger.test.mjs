import test from 'node:test';
import assert from 'node:assert/strict';
import {EMPLOYMENT_R4_CORE_STATES} from '../lib/market-score/employment-r4-shadow-contract.mjs';
import {createEmploymentR6Provider} from '../lib/market-score/employment-r6-provider.mjs';
import {runEmploymentR6CollectionStep} from '../lib/market-score/employment-r6-collector.mjs';
import {DOL_ETA539_URL} from '../lib/market-score/employment-r4-shadow-provider.mjs';

// Synthetic official-layout rows only. The genuine 51-region/600-week provider
// proof already passed once in #1077, and must not be fetched again.
const now=()=>new Date('2026-11-14T08:00:00.000Z');
const national='<r539cyNational><week><weekEnded>10/31/2026</weekEnded>'
 +'<InitialClaims><SA>189000</SA><SA4WK>195000</SA4WK></InitialClaims>'
 +'<ContinuedClaims><SA>1900000</SA></ContinuedClaims>'
 +'<IUR><SA>1.2</SA></IUR></week></r539cyNational>';
const states=['st,rptdate,c2,c3',
 ...EMPLOYMENT_R4_CORE_STATES.map(st=>st+',11/13/2026,10/24/2026,120'),
 // Newer reflected week is incomplete because reported DC c3 is blank.
 ...EMPLOYMENT_R4_CORE_STATES.map(st=>st+',11/13/2026,10/31/2026,'+(st==='DC'?'':110)),
].join('\n');

test('W04 integrated ETA539 600w provider, missing c3, snapshot and backfill ledger',async()=>{
 const requests=[];
 const provider=createEmploymentR6Provider({
  now,fetchImpl:async(input,options={})=>{
   requests.push({url:String(input),method:options.method??'GET'});
   return String(input)===DOL_ETA539_URL
    ?new Response(states,{status:200,headers:{'content-type':'text/csv'}})
    :new Response(national,{status:200,headers:{'content-type':'application/xml'}});
  },
 });
 const fetched=await provider.fetchDolClaims({mode:'BACKFILL',currentYear:2026});
 assert.equal(fetched.requestCount,2);
 assert.equal(requests.length,2);
 assert.equal(requests.filter(r=>r.url===DOL_ETA539_URL&&r.method==='GET').length,1);
 const eta=fetched.snapshots.find(s=>s.requestKey==='DOL_ETA539:600w');
 assert.ok(eta,'provider must request 600 weeks');
 assert.equal(eta.detail.historyWeeks,600);
 assert.equal(eta.detail.parserMeta.coreCount,51);
 assert.equal(eta.detail.parserMeta.latestCompleteWeek,'2026-10-24');
 assert.deepEqual(eta.detail.parserMeta.selectedWeeks,['2026-10-24']);
 const stateRows=fetched.rows.filter(r=>r.logicalSeriesId==='STATE_INITIAL_CLAIMS');
 assert.equal(stateRows.length,51);
 assert.equal(stateRows.every(r=>r.observationDate==='2026-10-24'),true);
 assert.equal(fetched.missingSeries.length,0);
 assert.equal(fetched.rows.length,55);

 const runs=[],raws=[];
 const store={
  async initialize(){},async getLatestRunInMode(){return null;},
  async acquire(){return {acquired:true};},async release(){return true;},
  async writeRawSnapshot(snapshot){raws.push(snapshot);return {
   snapshotId:raws.length,bodySha256:'synthetic',chunkCount:1,noop:false,
  };},
  async upsertObservationRows({rows}){assert.equal(rows.length,55);return {
   inserted:55,revised:0,noop:0,rejected:0,changedSeriesIds:[],
  };},
  async recordRun(run){runs.push(run);return runs.length;},
 };
 const result=await runEmploymentR6CollectionStep({
  db:{prepare(){return {};}},
  now,mode:'BACKFILL',groups:['DOL_UI_WEEKLY_CLAIMS'],
  storeFactory:()=>store,
  providerFactory:()=>({async fetchGroup(){return fetched;}}),
 });
 assert.equal(result.status,'SUCCESS');
 assert.equal(result.publicOutput,false);
 assert.equal(runs.length,1);
 assert.equal(runs[0].detail.backfillWindowVersion,'DOL_ETA539_600_WEEKS_V1');
 assert.equal(runs[0].detail.scoreComputed,false);
 assert.equal(raws.length,2);
 assert.equal(requests.length,2,'collector must not refetch on recorded provider result');
});
