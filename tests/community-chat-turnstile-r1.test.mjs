import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
test("POST requires server Turnstile verification with strict hostname",()=>{
 const source=readFileSync(new URL("../app/api/community/messages/route.ts",import.meta.url),"utf8");
 assert.match(source,/siteverify/);
 assert.match(source,/BOT_CHECK_FAILED/);
 assert.match(source,/result\.success===true&&result\.hostname===hostname/);
 assert.match(source,/COMMUNITY_CHAT_TURNSTILE_SECRET/);
});
test("browser sends captcha token and resets widget after sending",()=>{
 const source=readFileSync(new URL("../components/community-chat.tsx",import.meta.url),"utf8");
 assert.match(source,/turnstileToken:captchaToken/);
 assert.match(source,/window\.turnstile\.reset/);
 assert.match(source,/!captchaToken/);
});
