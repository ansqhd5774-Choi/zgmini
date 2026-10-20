import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("both fear-greed details use exactly the same SiteHeader as the inflation reference page",()=>{
 const inflation=read("app/inflation/page.tsx");
 const header=read("components/site-header.tsx");
 assert.match(inflation,/import SiteHeader from ["']@\/components\/site-header["']/);
 assert.match(inflation,/<SiteHeader\/>/);
 for(const market of ["usa","korea"]){
  const page=read(`app/fear-greed/${market}/page.tsx`);
  assert.match(page,/import SiteHeader from ["']@\/components\/site-header["']/);
  assert.equal((page.match(/<SiteHeader\/>/g)||[]).length,1);
  assert.match(page,/return <>\s*<SiteHeader\/>/);
  assert.doesNotMatch(page,/← ZGmini 메인 대시보드/);
  assert.match(page,/className="zg-fg-country-tabs"/);
  assert.match(page,/className="zg-fg-bottom-r3"/);
 }
 assert.match(header,/CollectionHealthIndicator/);
 for(const href of ["/risk-indicators/","/economic-indicators/","/sector-fear-greed/","/theme-fear-greed/"])assert.ok(header.includes(href));
 assert.match(header,/zg-site-header/);
});
test("shared header does not modify the stored score, CNN/Korea analysis, or metadata contracts",()=>{
 const us=read("app/fear-greed/usa/page.tsx");
 const kr=read("app/fear-greed/korea/page.tsx");
 assert.match(us,/<CnnPanel showEducation\/>/);
 assert.match(kr,/<DataPanel\/>/);
 assert.match(us,/<InvestorIntentGuide market="usa"\/>/);
 assert.match(kr,/<InvestorIntentGuide market="korea"\/>/);
 assert.match(us,/alternates:\{canonical:url\}/);
 assert.match(kr,/alternates: \{ canonical:url \}/);
});
