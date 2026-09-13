import test from 'node:test';
import assert from 'node:assert/strict';
import {buildResearchComposite,calculateMomentum,calculateStrength,calculateVolatility,researchReadiness,calculateResearchFactors,researchHistoriesFromPublicIndicators,RESEARCH_V2_WEIGHTS} from '../worker/korea-research-v2.mjs';

const date = index => { const d=new Date(Date.UTC(2024,0,1+index)); return d.toISOString().slice(0,10).replaceAll('-',''); };
const rows = (count=520) => Array.from({length:count},(_,i)=>({date:date(i),securityId:'A',shortCode:'A',market:'KOSPI',close:100+i*.1,returnPct:.1,tradingValue:1000,marketCap:100000}));
const point=(date,value)=>({date,value});

test('Momentum requires previous common observations and 252 percentile history',()=>{
  const result=calculateMomentum(rows());
  assert.equal(result.length,520);
  assert.equal(result.slice(0,310).filter(p=>p.value!==null).length,0);
  assert.ok(result.some(p=>Number.isFinite(p.value)));
});
test('Strength uses only current and prior history',()=>{
  const result=calculateStrength(rows());
  assert.equal(result.slice(0,250).filter(p=>p.value!==null).length,0);
  assert.ok(result.some(p=>Number.isFinite(p.value)));
});
test('Volatility Calm is null until RV20 plus P252 history exists',()=>{
  const result=calculateVolatility(rows());
  assert.equal(result.slice(0,270).filter(p=>p.value!==null).length,0);
  assert.ok(result.some(p=>Number.isFinite(p.value)));
});
test('six-factor composite joins exact dates and never renormalizes missing weights',()=>{
  const all=['breadth','momentum','strength','credit','liquidation','volatility'];
  const input=Object.fromEntries(all.map(name=>[name,[point('20260908',50),point('20260909',name==='volatility'?null:60)]]));
  const result=buildResearchComposite(input);
  assert.equal(result.history.at(-1).value,null);
  input.volatility=[point('20260908',50),point('20260909',60)];
  const ready=buildResearchComposite(input);
  assert.equal(ready.score,60);
  assert.deepEqual(ready.weights,RESEARCH_V2_WEIGHTS);
});
test('future points cannot alter earlier composite values',()=>{
  const input=Object.fromEntries(['breadth','momentum','strength','credit','liquidation','volatility'].map(name=>[name,[point('20260908',40)]]));
  const before=buildResearchComposite(input).history[0].value;
  for(const history of Object.values(input)) history.push(point('20260909',100));
  assert.equal(buildResearchComposite(input).history[0].value,before);
});
test('readiness distinguishes available factor histories',()=>{
  const result=researchReadiness({breadth:[point('20260909',0)],momentum:[],strength:[],credit:[],liquidation:[],volatility:[]});
  assert.equal(result.breadth.ready,true); assert.equal(result.momentum.ready,false);
});
test('readiness enforces fixed warm-up observations',()=>{
  const history = Array.from({length:310},(_,i)=>point(date(i),50));
  const result = researchReadiness({momentum:history,strength:history,volatility:history});
  assert.equal(result.momentum.available,310);
  assert.equal(result.momentum.required,311);
  assert.equal(result.momentum.ready,false);
  assert.equal(result.strength.ready,true);
  assert.equal(result.volatility.ready,true);
});
test('readiness reports market history depth separately from emitted factor points',()=>{
  const marketRows = Array.from({length:343},(_,i)=>({date:date(i),securityId:'A'}));
  const result = researchReadiness({momentum:[point(date(342),50)],marketRows});
  assert.equal(result.momentum.available,343);
  assert.equal(result.momentum.scoreCount,1);
  assert.equal(result.momentum.required,311);
  assert.equal(result.momentum.ready,true);
});
test('research factor bundle is research-only and keeps existing component histories',()=>{
  const result=calculateResearchFactors({marketRows:rows(20),breadth:[point('20240120',50)],credit:[point('20240120',50)],liquidation:[point('20240120',50)]});
  assert.equal(result.researchOnly,true); assert.equal(result.productionEligible,false);
  assert.equal(result.factors.credit[0].value,50); assert.equal(result.composite.status,'UNAVAILABLE');
});
test('existing credit and liquidation histories feed the six-factor composite by exact date',()=>{
  const indicators = [
    {id:'LEV_BLEND20_60',history:[point('20260908',40),point('20260909',60)]},
    {id:'L3_PRESSURE_P252',history:[point('20260908',20),point('20260909',10)]},
  ];
  const adapted = researchHistoriesFromPublicIndicators(indicators);
  assert.deepEqual(adapted.credit,[point('20260908',40),point('20260909',60)]);
  const result = calculateResearchFactors({breadth:[point('20260909',80)],componentIndicators:indicators,
    marketRows:[],momentum:[point('20260909',70)],strength:[point('20260909',65)],volatility:[point('20260909',55)]});
  assert.equal(result.factors.credit.at(-1).value,60);
  assert.equal(result.factors.liquidation.at(-1).value,10);
  assert.equal(result.composite.score,60*.15+10*.15+80*.25+70*.2+65*.15+55*.1);
  assert.equal(result.composite.observationDate,'20260909');
});
