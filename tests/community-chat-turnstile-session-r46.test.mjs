import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const chat=readFileSync(new URL("../components/community-chat.tsx",import.meta.url),"utf8");
const worker=readFileSync(new URL("../worker/community-chat-api-r1.mjs",import.meta.url),"utf8");

test("chat preserves only unused challenges for same-tab navigation",()=>{
 assert.match(chat,/sessionStorage\.getItem\(CAPTCHA_CACHE_KEY\)/);
 assert.match(chat,/sessionStorage\.setItem\(CAPTCHA_CACHE_KEY/);
 assert.match(chat,/entry\.siteKey===siteKey/);
 assert.match(chat,/CAPTCHA_CACHE_MAX_AGE_MS=270_000/);
 assert.match(chat,/Date\.now\(\)-entry\.issuedAt<CAPTCHA_CACHE_MAX_AGE_MS/);
 assert.match(chat,/const cached=readCachedCaptcha\(siteKey\)/);
 assert.match(chat,/if\(cached\)\{[\s\S]*?setCaptchaToken\(cached\.token\)/);
 assert.doesNotMatch(chat,/else\{setCaptchaToken\(""\);\}\},\[open\]/);
});

test("chat removes consumed or invalid challenges without bypassing server validation",()=>{
 assert.match(chat,/forgetCaptcha\(\);\s*try\{\s*const response=await fetch\("\/api\/community\/messages"/);
 assert.match(chat,/captchaSiteKey\.current!==siteKey/);
 assert.match(chat,/Date\.now\(\)-captchaIssuedAt\.current>=CAPTCHA_CACHE_MAX_AGE_MS/);
 assert.match(chat,/"expired-callback":\(\)=>\{[\s\S]*?forgetCaptcha\(\)/);
 assert.match(chat,/"error-callback":\(\)=>\{[\s\S]*?forgetCaptcha\(\)/);
 assert.match(worker,/verifyCaptcha\(parsed\.data\?\.turnstileToken/);
 assert.match(worker,/result\.success===true&&result\.hostname===hostname/);
 assert.match(worker,/chatRateAllowed/);
});

test("browser regression checks retained navigation and consumed single-use token",()=>{
 const browser=readFileSync(new URL("./community-chat-browser-r1.mjs",import.meta.url),"utf8");
 assert.match(browser,/page\.reload\(\{waitUntil:"domcontentloaded"\}\)/);
 assert.match(browser,/Reopening must reuse a fresh unused token/);
 assert.match(browser,/A used Turnstile token cannot survive another navigation/);
});