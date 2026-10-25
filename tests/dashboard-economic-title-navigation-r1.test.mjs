import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const ui=readFileSync("app/dashboard-ui.tsx","utf8");
const css=readFileSync("app/globals.css","utf8");
const catalog=readFileSync("components/market-explorer-catalog.ts","utf8");
const routes=[
 ["inflation","inflation"],["employment","employment"],["rates","rates"],
 ["credit","credit"],["growth","growth"],["consumption","consumption"],
 ["earnings","earnings"],["liquidity","liquidity"],["fundFlows","fund-flows"],
 ["breadth","breadth"],["dollarFx","dollar-fx"],["commodities","commodities"]
];
test("12 market card headings navigate natively to the approved published detail routes",()=>{
 const heading=ui.match(/<h3><a className="zg-r55-card-title-link"([\s\S]*?)<\/a><\/h3>/)?.[0];
 assert.ok(heading,"title link missing");
 assert.ok(heading.includes('href={"/economic-indicators/"+('));
 assert.ok(heading.includes('aria-label={m.label+" 상세페이지 열기"}'));
 assert.ok(heading.includes("event.stopPropagation()"),"link should not expand card");
 assert.ok(heading.includes('<ArrowUpRight className="zg-r55-title-arrow" size={10} aria-hidden="true"/>'),"compact navigation arrow must be visible without consuming chart width");
 assert.ok(css.includes("text-decoration-line:underline"),"permanent visible link affordance required");
 for(const [id,slug] of routes){
  assert.ok(heading.includes(id+':"'+slug+'"'),"bad dashboard slug "+id);
  assert.ok(catalog.includes("id:'"+id+"',href:'/economic-indicators/"+slug+"/'"),"bad explorer slug "+id);
  assert.ok(readFileSync("app/economic-indicators/"+slug+"/page.tsx","utf8").includes('id="'+id+'"'),"missing actual page "+slug);
 }
 assert.equal(routes.length,12);
});
test("native links must not be nested in role button; global expand control and card background toggles remain",()=>{
 assert.doesNotMatch(ui,/onKeyDown=\{keyToggle\}/);
 assert.doesNotMatch(ui,/role="button"\s+aria-expanded=\{expanded\}[\s\S]*?className="zg-r55-card-head"/);
 assert.ok(ui.includes('data-expanded={expanded?"true":"false"}'));
 assert.ok(ui.includes('if((event.target as HTMLElement).closest("a,button,[role=button]"))return;'));
 assert.ok(ui.includes('className="zg-r55-expand"'));
});
test("title text is visibly actionable, pointer-accessible and keyboard focusable",()=>{
 assert.ok(css.includes("EC12 NAV R1"));
 assert.ok(css.includes(".zg-r55-card-title-link{"));
 for(const value of ["cursor:pointer","pointer-events:auto","touch-action:manipulation",":focus-visible","text-decoration:underline"])assert.ok(css.includes(value));
});

test("economic mini charts keep visible dotted guides and separate help positioning",()=>{
 assert.ok(ui.includes("strokeDasharray={value===0||value===100?undefined:'4 4'}"));
 assert.ok(ui.includes("rgba(170,197,220,.64)"));
 assert.ok(ui.includes("rgba(157,184,208,.52)"));
 assert.ok(css.includes("EC12 R2: separate the help affordance"));
 assert.ok(css.includes("left:-7px;"));
});

test("collapsed market cards keep help left of the title on desktop and mobile despite media rule hoisting",()=>{
 const rule=css.split("/* EC12 R3: compact, collapsed cards")[1];
 assert.ok(rule,"R3 layout rule missing");
 assert.ok(rule.includes('.zg-r55-shell[data-expanded="false"] .zg-r55-card-head{'));
 assert.ok(rule.includes('display:block;'));
 assert.ok(rule.includes('padding-left:13px;'));
 assert.ok(rule.includes('.zg-r55-shell[data-expanded="false"] .zg-r55-card-head>span:last-child{'));
 assert.ok(rule.includes('position:absolute;'));
 assert.ok(rule.includes('left:-8px;'));
 assert.ok(rule.includes('top:-6px;'));
 assert.ok(!rule.includes('width:calc('),"must not compress mini-chart width");
});

test("folded and unfolded economic titles share fixed info position and a nonflow arrow",()=>{
 const r4=css.split("/* EC12 R4: stable heading")[1];
 assert.ok(r4,"R4 unified layout missing");
 assert.ok(r4.includes('.zg-r55-shell[data-expanded] .zg-r55-card-head{'));
 assert.ok(r4.includes('display:block;'));
 assert.ok(r4.includes('padding-left:15px;'));
 assert.ok(r4.includes('.zg-r55-shell[data-expanded] .zg-r55-card-head>span:last-child{'));
 assert.ok(r4.includes('position:absolute;'));
 assert.ok(r4.includes('top:-8px;'));
 assert.ok(r4.includes('left:-8px;'));
 assert.ok(r4.includes('.zg-r55-card-title-link .zg-r55-title-arrow{'));
 assert.ok(r4.includes('right:0;'));
 assert.ok(r4.includes('pointer-events:none;'));
 assert.ok(!/zg-r55-mini-chart[^}]*width\s*:/.test(r4),"mini-chart width must not shrink");
});

test("compact titles keep a readable help gap without shrinking any chart",()=>{
 const r5=css.split("/* EC12 R5: breathe between upper-left help")[1];
 assert.ok(r5,"R5 separation rule missing");
 assert.ok(r5.includes('.zg-r55-shell[data-expanded] .zg-r55-card-head{padding-left:18px}'));
 assert.ok(r5.includes('.zg-r55-card-head h3{letter-spacing:-1.2px}'));
 assert.ok(r5.includes('.zg-r55-mini-chart{transform:translateX(4px)}'));
 assert.ok(!/zg-r55-mini-chart[^}]*width\s*:/.test(r5));
});
