import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const guide=readFileSync("app/beginner-risk-guide.tsx","utf8");
const section=(from,to)=>guide.split(' "'+from+'":{')[1]?.split(' "'+to+'":{')[0];
const configs={
 "debt-risk":section("debt-risk","asset-bubble"),
 "asset-bubble":section("asset-bubble","supply-shock"),
 "supply-shock":section("supply-shock","earnings-recession"),
 "earnings-recession":guide.split(' "earnings-recession":{')[1]?.split("\ntype MethodologyExplanation")[0]
};
const factors={
 "debt-risk":["dsr","debtGdp","rateBurden","creditStress","debtServiceCapacity"],
 "asset-bubble":["valuationPressure","priceAcceleration","riskAssetShare","speculativeFlows","breadthDivergence","excessLiquidity"],
 "supply-shock":["G","E","O","P","I"]
};
const keys=text=>[...text.matchAll(/\b([A-Za-z][A-Za-z0-9]*):"/g)].map(m=>m[1]).sort();
test("all 16 approved factors have an evidence-based one-line explanation and stable ID",()=>{
 for(const [topic,ids] of Object.entries(factors)){
  const config=configs[topic];
  assert.ok(config,topic);
  const names=config.split("factorNames:{")[1]?.split("}")[0];
  const descriptions=config.split("factorDescriptions:{")[1]?.split("\n  }")[0];
  assert.ok(names&&descriptions,topic);
  assert.deepEqual(keys(names),[...ids].sort(),topic+" names");
  assert.deepEqual(keys(descriptions),[...ids].sort(),topic+" explanations");
  for(const id of ids){
   const line=descriptions.split(id+':"')[1]?.split('"')[0];
   assert.ok(line&&line.length>=18&&line.length<=85,topic+" "+id+" explanation length");
   assert.doesNotMatch(line,/\d+%|가중치|산출식|반드시|확정|투자 추천/,topic+" "+id+" claim");
  }
 }
});
test("debt beginner card uses DSR Korean label while leaving stored factor IDs intact",()=>{
 assert.ok(configs["debt-risk"].includes('dsr:"부채상환비율(DSR)"'));
 assert.doesNotMatch(configs["debt-risk"],/Debt Service Ratio/);
 assert.ok(guide.includes("return [{id,score}];"));
});
test("shared card markup still displays descriptions without altering E1 relative-ranked factors",()=>{
 assert.ok(guide.includes("const description=config.factorDescriptions?.[item.id]"));
 assert.ok(guide.includes('<span className="block pl-3 text-xs leading-5 text-slate-400">{description}</span>'));
 assert.ok(configs["earnings-recession"].includes("factorDescriptions:{"));
 for(let i=1;i<=13;i++)assert.ok(configs["earnings-recession"].includes("S"+i+':"'));
 assert.ok(guide.includes('const earningsStoredScore=topic==="earnings-recession"?finiteScore(payload?.storedE1?.score):null'));
 assert.ok(guide.includes('const displayedLower=topic==="earnings-recession"?earningsRelativeBottom:negative'));
 assert.ok(guide.includes("E1 저장 지표 평가입니다. 메인 진단 점수의 구성요인과는 별개입니다."));
 assert.ok(guide.includes("const positive=useMemo(()=>factors.filter(x=>x.score>=60)"));
 assert.ok(guide.includes("const negative=useMemo(()=>factors.filter(x=>x.score<45)"));
});
