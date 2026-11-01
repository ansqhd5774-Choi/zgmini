import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(path,"utf8");

test("inflation mobile header keeps title and data basis date on one row",()=>{
 const page=read("app/inflation/page.tsx");
 const css=read("app/inflation/inflation-mobile-header.css");
 assert.match(page,/import "\.\/inflation-mobile-header\.css";/);
 assert.match(css,/\.fg-card\.fg-shared-shell\.inflation-target-card \.fg-header-slot \.cnn-panel-heading\{[\s\S]*grid-template-columns:minmax\(0,1fr\) auto;[\s\S]*align-items:start/);
 assert.match(css,/\.fg-card\.fg-shared-shell\.inflation-target-card \.cnn-source\{[\s\S]*grid-column:2;[\s\S]*grid-row:1;[\s\S]*align-self:start;[\s\S]*justify-self:end/);
});
