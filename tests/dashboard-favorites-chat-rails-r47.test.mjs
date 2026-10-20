import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(path,"utf8");
const home=read("app/page.tsx");
const rails=read("components/dashboard-side-rails.tsx");
const css=read("components/dashboard-side-rails.css");
const sources=read("components/dashboard-favorite-sources.ts");
const chat=read("components/community-chat.tsx");

test("dashboard embeds exactly one existing public chat in approved R44 side rails",()=>{
 assert.match(home,/view==="dashboard"&&<DashboardSideRails accountFavorites=/);
 assert.doesNotMatch(home,/<CommunityChat enabled\/>/);
 assert.match(rails,/<CommunityChat enabled sidebarMode sidebarOpen=\{rightVisible\}/);
 assert.match(rails,/className="zg-risk-side-rails-root zg-dashboard-side-rails-root"/);
 assert.match(rails,/zg-risk-side-action is-right/);
 assert.match(chat,/fetch\("\/api\/community\/messages"/);
 assert.doesNotMatch(rails,/\/api\/community\/messages|ai-chat|assistant-response/);
});

test("left rail shows only saved favorites, not a static category menu",()=>{
 assert.match(rails,/savedStrings\(source\.storageKey\)/);
 assert.match(rails,/savedStrings\(ECONOMIC_KEY\)/);
 assert.match(rails,/ECONOMIC_DETAIL_CATALOG\.find/);
 assert.match(rails,/accountFavorites/);
 assert.match(rails,/all\.map\(item=>/);
 assert.match(rails,/즐겨찾기한 지표가 없습니다/);
 assert.match(rails,/href=\{item\.href\}/);
 assert.doesNotMatch(rails,/RISK_CARDS\.map|ECONOMIC_DETAIL_CATALOG\.map/);
 for(const key of ["inflation","recession","liquidity","credit","earnings","asset","debt","supply"]){
  assert.ok(sources.includes('"zgmini:'+key+':favorites:v1"'),key);
 }
 assert.match(sources,/"CORE_PCE": "Core PCE"/);
 assert.match(sources,/"debtGdp": "민간부채\/GDP"/);
});

test("mobile favorites and chat are independent toggles with veil, Escape and focus restoration",()=>{
 assert.match(rails,/setLeftOpen\(v=>!v\);setRightOpen\(false\)/);
 assert.match(rails,/setRightOpen\(v=>!v\);setLeftOpen\(false\)/);
 assert.match(rails,/aria-expanded=\{leftOpen\}/);
 assert.match(rails,/aria-expanded=\{rightOpen\}/);
 assert.match(rails,/e\.key!=="Escape"/);
 assert.match(rails,/leftButton\.current\?\.focus/);
 assert.match(rails,/rightButton\.current\?\.focus/);
 assert.match(rails,/zg-risk-side-veil/);
 assert.match(rails,/inert=\{!leftVisible\}/);
 assert.match(rails,/inert=\{!rightVisible\}/);
 assert.match(rails,/onSidebarClose=\{\(\)=>setRightOpen\(false\)\}/);
});

test("favorite data is local/account read-only without score or writer edits",()=>{
 assert.match(rails,/storage",onStorage/);
 assert.match(rails,/window\.addEventListener\("focus",refresh\)/);
 assert.match(rails,/\/api\/market-score/);
 assert.match(rails,/cache:"no-store"/);
 assert.match(rails,/ECONOMIC_LABELS_KEY/);
 assert.doesNotMatch(rails,/method:"POST"|method:"DELETE"|D1|writer|new Request/);
 assert.match(home,/href:kind==="sector"\?"\/sector-fear-greed\/":"\/theme-fear-greed\/"/);
});

test("dashboard-only wide layout preserves other routes and small-screen main content",()=>{
 assert.match(css,/@media\(min-width:1650px\)/);
 assert.match(css,/\.zg-dashboard\[data-view="dashboard"\]>\.zg-container/);
 assert.match(css,/width:calc\(100% - 670px\)/);
 assert.match(css,/@media\(max-width:1649px\)/);
 assert.doesNotMatch(css,/\.zg-risk-side-rails-root\+main/);
});
