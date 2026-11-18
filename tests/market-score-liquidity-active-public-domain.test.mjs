import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLiquidityActivePublicDomainR1,
  selectLiquidityPublicDomainR1,
  LIQUIDITY_ACTIVE_UI_SEED_R1,
  buildLiquidityDiagnosticTrendR1,
} from "../lib/market-score/liquidity-active-public-domain-r1.mjs";

test("active liquidity public domain exposes exact four UI component scores and real trend",()=>{
  const diagnostic={
    snapshot:{
      diagnostics:{
        liquidityCrisisDefense:{status:"READY",score:61,missing:[]},
      },
      r1:{
        latest:{
          bankReserves:{observationDate:"2026-09-23",value:62},
          m2:{observationDate:"2026-08-01",value:55},
          tga:{observationDate:"2026-09-23",value:47},
          onRrp:{observationDate:"2026-09-26",value:71},
        },
      },
    },
  };
  const out=buildLiquidityActivePublicDomainR1({
    diagnostic,
    storedTrend:[{label:"2026-09-25",value:59}],
    asOfDate:"2026-09-28",
  });
  assert.equal(out.status,"READY");
  assert.equal(out.score,61);
  assert.deepEqual(out.indicators.map(x=>x.name),["은행 준비금","M2 증가율","TGA 변화","ON RRP 변화"]);
  assert.deepEqual(out.indicators.map(x=>x.score),[62,55,47,71]);
  assert.equal(out.trend.at(-1).label,"2026-09-28");
  assert.equal(out.trend.at(-1).value,61);
  assert.ok(out.trend.length>=LIQUIDITY_ACTIVE_UI_SEED_R1.length+2);
});


test("partial detailed liquidity is exposed when no explicit public producer exists",()=>{
  const detailed={status:"PARTIAL",score:null,missingFactors:["bondVolatility"],indicators:[{name:"은행 준비금",score:61}],trend:[{label:"2026-09-20",value:58.7}]};
  assert.equal(selectLiquidityPublicDomainR1(undefined,detailed),detailed);
});

test("existing explicit liquidity is preserved while detailed D3 is partial",()=>{
  const existing={status:"READY",score:49,indicators:[],trend:[]};
  const detailed={status:"PARTIAL",score:null,indicators:[{name:"은행 준비금",score:61}],trend:[{label:"2026-09-20",value:58.7}]};
  assert.equal(selectLiquidityPublicDomainR1(existing,detailed),existing);
});

test("READY detailed D3 remains authoritative over an explicit public fallback",()=>{
  const existing={status:"READY",score:49};
  const detailed={status:"READY",score:61,indicators:[],trend:[]};
  assert.equal(selectLiquidityPublicDomainR1(existing,detailed),detailed);
});


test("liquidity trend is reconstructed from stored component score histories with the same D3 weights",()=>{
  const rows=(values)=>values.map(([observationDate,score])=>({observationDate,score}));
  const r1={components:{
    fundingStress:{rows:rows([["2026-08-01",50],["2026-09-01",60]])},
    bankReserves:{rows:rows([["2026-08-01",60],["2026-09-01",70]])},
    tga:{rows:rows([["2026-08-01",40],["2026-09-01",50]])},
    onRrp:{rows:rows([["2026-08-01",70],["2026-09-01",80]])},
    m2:{rows:rows([["2026-08-01",30],["2026-09-01",40]])},
    bondVolatility:{rows:rows([["2026-08-01",80],["2026-09-01",90]])},
  }};
  const out=buildLiquidityDiagnosticTrendR1(r1,{asOfDate:"2026-09-30"});
  assert.deepEqual(out.map(x=>x.label),["2026-08-01","2026-09-01"]);
  assert.equal(out[0].value,55);
  assert.equal(out[1].value,65);
});

test("stored production liquidity points override reconstructed points on the same date",()=>{
  const rows=(score)=>[{observationDate:"2026-09-20",score}];
  const diagnostic={snapshot:{
    diagnostics:{liquidityCrisisDefense:{status:"READY",score:61,missing:[]}},
    r1:{
      latest:{bankReserves:{value:60},m2:{value:40},tga:{value:50},onRrp:{value:70}},
      components:{
        fundingStress:{rows:rows(50)},bankReserves:{rows:rows(60)},tga:{rows:rows(40)},
        onRrp:{rows:rows(70)},m2:{rows:rows(30)},bondVolatility:{rows:rows(80)},
      },
    },
  }};
  const out=buildLiquidityActivePublicDomainR1({
    diagnostic,
    storedTrend:[{label:"2026-09-20",value:59.5}],
    asOfDate:"2026-09-28",
  });
  assert.equal(out.trend.find(x=>x.label==="2026-09-20").value,59.5);
  assert.equal(out.trend.at(-1).value,61);
});


test("D3 factor minis use only real dated score rows for four displayed components",()=>{
  const latest={
    bankReserves:{observationDate:"2026-10-14",value:65},
    m2:{observationDate:"2026-09-01",value:40},
    tga:{observationDate:"2026-10-14",value:55},
    onRrp:{observationDate:"2026-10-16",value:70},
  };
  const rows=(values)=>values.map(([observationDate,score])=>({observationDate,score,rawSecret:1234}));
  const diagnostic={snapshot:{
    diagnostics:{liquidityCrisisDefense:{status:"READY",score:57,missing:[]}},
    r1:{latest,components:{
      bankReserves:{rows:rows([["2026-10-07",0],["2026-10-14",65]])},
      m2:{rows:rows([["2026-08-01",35],["2026-09-01",40]])},
      tga:{rows:rows([["2026-10-07",50],["2026-10-14",55]])},
      onRrp:{rows:rows([["2026-10-15",69],["2026-10-16",70]])},
    }},
  }};
  const out=buildLiquidityActivePublicDomainR1({diagnostic,asOfDate:"2026-10-18"});
  assert.equal(out.score,57);
  assert.deepEqual(out.indicators.map(x=>x.trend.at(-1).label),
    ["2026-10-14","2026-09-01","2026-10-14","2026-10-16"]);
  assert.deepEqual(out.indicators.map(x=>x.trend.at(-1).value),[65,40,55,70]);
  assert.equal(out.indicators[3].source,"Federal Reserve / RRPONTSYD active transform");
  assert.equal(out.indicators[3].sourceUrl,"https://fred.stlouisfed.org/series/RRPONTSYD");
  assert.match(out.indicators[3].licenseNotice,/© 2026 Federal Reserve Bank of New York/);
  assert.match(out.indicators[3].licenseNotice,/승인·추천이 아닙니다/);
  assert.equal(out.indicators[3].content,undefined); // no verbose legal copy in summary table
  assert.equal(out.indicators[0].trend[0].value,0); // 0 is a real score
  for(const item of out.indicators){
    assert.ok(item.trend.length>=2);
    for(const p of item.trend){
      assert.deepEqual(Object.keys(p).sort(),["label","status","value"]);
      assert.equal(p.label<="2026-10-18",true);
      assert.equal(Object.hasOwn(p,"rawSecret"),false);
      assert.equal(typeof p.value,"number");
    }
  }
});

test("D3 minis preserve null, prevent future/invalid months and break actual source gaps",()=>{
  const diagnostic={snapshot:{
    diagnostics:{liquidityCrisisDefense:{status:"READY",score:50,missing:[]}},
    r1:{latest:{bankReserves:{observationDate:"2026-10-14",value:60}},components:{
      bankReserves:{rows:[
        {observationDate:"2025-09-01",score:80}, // out of one-year window
        {observationDate:"2026-09-23",score:0},
        {observationDate:"2026-09-30",score:null},
        {observationDate:"2026-10-14",score:60},
        {observationDate:"2026-10-19",score:99},
        {observationDate:"2026-02-30",score:88},
      ]},
      m2:{rows:[{observationDate:"2026-07-01",score:45},{observationDate:"2026-09-01",score:55}]},
    }},
  }};
  const out=buildLiquidityActivePublicDomainR1({diagnostic,asOfDate:"2026-10-18"});
  assert.deepEqual(out.indicators[0].trend,[
    {label:"2026-09-23",value:0,status:"READY"},
    {label:"2026-09-30",value:null,status:"PARTIAL"},
    {label:"2026-10-14",value:60,status:"READY",breakBefore:true},
  ]);
  assert.equal(out.indicators[1].trend[1].breakBefore,true); // missing M2 month
  const prior=diagnostic.snapshot.r1.components.bankReserves.rows;
  diagnostic.snapshot.r1.components.bankReserves.rows=[...prior,
    {observationDate:"2026-10-14",score:61}];
  const duplicate=buildLiquidityActivePublicDomainR1({diagnostic,asOfDate:"2026-10-18"});
  assert.deepEqual(duplicate.indicators[0].trend,[]);
  assert.equal(duplicate.indicators[0].score,60);
});
