import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(path,"utf8");

test("inflation mobile judgement badges preserve positive neutral negative colors",()=>{
  const page=read("app/inflation/page.tsx");
  const css=read("app/inflation/inflation-mobile-judgement.css");
  const panel=read("app/inflation/inflation-panel.tsx");

  assert.match(page,/import "\.\/inflation-mobile-judgement\.css";/);
  assert.match(panel,/className="inflation-r2-mobile-card"[^>]*data-judgement=\{result\.tone\}/);
  assert.match(css,/\.inflation-r2-mobile-card\[data-judgement="positive"\] \.inflation-judgement\{[\s\S]*color:#77e59c/);
  assert.match(css,/\.inflation-r2-mobile-card\[data-judgement="negative"\] \.inflation-judgement\{[\s\S]*color:#ff9a9a/);
  assert.match(css,/\.inflation-r2-mobile-card\[data-judgement="neutral"\] \.inflation-judgement\{[\s\S]*color:#cbd5e1/);
});
