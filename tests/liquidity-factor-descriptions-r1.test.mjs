import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(path,"utf8");
const guide=read("app/beginner-risk-guide.tsx");
const liquidity=read("app/liquidity-crisis/liquidity-crisis-panel.tsx");
const begin=guide.indexOf(' "liquidity-crisis":{'),end=guide.indexOf(' "credit-risk":{',begin);
const config=guide.slice(begin,end);
const ids=["sofrIorb","obfrIorb","repoGap","sofrIorbRv20","bankEmergency","bankReserves","tga","onRrp","m2","bond2y","bond5y","bond10y","bond30y"];
test("liquidity score factors retain 13 mapped short explanations from observed-data UI",()=>{
 assert.ok(begin>=0&&end>begin);
 const names=config.match(/factorNames:\{([^}]+)\}/)?.[1];
 const descriptions=config.match(/factorDescriptions:\{([\s\S]*?)\n  \}/)?.[1];
 assert.ok(names&&descriptions);
 const items=t=>[...t.matchAll(/\b([A-Za-z][A-Za-z0-9]*):"/g)].map(x=>x[1]).sort();
 assert.deepEqual(items(names),[...ids].sort());
 assert.deepEqual(items(descriptions),[...ids].sort());
 for(const id of ids){
  const description=descriptions.match(new RegExp("\\b"+id+":\\\"([^\\\"]+)\\\""))?.[1];
  const tableDescription=liquidity.match(new RegExp("\\b"+id+":\\{label:\\\"[^\\\"]+\\\",content:\\\"([^\\\"]+)\\\""))?.[1];
  assert.ok(description&&description.length>=8,id);
  assert.equal(description,id==="obfrIorb"?"은행 익일자금 금리와 연준 지급금리의 차이":tableDescription,id);
 }
});
test("positive/negative displayed factors are selected from the stored scores only",()=>{
 assert.match(guide,/const description=config\.factorDescriptions\?\.\[item\.id\]/);
 assert.match(guide,/const positive=useMemo\(\(\)=>factors\.filter\(x=>x\.score>=60\)/);
 assert.match(guide,/const negative=useMemo\(\(\)=>factors\.filter\(x=>x\.score<45\)/);
 assert.match(guide,/return \[\{id,score\}\]/);
 assert.match(config,/endpoint:"\/api\/liquidity-crisis-detail"/);
});
