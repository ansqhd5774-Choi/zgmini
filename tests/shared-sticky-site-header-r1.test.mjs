import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(path,"utf8");
const routes=["inflation","recession","liquidity-crisis","credit-risk","debt-risk","asset-bubble","supply-shock","earnings-recession"];
const shared=read("components/site-header.tsx");
const css=read("components/site-header.css");
const home=read("app/page.tsx");

test("dashboard and eight analytical details share one sticky navigational header",()=>{
 assert.match(shared,/className="zg-header zg-site-header text-white"/);
 assert.match(shared,/import CollectionHealthIndicator from/);
 assert.match(shared,/<CollectionHealthIndicator\/>/);
 assert.match(shared,/<nav aria-label="주 메뉴">/);
 assert.match(shared,/href="\/"/);
 assert.match(shared,/href="\/\?view=scenarios"/);
 assert.match(shared,/aria-label="ZGmini 대시보드로 이동"/);
 assert.match(home,/<SiteHeader activeView=\{/);
 assert.doesNotMatch(home,/<header className="zg-header text-white"/);
 for(const route of routes){
  const page=read(`app/${route}/page.tsx`);
  assert.match(page,/import SiteHeader from "@\/components\/site-header";/,route);
  assert.match(page,/return <><SiteHeader\/><main className="min-h-screen/,route);
  assert.doesNotMatch(page,/fixed left-4 top-4 z-50/,route);
  assert.doesNotMatch(page,/← ZGmini 메인 대시보드/,route);
 }
});

test("the outbreak deep-link is read on the homepage without reload-dependent tab state",()=>{
 assert.match(home,/new URLSearchParams\(window.location.search\).get\("view"\)==="scenarios"/);
 assert.match(home,/window.addEventListener\("popstate",sync\)/);
 assert.match(home,/setView\(next\)/);
 assert.match(home,/url.searchParams.set\("view","scenarios"\)/);
 assert.match(home,/url.searchParams.delete\("view"\)/);
 assert.match(home,/window.history.replaceState\(window.history.state/);
 assert.match(shared,/onSelectView\("dashboard"\)/);
 assert.match(shared,/onSelectView\("scenarios"\)/);
});

test("dashboard sign-in settings and stored favorites are preserved inside shared header",()=>{
 assert.match(home,/accountTools=\{sessionLoading \?/);
 assert.match(home,/<SheetTitle className="flex items-center gap-2"><UserRound/);
 assert.match(home,/내 즐겨찾기 \{favoriteItems.length\}개/);
 assert.match(home,/\/signout-with-chatgpt\?return_to=%2F/);
 assert.match(shared,/<div className="zg-account-tools">\{accountTools\}<\/div>/);
});

test("sticky header clears the scrolling dashboard rail and measures responsive height",()=>{
 assert.match(css,/\.zg-site-header\{\s*position:sticky;\s*top:0;\s*z-index:110/);
 assert.match(css,/\.zg-dashboard \.sticky-summary\{top:var\(--zg-site-header-height,64px\)\}/);
 assert.match(css,/html:has\(\.zg-site-header\)\{scroll-padding-top:/);
 assert.match(shared,/new ResizeObserver\(updateHeight\)/);
 assert.match(shared,/header.getBoundingClientRect\(\).height/);
 assert.match(shared,/document.documentElement.style.removeProperty\("--zg-site-header-height"\)/);
 assert.match(css,/@media\(max-width:959px\)/);
 assert.match(css, /prefers-reduced-motion:reduce/);
});
