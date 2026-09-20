import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  collectDiagnosticLiveInputs,
  createDiagnosticV1CanaryHandler,
  DIAGNOSTIC_V1_CANARY_CONTRACT,
  summarizeDiagnosticCanary,
} from '../worker/diagnostic-v1-canary.mjs';

const env = {
  FRED_API_KEY: 'TEST_FRED_KEY',
  KFG_V2_CANARY_OPERATOR_EMAIL: 'owner@example.com',
};

const authOwner = async () => ({userId:'owner-1',email:'owner@example.com'});

test('temporary canary contract changes no public route and reuses existing operator binding', () => {
  assert.equal(DIAGNOSTIC_V1_CANARY_CONTRACT.publicContractChanged,false);
  assert.equal(DIAGNOSTIC_V1_CANARY_CONTRACT.operatorEnv,'KFG_V2_CANARY_OPERATOR_EMAIL');
  assert.equal(DIAGNOSTIC_V1_CANARY_CONTRACT.method,'POST');
});

test('collector requests every registered FRED series and wires official external providers', async () => {
  const seenFred=[];
  const mockRows=[{observationDate:'2026-01-01',value:1}];
  const adapters={
    fetchFred:async seriesId => {
      seenFred.push(seriesId);
      return {seriesId,status:'READY_CURRENT_VINTAGE',rows:mockRows};
    },
    fetchOfr:async mnemonic => ({mnemonic,status:'READY_CURRENT_VINTAGE',rows:mockRows}),
    fetchCmdi:async () => ({
      status:'READY_CURRENT_VINTAGE_RAW',
      rows:[{observationDate:'2026-01-02',market:0.2,ig:0.3,hy:0.4}],
    }),
    fetchGscpi:async () => ({
      status:'READY_CURRENT_VINTAGE_RAW',
      rows:[{observationDate:'2026-01-01',value:-0.25}],
    }),
    fetchCopper:async () => ({
      status:'READY_CURRENT_VINTAGE_RAW',
      rows:[{observationDate:'2026-01-01',value:9000}],
    }),
    fetchBis:async dataset => ({
      dataset,
      status:'READY_CURRENT_VINTAGE_RAW',
      parsed:{dataset,series:[]},
    }),
  };
  const out=await collectDiagnosticLiveInputs({
    env,
    asOf:'2026-09-20',
    fetchImpl:async()=>{throw new Error('NETWORK_MUST_NOT_RUN_IN_TEST');},
    adapters,
  });
  assert.equal(seenFred.length,39);
  assert.equal(Object.keys(out.series).length,39);
  assert.equal(out.external.dvpRepoRows.length,1);
  assert.equal(out.external.triPartyRepoRows.length,1);
  assert.equal(out.external.cmdiRows.length,1);
  assert.equal(out.external.gscpiRows.length,1);
  assert.equal(out.external.copperRows.length,1);
  assert.equal(out.external.bisDsrParsed.dataset,'WS_DSR');
  assert.equal(out.external.bisDebtGdpParsed.dataset,'WS_TC');
  assert.equal(out.providerSummary.gscpi.status,'READY_CURRENT_VINTAGE_RAW');
  assert.equal(out.providerSummary.gscpi.latest,'2026-01-01');
  assert.equal(out.providerSummary.deferred.gscpiProductionFetch,undefined);
});

test('collector refuses to infer a missing FRED secret', async () => {
  await assert.rejects(
    collectDiagnosticLiveInputs({
      env:{KFG_V2_CANARY_OPERATOR_EMAIL:'owner@example.com'},
      asOf:'2026-09-20',
      adapters:{},
    }),
    /FRED_API_KEY_MISSING/,
  );
});

test('canary rejects unauthenticated requests before collection', async () => {
  let collected=false;
  const handler=createDiagnosticV1CanaryHandler({
    authenticate:async()=>null,
    env,
    collectInputs:async()=>{collected=true;throw new Error('SHOULD_NOT_RUN');},
  });
  const response=await handler(new Request('https://zgmini.kr/api/internal/diagnostic-v1-canary',{
    method:'POST',body:JSON.stringify({asOf:'2026-09-20',baseOverall:50}),
    headers:{'content-type':'application/json'},
  }));
  assert.equal(response.status,401);
  assert.equal(collected,false);
});

test('canary enforces the existing operator allowlist', async () => {
  const handler=createDiagnosticV1CanaryHandler({
    authenticate:async()=>({userId:'u',email:'other@example.com'}),
    env,
  });
  const response=await handler(new Request('https://zgmini.kr/api/internal/diagnostic-v1-canary',{
    method:'POST',body:JSON.stringify({asOf:'2026-09-20',baseOverall:50}),
    headers:{'content-type':'application/json'},
  }));
  assert.equal(response.status,403);
});

test('canary requires explicit asOf and Base Overall inputs', async () => {
  const handler=createDiagnosticV1CanaryHandler({authenticate:authOwner,env});
  const response=await handler(new Request('https://zgmini.kr/api/internal/diagnostic-v1-canary',{
    method:'POST',body:JSON.stringify({baseOverall:50}),
    headers:{'content-type':'application/json'},
  }));
  assert.equal(response.status,400);
  const body=await response.json();
  assert.equal(body.reason,'INVALID_AS_OF');
});

test('successful handler returns summary only and does not expose raw input series', async () => {
  const collectInputs=async()=>({
    series:{SECRET_SERIES:[{observationDate:'2026-01-01',value:123}]},
    external:{},
    providerSummary:{fred:{requested:39,ready:39,failed:[]}},
    requestCount:43,
  });
  const orchestrate=()=>({
    status:'PARTIAL',
    asOfDate:'2026-09-20',
    activeRevision:'DIAGNOSTIC_SCORE_TRANSFORM_R1',
    snapshot:{
      diagnostics:{
        inflationStability:{status:'READY',score:61,missing:[]},
        earningsRecessionDefense:{status:'PARTIAL',score:null,missing:['epsGrowth']},
      },
      overlay:{status:'PARTIAL',finalOverall:50,penalty:null},
    },
    partials:{earningsRecessionDefense:['epsGrowth']},
    limitations:{earningsHistoricalPointInTime:'PARTIAL'},
  });
  const handler=createDiagnosticV1CanaryHandler({
    authenticate:authOwner,env,collectInputs,orchestrate,
  });
  const response=await handler(new Request('https://zgmini.kr/api/internal/diagnostic-v1-canary',{
    method:'POST',
    body:JSON.stringify({asOf:'2026-09-20',baseOverall:50}),
    headers:{'content-type':'application/json'},
  }));
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.temporary,'TEMPORARY_DIAGNOSTIC_V1_CANARY_ONLY');
  assert.equal(body.status,'SUCCESS');
  assert.equal(body.requestCount,43);
  assert.equal(body.diagnostics.inflationStability.score,61);
  assert.equal(JSON.stringify(body).includes('SECRET_SERIES'),false);
  assert.equal(JSON.stringify(body).includes('123'),false);
});

test('summary preserves PARTIAL status and missing components', () => {
  const result={
    status:'PARTIAL',asOfDate:'2026-09-20',
    snapshot:{
      diagnostics:{
        assetBubbleSafety:{status:'PARTIAL',score:null,missing:['breadthDivergence']},
      },
      overlay:{status:'PARTIAL',finalOverall:55,penalty:null},
    },
    partials:{assetBubbleSafety:['breadthDivergence']},
    limitations:{assetBreadthPointInTime:'PARTIAL'},
  };
  const out=summarizeDiagnosticCanary(result,{requestCount:1,providerSummary:{}});
  assert.equal(out.diagnosticStatus,'PARTIAL');
  assert.equal(out.diagnostics.assetBubbleSafety.score,null);
  assert.deepEqual(out.diagnostics.assetBubbleSafety.missing,['breadthDivergence']);
  assert.equal(out.overlay.finalOverall,55);
});

test('route is a new internal-only owner and does not modify public market-data route', () => {
  const routeUrl=new URL('../app/api/internal/diagnostic-v1-canary/route.ts',import.meta.url);
  const source=fs.readFileSync(routeUrl,'utf8');
  assert.match(source,/TEMPORARY_DIAGNOSTIC_V1_CANARY_ONLY/);
  assert.match(source,/getChatGPTUser/);
  assert.match(source,/createDiagnosticV1CanaryHandler/);
  assert.doesNotMatch(source,/app\/api\/market-data/);
});
