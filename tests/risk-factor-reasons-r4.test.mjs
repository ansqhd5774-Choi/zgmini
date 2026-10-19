import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=p=>readFileSync(p,"utf8");
const guide=read("app/beginner-risk-guide.tsx");
const chunks={
 "debt-risk":guide.split(' "debt-risk":{')[1]?.split(' "asset-bubble":{')[0],
 "asset-bubble":guide.split(' "asset-bubble":{')[1]?.split(' "supply-shock":{')[0],
 "supply-shock":guide.split(' "supply-shock":{')[1]?.split(' "earnings-recession":{')[0],
 "earnings-recession":guide.split(' "earnings-recession":{')[1]?.split('};\\n\\ntype MethodologyExplanation')[0]
};
const ids={
 "debt-risk":["dsr","debtGdp","rateBurden","creditStress","debtServiceCapacity"],
 "asset-bubble":["valuationPressure","priceAcceleration","riskAssetShare","speculativeFlows","breadthDivergence","excessLiquidity"],
 "supply-shock":["G","E","O","P","I"]
};
const keys=text=>[...text.matchAll(/\\b([A-Za-z][A-Za-z0-9]*):"/g)].map(m=>m[1]).sort();
test("all 16 approved factors have a meaningful, concise one-line interpretation",()=>{
 for(const [topic,required] of Object.entries(ids)){
  const chunk=chunks[topic];
  assert.ok(chunk,topic);
  const names=chunk.match(/factorNames:\\{([^}]+)\\}/)?.[1];
  const descriptions=chunk.match(/factorDescriptions:\\{([\\s\\S]*?)\\n  \\}/)?.[1];
  assert.ok(names&&descriptions,topic);
  assert.deepEqual(keys(names),[...required].sort(),topic+" names");
  assert.deepEqual(keys(descriptions),[...required].sort(),topic+" descriptions");
  for(const id of required){
   const match=descriptions.match(new RegExp('\\\\b'+id+':"([^"]+)"'));
   assert.ok(match,topic+" "+id);
   const description=match[1];
   assert.ok(description.length>=18&&description.length<=85,topic+" "+id+" length");
   assert.ok(!/\\d+%|가중치|산출식|반드시|확정|투자 추천/.test(description),topic+" "+id+" no score/claim");
  }
 }
});
test("debt guide uses reader-friendly DSR label without renaming the stored factor ID",()=>{
 assert.ok(chunks["debt-risk"].includes('dsr:"부채상환비율(DSR)"'));
 assert.doesNotMatch(chunks["debt-risk"],/Debt Service Ratio/);
 assert.match(guide,/return \\[\\{id,score\\}\\]/);
});
test("the existing universal factor-card markup renders descriptions and keeps E1 diagnostic separation",()=>{
 assert.match(guide,/const description=config\\.factorDescriptions\\?\\.\\[item\\.id\\]/);
 assert.match(guide,/<span className="block pl-3 text-xs leading-5 text-slate-400">\\{description\\}<\\/span>/);
 assert.ok(chunks["earnings-recession"].includes('factorDescriptions:{'));
 for(let n=1;n<=13;n++)assert.ok(chunks["earnings-recession"].includes('S'+n+':"'));
 assert.match(guide,/const earningsStoredScore=topic==="earnings-recession"\\?finiteScore\\(payload\\?\\.storedE1\\?\\.score\\):null/);
 assert.match(guide,/const displayedLower=topic==="earnings-recession"\\?earningsRelativeBottom:negative/);
 assert.match(guide,/E1 저장 지표 평가입니다\\. 메인 진단 점수의 구성요인과는 별개입니다/);
 assert.match(guide,/const positive=useMemo\\(\\(\\)=>factors\\.filter\\(x=>x\\.score>=60\\)/);
 assert.match(guide,/const negative=useMemo\\(\\(\\)=>factors\\.filter\\(x=>x\\.score<45\\)/);
});
