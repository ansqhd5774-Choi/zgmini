import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
test("worker validates Turnstile with strict hostname and secrets",()=>{
 const src=readFileSync(new URL("../worker/community-chat-api-r1.mjs",import.meta.url),"utf8");
 assert.match(src,/siteverify/);
 assert.match(src,/BOT_CHECK_FAILED/);
 assert.match(src,/result\.success===true&&result\.hostname===hostname/);
 assert.match(src,/COMMUNITY_CHAT_TURNSTILE_SECRET/);
});
test("browser sends a single-use token and retires the widget until another draft",()=>{
 const src=readFileSync(new URL("../components/community-chat.tsx",import.meta.url),"utf8");
 assert.match(src,/turnstileToken:captchaToken/);
 assert.match(src,/forgetCaptcha\(\);\s*try\{\s*const response=await fetch/);
 assert.match(src,/window\.turnstile\.remove\(captchaWidget\.current\)/);
 assert.match(src,/captchaWidget\.current=null;setCaptchaEpoch/);
 assert.match(src,/\|\|!wantsToWrite\)return/);
 assert.doesNotMatch(src,/window\.turnstile\.reset\(captchaWidget\.current\)/);
 assert.match(src,/!captchaToken/);
});
test("candidate delegates only explicit chat paths and retains existing guard",()=>{
 const src=readFileSync(new URL("../worker/candidate-r52.ts",import.meta.url),"utf8");
 assert.match(src,/isCommunityChatPath\(path\)/);
 assert.match(src,/communityChatApi\(request,native\)/);
 assert.match(src,/return http\.fetch\(request,native,ctx\)/);
 const handler=readFileSync(new URL("../worker/community-chat-api-r1.mjs",import.meta.url),"utf8");
 assert.match(handler,/DB_COMMUNITY/);
 assert.doesNotMatch(handler,/DB_CORE|DB_HISTORY/);
});
