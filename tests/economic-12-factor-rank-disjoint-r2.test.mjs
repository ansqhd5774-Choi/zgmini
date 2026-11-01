import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const src=readFileSync("app/economic-indicators/economic-detail-panel.tsx","utf8");
test("economic higher/lower factors are disjoint even when fewer than six component scores are saved",()=>{
 assert.match(src,/const ranked=\[\.\.\.scored\]\.sort/);
 assert.match(src,/highCount=Math\.min\(3,Math\.ceil\(ranked\.length\/2\)\)/);
 assert.match(src,/lowCount=Math\.min\(3,Math\.floor\(ranked\.length\/2\)\)/);
 assert.match(src,/strongest=ranked\.slice\(0,highCount\)/);
 assert.match(src,/weakest=ranked\.slice\(ranked\.length-lowCount\)\.reverse\(\)/);
 for(const n of [0,1,2,3,4,5,6,7,12,13]){
  const ranked=Array.from({length:n},(_,i)=>({id:String(i),score:n-i}));
  const high=Math.min(3,Math.ceil(ranked.length/2)),low=Math.min(3,Math.floor(ranked.length/2));
  const selected=[...ranked.slice(0,high),...ranked.slice(ranked.length-low)];
  assert.equal(new Set(selected.map(x=>x.id)).size,selected.length,"no factor appears on both sides n="+n);
  assert.ok(selected.length<=6);
 }
});
test("economic reasons are relative comparisons of only available published factors, never claimed causal weight",()=>{
 assert.match(src,/observations\.filter\(item=>item\.status==="READY"&&validScore\(item\.score\)\)/);
 assert.match(src,/각 지표의 높고 낮음은 최종 점수에 미친 가중 기여도를 뜻하지 않습니다/);
 assert.doesNotMatch(src,/const score = weighted|Math\.random\(\)/);
});
