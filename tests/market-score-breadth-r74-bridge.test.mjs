import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  projectBreadthR2FinalPublicDomain,
  buildBreadthR2UnavailablePublicDomain,
  assertBreadthR2PublicContract,
} from "../lib/market-score/breadth-r2-public-domain-r1.mjs";

import {marketDetailRows} from "../lib/market-score/detail-catalog.mjs";
import {buildCmR1DomainResults} from "../lib/market-score/domain-adapter-r1.mjs";
import {DOMAIN_WEIGHTS,buildCompositeMarketScore} from "../lib/market-score/composite-model-r1.mjs";
import {createMarketScoreR1Handler} from "../worker/market-score-r1.mjs";

function finalFixture(){
  return {
    methodologyVersion:"ZGMINI_BREADTH_R2_METHOD_R1",
    status:"READY",
    score:50.1925,
    state:"BUY_DOMINANT",
    interpretation:"매수 우위",
    runtime:{now:"2026-09-23T00:00:00.000Z",asOfDate:"2026-09-23"},
    secPeriodPolicy:{current:{frame:"CY2026Q2"}},
    sources:{
      bea:{status:"LIVE"},
      secPrevious:{status:"LIVE"},secCurrent:{status:"LIVE"},
      cftc:{status:"LIVE"},
    },
    candidate:{
      inputs:{foreignPortfolio:{sourceUnit:"USD",unitMult:6}},
      details:[
        {id:"breadth-37",observationDate:"2026Q1"},
        {id:"breadth-38",observationDate:null},
        {id:"breadth-39",observationDate:"2026-09-15"},
        {id:"breadth-40",observationDate:"2026-09-15"},
      ],
      indicators:[
        {id:"breadth-37",status:"READY",score:59.59,value:-1200},
        {id:"breadth-38",status:"READY",score:33.11,breadth:-0.3378},
        {id:"breadth-39",status:"READY",score:59.88,components:[{levelPct:10},{levelPct:20},{levelPct:30},{levelPct:19.04}]},
        {id:"breadth-40",status:"READY",score:48.19,components:[{levelPct:-10},{levelPct:2},{levelPct:3},{levelPct:-9.48}]},
      ],
    },
    missingFactors:[],
  };
}

test("final public contract exposes four stable details with score/raw/unit/date separately",()=>{
  const domain=projectBreadthR2FinalPublicDomain(finalFixture());
  assert.equal(assertBreadthR2PublicContract(domain),true);
  assert.equal(domain.status,"READY");
  assert.equal(domain.score,50.1925);
  assert.equal(domain.indicators.length,4);
  assert.deepEqual(domain.indicators.map(x=>x.id),["breadth-37","breadth-38","breadth-39","breadth-40"]);
  assert.equal(domain.indicators[0].value,-1200);
  assert.equal(domain.indicators[0].unit,"백만달러");
  assert.equal(domain.indicators[1].value,-33.78);
  assert.equal(domain.indicators[1].asOfDate,"CY2026Q2");
  assert.equal(domain.indicators[2].unit,"% OI");
  assert.equal(domain.indicators[2].asOfDate,"2026-09-15");
});

test("public detail catalog keeps negative raw and 0-100 score as different fields",()=>{
  const domain=projectBreadthR2FinalPublicDomain(finalFixture());
  const rows=marketDetailRows("breadth",domain.indicators);
  assert.equal(rows.length,4);
  assert.equal(rows[0].label,"해외 포트폴리오 주식수급");
  assert.equal(rows[0].score,59.59);
  assert.equal(rows[0].value,-1200);
  assert.equal(rows[0].raw,false);
  assert.equal(rows[1].value,-33.78);
});

test("partial Breadth-R2 remains null and never reweights Overall",()=>{
  const partial=buildBreadthR2UnavailablePublicDomain("FIXTURE_MISSING","2026-09-23T00:00:00Z");
  const domains=DOMAIN_WEIGHTS.map(spec=>({
    id:spec.id,status:"READY",score:50,missingFactors:[],trend:[],indicators:[]
  }));
  domains[domains.findIndex(x=>x.id==="breadth")]=partial;
  const out=buildCompositeMarketScore(domains);
  assert.equal(out.overall.status,"PARTIAL");
  assert.equal(out.overall.score,null);
  assert.equal(out.dataQuality.reweighted,false);
  assert.equal(out.dataQuality.coverageWeight,92);
});

test("CM-R1 preserves the 8% Breadth-R2 slot and final metadata",()=>{
  const breadth=projectBreadthR2FinalPublicDomain(finalFixture());
  const domain=buildCmR1DomainResults({publicDomains:{breadth}}).find(x=>x.id==="breadth");
  assert.equal(domain.name,"수급·폭");
  assert.equal(domain.score,50.1925);
  assert.equal(domain.methodologyVersion,"ZGMINI_BREADTH_R2_METHOD_R1");
  assert.equal(DOMAIN_WEIGHTS.find(x=>x.id==="breadth").weight,8);
});

test("worker authoritative Breadth-R2 collector overrides legacy external breadth",async()=>{
  const rows=(n=84,start=100)=>Array.from({length:n},(_,i)=>({
    observationDate:`${2019+Math.floor(i/12)}-${String(i%12+1).padStart(2,"0")}-01`,
    value:start+i,
  }));
  const collectInputs=async()=>({
    series:{
      UNRATE:rows(84,4).map((x,i)=>({...x,value:4+(i%5)*.1})),
      PAYEMS:rows(84,150000),
      DGS10:rows(320,3.5),
      DTWEXBGS:rows(320,100),
    },
    external:{
      registeredFundFlowRows:rows(24,.2),
      publicDomainScores:{breadth:{status:"READY",score:99}},
    },
  });
  const orchestrate=()=>({
    historyMode:"CURRENT_VINTAGE_ONLY",lookAheadSafe:false,
    snapshot:{diagnostics:{}},artifacts:{recession:{rows:[]},supply:{rows:[]}},limitations:{},
  });
  const r2=projectBreadthR2FinalPublicDomain(finalFixture());
  const handler=createMarketScoreR1Handler({
    env:{},collectInputs,orchestrate,
    collectBreadthDomain:async()=>r2,
    now:()=>new Date("2026-09-23T00:00:00.000Z"),
  });
  const response=await handler(new Request("https://zgmini.kr/api/market-score"));
  assert.equal(response.status,200);
  const body=await response.json();
  const breadth=body.domains.find(x=>x.id==="breadth");
  assert.equal(breadth.score,50.1925);
  assert.notEqual(breadth.score,99);
  assert.equal(breadth.indicators.length,4);
});

test("Breadth collector failure is isolated to PARTIAL instead of failing the whole API",async()=>{
  const collectInputs=async()=>({series:{},external:{registeredFundFlowRows:[],publicDomainScores:{}}});
  const orchestrate=()=>({snapshot:{diagnostics:{}},artifacts:{recession:{rows:[]},supply:{rows:[]}},limitations:{}});
  const handler=createMarketScoreR1Handler({
    env:{},collectInputs,orchestrate,
    collectBreadthDomain:async()=>{throw new Error("fixture");},
    now:()=>new Date("2026-09-23T00:00:00.000Z"),
  });
  const response=await handler(new Request("https://zgmini.kr/api/market-score"));
  assert.equal(response.status,200);
  const body=await response.json();
  const breadth=body.domains.find(x=>x.id==="breadth");
  assert.equal(breadth.status,"PARTIAL");
  assert.equal(breadth.score,null);
  assert.equal(body.dataQuality.reweighted,false);
});

test("dashboard source uses R2 explanation and visibly renders Breadth raw/date metadata",()=>{
  const source=fs.readFileSync(new URL("../app/dashboard-ui.tsx",import.meta.url),"utf8");
  assert.doesNotMatch(source,/Data by Equibles/);
  assert.match(source,/BEA 해외 포트폴리오 주식수급/);
  assert.match(source,/breadthMeta/);
  assert.match(source,/row\.asOfDate/);
});

// Source-bridge regression: preserve v213 non-breadth output byte-for-byte.
import {execFileSync} from 'node:child_process';
import {finalizeBreadthR2Candidate} from '../lib/market-score/breadth-r2-method-r1.mjs';

test('bridge preserves all other eleven domain outputs and detail rows',async()=>{
  const source=file=>execFileSync('git',['show',`af1d1795f54c575305688d04a6dbfe0e4cf5d616:${file}`],{encoding:'utf8'});
  const load=async text=>import(`data:text/javascript;base64,${Buffer.from(text).toString('base64')}`);
  const adapterText=source('lib/market-score/domain-adapter-r1.mjs').replace('"./breadth-top4.mjs"',JSON.stringify(new URL('../lib/market-score/breadth-top4.mjs',import.meta.url).href));
  const baselineAdapter=await load(adapterText);
  const baselineComposite=await load(source('lib/market-score/composite-model-r1.mjs'));
  const baselineCatalog=await load(source('lib/market-score/detail-catalog.mjs'));
  const input={rates:{status:'READY',score:0,indicators:[{name:'Fed 정책금리',status:'READY',score:null,value:null,currentRange:{lower:3.75,upper:4},displayValue:'3.75–4%',unit:'%'}]},publicDomains:{earnings:{status:'READY',score:61},breadth:projectBreadthR2FinalPublicDomain(finalFixture())}};
  const before=baselineComposite.buildCompositeMarketScore(baselineAdapter.buildCmR1DomainResults(input));
  const after=buildCompositeMarketScore(buildCmR1DomainResults(input));
  assert.deepEqual(after.domains.filter(x=>x.id!=='breadth'),before.domains.filter(x=>x.id!=='breadth'));
  for(const d of before.domains.filter(x=>x.id!=='breadth'))assert.deepEqual(marketDetailRows(d.id,d.indicators),baselineCatalog.marketDetailRows(d.id,d.indicators));
});

test('approved method retains valid zero and fails closed for every missing axis',()=>{
  const ids=['breadth-37','breadth-38','breadth-39','breadth-40'];
  const indicators=ids.map(id=>({id,status:'READY',score:0}));
  const zero=finalizeBreadthR2Candidate({indicators});
  assert.equal(zero.status,'READY');assert.equal(zero.score,0);
  assert.deepEqual(Object.values(zero.weights),[.25,.25,.25,.25]);
  for(const id of ids){const result=finalizeBreadthR2Candidate({indicators:indicators.map(x=>x.id===id?{...x,status:'PARTIAL',score:null}:x)});assert.equal(result.status,'PARTIAL');assert.equal(result.score,null);}
});
import {collectBreadthR2PublicDomainR1} from '../lib/market-score/breadth-r2-worker-domain-r1.mjs';
test('hosted BEA_API_KEY connects without changing secrets or exposing them',async()=>{
  for(const env of [{DB:{},BEA_API_KEY:'fixture'},{DB:{},BEA_USER_ID:' ',BEA_API_KEY:'fixture'},{DB:{},BEA_USER_ID:'fixture',BEA_API_KEY:'other'}]){
    let received;
    const domain=await collectBreadthR2PublicDomainR1({env,asOf:'2026-09-23',breadthServiceFactory:()=>({run:async args=>{received=args.beaUserId;return finalFixture();}})});
    assert.equal(received,'fixture');assert.equal(domain.status,'READY');assert.equal(JSON.stringify(domain).includes('fixture'),false);
  }
  const missing=await collectBreadthR2PublicDomainR1({env:{DB:{}},asOf:'2026-09-23'});assert.equal(missing.score,null);assert.ok(missing.missingFactors.includes('BREADTH_R2_PROVIDER_CONFIGURATION_MISSING'));
});
