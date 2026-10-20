import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const rails=read("components/risk-detail-side-rails.tsx");
const css=read("components/risk-detail-side-rails.css");
const header=read("components/site-header.tsx");
const chat=read("components/community-chat.tsx");
const home=read("app/page.tsx");
const catalog=read("components/market-explorer-catalog.ts");
const paths=["/inflation/","/recession/","/liquidity-crisis/","/credit-risk/","/asset-bubble/","/debt-risk/","/supply-shock/","/earnings-recession/"];

test("risk rail uses exactly the existing eight real deep links, with current-page status",()=>{
 const source=catalog.split("export const RISK_CARDS=[")[1].split("] as const;")[0];
 assert.equal((source.match(/href:'\//g)||[]).length,8);
 for(const path of paths)assert.ok(source.includes("href:'"+path+"'"),path);
 assert.match(rails,/RISK_CARDS\.map\(card=>/);
 assert.match(rails,/pathname===card\.href/);
 assert.match(rails,/aria-current=\{selected\?"page":undefined\}/);
 assert.match(rails,/href=\{card\.href\}/);
});

test("eight risk routes mount rails through header; dashboard and other domains stay unchanged",()=>{
 assert.match(header,/RISK_CARDS\.some\(card=>card\.href===pathname\)/);
 assert.match(header,/showRiskSideRails&&<RiskDetailSideRails pathname=\{pathname\}\/>/);
 for(const path of paths)assert.ok(catalog.includes("href:'"+path+"'"));
 assert.match(home,/<CommunityChat enabled\/>/);
 assert.match(chat,/if\(!enabled\)return null;/);
});

test("narrow screen has thumb-reachable independent ON-OFF buttons, opposite slide directions and escape",()=>{
 assert.match(rails,/setLeftOpen\(v=>!v\);setRightOpen\(false\)/);
 assert.match(rails,/setRightOpen\(v=>!v\);setLeftOpen\(false\)/);
 assert.match(rails,/aria-expanded=\{leftOpen\}/);
 assert.match(rails,/aria-expanded=\{rightOpen\}/);
 assert.match(rails,/e\.key!=="Escape"/);
 assert.match(rails,/zg-risk-side-veil/);
 assert.match(css,/@media\(max-width:1649px\)/);
 assert.match(css,/\.zg-risk-side-left\{left:10px;.*transform:translateX\(calc\(-100% - 12px\)\)/);
 assert.match(css,/\.zg-risk-side-right\{right:10px;.*transform:translateX\(calc\(100% \+ 12px\)\)/);
 assert.match(css,/\.zg-risk-side-rail\[data-open="true"\]\{visibility:visible;opacity:1;transform:translateX\(0\)/);
 assert.match(css,/backdrop-filter:blur\(9px\)/);
 assert.match(css,/bottom:max\(16px,env\(safe-area-inset-bottom\)\)/);
 assert.match(css,/height:min\(65dvh,570px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});

test("desktop side rails keep full content visible and embed the existing public chat, not an invented AI API",()=>{
 assert.match(css,/@media\(min-width:1650px\)/);
 assert.match(css,/\.zg-risk-side-rails-root\+main\{width:calc\(100% - 640px\)/);
 assert.match(rails,/<CommunityChat enabled sidebarMode sidebarOpen=\{rightVisible\}/);
 assert.match(chat,/sidebarMode\?sidebarOpen:internalOpen/);
 assert.match(chat,/!sidebarMode&&<button type="button" className="zg-community-toggle"/);
 assert.match(chat,/fetch\("\/api\/community\/messages"/);
 assert.match(chat,/turnstileToken:captchaToken/);
 assert.doesNotMatch(rails,/fetch\(/);
});
