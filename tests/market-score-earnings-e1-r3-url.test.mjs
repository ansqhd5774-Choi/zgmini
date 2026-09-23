import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("E1-R3 collector keeps Wikipedia S&P page unencoded in source and relies on URLSearchParams once", async()=>{
  const source=await readFile(new URL("../lib/market-score/sec-earnings-e1-r3-provider.mjs",import.meta.url),"utf8");
  assert.match(source,/searchParams\.set\("page","List_of_S&P_500_companies"\)/);
  assert.doesNotMatch(source,/List_of_S%26P_500_companies/);
  assert.doesNotMatch(source,/%2526/);
});
