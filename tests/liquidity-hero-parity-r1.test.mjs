import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(path,"utf8");
const liquidity=read("app/liquidity-crisis/liquidity-crisis-panel.tsx");
const recession=read("app/recession/recession-panel.tsx");
const inflation=read("app/inflation/inflation-hero-typography-r1.css");
const parity=read("app/liquidity-crisis/liquidity-hero-typography-r1.css");
test("liquidity and recession headers never reveal internal methodology text",()=>{
 assert.match(liquidity,/<MarketCardHeader.*title="미국 유동성 위기".*source=""/);
 assert.match(recession,/<MarketCardHeader.*title="미국 경기침체".*source=""/);
 assert.match(liquidity,/date=\{dateLabel\(payload\?\.asOfDate\)\} source=""/);
 assert.match(recession,/date=\{dateLabel\(payload\?\.asOfDate\)\} source=""/);
 assert.doesNotMatch(liquidity,/<MarketCardHeader.*source=\{payload/);
 assert.doesNotMatch(recession,/<MarketCardHeader.*source=\{payload/);
});
test("liquidity hero exactly adopts inflation typography without shared changes",()=>{
 assert.match(liquidity,/import "\.\/liquidity-hero-typography-r1\.css"/);
 assert.equal(parity.replace("Liquidity crisis detail hero typography only.","Inflation detail hero typography only.").replaceAll("liquidity-crisis-target-card","inflation-target-card"),inflation);
});
test("no score/date calculation or data source altered by hero-only fix",()=>{
 assert.match(liquidity,/useStoredIndex<Payload>\('\/api\/liquidity-crisis-detail'\)/);
 assert.match(recession,/useStoredIndex<Payload>\('\/api\/recession-detail'\)/);
 assert.match(liquidity,/comparisonItems=\{scoreComparisonItems\}/);
 assert.match(recession,/comparisonItems=\{scoreComparisonItems\}/);
});
