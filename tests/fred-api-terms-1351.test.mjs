import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const required="This product uses the FRED® API but is not endorsed or certified by the Federal Reserve Bank of St. Louis.";
const link="https://fred.stlouisfed.org/docs/api/terms_of_use.html";

test("FRED API non-endorsement statement and terms link are present in existing navigation",()=>{
 const footer=read("../components/site-footer.tsx");
 const sources=read("../app/data-sources/page.tsx");
 for(const content of [footer,sources]){
  assert.ok(content.includes(required));
  assert.ok(content.includes(link));
 }
 assert.ok(footer.includes('href="/terms/"'));
 assert.ok(sources.includes('href="/terms/"'));
});

test("FRED app terms explicitly state that users accept FRED API terms",()=>{
 const terms=read("../app/terms/page.tsx");
 assert.ok(terms.includes(required));
 assert.ok(terms.includes(link));
 assert.ok(terms.includes("약관을 준수하는 데 동의합니다"));
 assert.ok(terms.includes("원자료 소유자의 정책"));
 assert.ok(terms.includes("공식 점수나 승인·추천을 뜻하지 않습니다"));
});

test("FRED terms changes do not remove current data-source rights caveat",()=>{
 const sources=read("../app/data-sources/page.tsx");
 assert.ok(sources.includes("데이터 공개와 재배포 허용은 별개입니다"));
 assert.ok(sources.includes("출처만 표기했다고 재이용이 허용되는 것은 아닙니다"));
});
