import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const original=read("app/outbreak-events.tsx");
const beginner=read("app/outbreak-beginner-fed-r53.tsx");
const css=read("app/outbreak-beginner-r53.css");
const iran=read("app/iran-progress.tsx");
test("use only stored oneMonth points for exactly 14 calendar dates",()=>{
 assert.match(beginner,/const start=end-13\*86_400_000/);
 assert.match(beginner,/for\(const row of rate\.oneMonth\)/);
 assert.match(beginner,/at>=start&&at<=end/);
 assert.match(beginner,/daily\.set\(at,row\)/);
 assert.match(beginner,/points:\[\.\.\.daily\.entries\(\)\]/);
 assert.match(beginner,/14일 추이/);
 assert.match(beginner,/관측.*14일/);
 assert.match(beginner,/미관측 날짜는 점을 생성하지 않음/);
 assert.doesNotMatch(beginner,/Math\.random|fill\(\d+\)|interpolat|backfillFrom/);
 assert.match(original,/useStoredIndex<RateSentimentSnapshot>\('\/api\/rate-sentiment'\)/);
 assert.match(original,/fed\?<OutbreakBeginnerFed rate=\{rate\} deltaWeek=\{deltaWeek\}\/>/);
});
test("five-band score intervals are identical to previously published sentiment colors",()=>{
 for(const fragment of ["value<25","value<40","value<60","value<75","#ef4444","#f59e0b","#94a3b8","#22c55e","#10b981"]){
  assert.ok(beginner.includes(fragment),"Missing approved band "+fragment);
 }
 assert.match(css,/grid-template-columns:25fr 15fr 20fr 15fr 25fr/);
 assert.match(css,/\.ob53-tone-pill/);
 assert.match(original,/const tone=rateBand\(value\)/);
 assert.match(original,/aria-pressed=\{selectedCard\}/);
});
test("beginner view explains the score without claiming policy rate or stock prediction",()=>{
 for(const phrase of ["이 숫자는 무슨 뜻인가요?","주식 초보자용 해석","14일 추이","주간 변화",
 "시장금리 기반 심리 점수","금리 인하 확률이 아닙니다","자세한 산식·근거 보기"]){
  assert.ok(beginner.includes(phrase),"Missing beginner guidance "+phrase);
 }
 assert.match(beginner,/<details className="ob53-details">/);
 assert.match(beginner,/role="img" aria-label=/);
 assert.doesNotMatch(beginner,/주가 상승 확정|금리 인하 확정|100% 예측|투자 추천/);
});
test("existing Iranian history and pending Ukraine event are not replaced",()=>{
 assert.match(original,/event\.id==='iran'\?<IranDetail view=\{iran\}\/>/);
 assert.match(original,/item\.id==="iran"\?iran\.score:null/);
 assert.match(iran,/14일 추정 흐름/);
 assert.match(original,/const unit=item\.id==="ukraine"\?"%":"점"/);
 assert.match(original,/value===null\?"—":value\.toFixed\(1\)/);
});
