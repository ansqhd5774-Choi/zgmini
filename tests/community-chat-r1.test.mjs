import test from "node:test";
import assert from "node:assert/strict";
import {normalizeChatDraft,chatRateAllowed} from "../lib/community-chat-r1.mjs";
test("chat draft rejects empty or invalid fields",()=>{
 assert.equal(normalizeChatDraft(null),null);
 assert.equal(normalizeChatDraft({nickname:"",body:"hello"}),null);
 assert.equal(normalizeChatDraft({nickname:"익명",body:""}),null);
 assert.equal(normalizeChatDraft({nickname:"익명",body:"x".repeat(301)}),null);
 assert.equal(normalizeChatDraft({nickname:"익명",body:"https://spam.example"}),null);
 assert.equal(normalizeChatDraft({nickname:"\n",body:"hi"}),null);
});
test("chat draft permits 300 Korean characters and trims",()=>{
 const draft=normalizeChatDraft({nickname:" 익명 ",body:"  "+"가".repeat(300)+"  "});
 assert.equal(draft?.nickname,"익명");assert.equal(draft?.body.length,300);
});
test("chat rate caps 3/minute and 100/day",()=>{
 assert.equal(chatRateAllowed(3,100),true);
 assert.equal(chatRateAllowed(4,1),false);
 assert.equal(chatRateAllowed(1,101),false);
 assert.equal(chatRateAllowed(NaN,1),false);
});
