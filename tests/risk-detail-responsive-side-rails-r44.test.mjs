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
const paths=["/inflation/","/recession/","/stagflation-risk/","/credit-risk/","/asset-bubble/","/debt-risk/","/supply-shock/","/earnings-recession/"];

test("risk rail uses exactly the existing eight real deep links, with current-page status",()=>{
 const source=catalog.split("export const RISK_CARDS=[")[1].split("] as const;")[0];
 assert.equal((source.match(/href:'\//g)||[]).length,8);
 for(const path of paths)assert.ok(source.includes("href:'"+path+"'"),path);
 assert.match(rails,/RISK_CARDS\.map\(card=>/);
 assert.match(rails,/pathname===card\.href/);
 assert.match(rails,/aria-current=\{selected\?"page":undefined\}/);
 assert.match(rails,/href=\{card\.href\}/);
});

test("eight risk routes remain mounted through header independently of dashboard rails",()=>{
 assert.match(header,/RISK_CARDS\.some\(card=>card\.href===pathname\)/);
 assert.match(header,/showRiskSideRails&&<RiskDetailSideRails pathname=\{pathname\}\/>/);
 for(const path of paths)assert.ok(catalog.includes("href:'"+path+"'"));
 assert.match(home,/<DashboardSideRails accountFavorites=/);
 assert.doesNotMatch(home,/<CommunityChat enabled\/>/);
 assert.match(read("components/dashboard-side-rails.tsx"),/<CommunityChat enabled sidebarMode sidebarOpen=\{rightVisible\}/);
});

test("risk detail has one thumb-reachable navigation toggle, a translucent panel and Escape dismissal",()=>{
 assert.match(rails,/setLeftOpen\(v=>!v\)/);
 assert.match(rails,/aria-expanded=\{leftOpen\}/);
 assert.match(rails,/e\.key!=="Escape"/);
 assert.match(rails,/zg-risk-side-veil/);
 assert.match(rails,/!wide&&leftOpen/);
 assert.match(css,/@media\(max-width:1649px\)/);
 assert.match(css,/\.zg-risk-side-left\{left:10px;.*transform:translateX\(calc\(-100% - 12px\)\)/);
 assert.match(css,/\.zg-risk-side-rail\[data-open="true"\]\{visibility:visible;opacity:1;transform:translateX\(0\)/);
 assert.match(css,/backdrop-filter:blur\(9px\)/);
 assert.match(css,/bottom:max\(16px,env\(safe-area-inset-bottom\)\)/);
 assert.match(css,/height:min\(65dvh,570px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});

test("only the dashboard mounts public chat; risk detail neither mounts nor imports a chat client",()=>{
 const dashboardRails=read("components/dashboard-side-rails.tsx");
 assert.match(dashboardRails,/<CommunityChat enabled sidebarMode sidebarOpen=\{rightVisible\}/);
 assert.match(chat,/fetch\("\/api\/community\/messages"/);
 assert.match(chat,/turnstileToken:captchaToken/);
 assert.match(rails,/className="zg-risk-side-rails-root zg-risk-only-nav"/);
 assert.doesNotMatch(rails,/CommunityChat|community-chat|MessageCircle|zg-risk-side-right|rightOpen|setRightOpen|zg-community-chat-panel/);
 assert.doesNotMatch(header,/CommunityChat|community-chat/);
 assert.doesNotMatch(rails,/fetch\(/);
});

test("wide risk detail content expands into space formerly reserved for chat without changing dashboard geometry",()=>{
 assert.match(css,/@media\(min-width:1650px\)/);
 assert.match(css,/\.zg-risk-side-rails-root\.zg-risk-only-nav\+main\{width:calc\(100% - 320px\);max-width:1500px/);
 assert.match(css,/margin-right:24px;transform:none/);
 assert.match(read("components/dashboard-side-rails.css"),/width:calc\(100% - 670px\)/);
});
