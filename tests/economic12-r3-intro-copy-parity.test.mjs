import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";const s=readFileSync("lib/economic-detail-catalog.ts","utf8");const panel=readFileSync("app/economic-indicators/economic-detail-page.tsx","utf8");
test("twelve market detail intro questions avoid duplicated country/topic phrase while preserving existing SEO metadata",()=>{
const entries=JSON.parse(s.match(/ECONOMIC_DETAIL_CATALOG=(\[[\s\S]*?\]) as const;/)[1]);
assert.equal(entries.length,12);
for(const entry of entries){const assembled="미국 "+entry.name+", "+entry.question;
assert.ok(!entry.question.startsWith("미국 "),entry.slug+" duplicate America");
assert.ok(entry.question.endsWith("?"),entry.slug);
assert.ok(assembled.length<=52,entry.slug);
assert.ok(entry.tags&&entry.description&&entry.reading&&entry.impact,entry.slug);
}
assert.match(panel,/미국 \{detail\.name\},/);
});
