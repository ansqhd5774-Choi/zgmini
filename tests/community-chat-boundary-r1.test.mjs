import test from "node:test";
import assert from "node:assert/strict";
import {communityChatApi,isCommunityChatPath} from "../worker/community-chat-api-r1.mjs";

const origin="https://zgmini.kr";
const message="/api/community/messages";
const base={COMMUNITY_CHAT_HASH_SECRET:"isolated-test-secret",COMMUNITY_CHAT_TURNSTILE_SECRET:"test-secret",COMMUNITY_CHAT_SITE_KEY:"sitekey",COMMUNITY_CHAT_ADMIN_SECRET:"admin-secret"};
function req(path,method="GET",body=null,headers={}){
 return new Request(origin+path,{method,headers:{origin,"content-type":"application/json","cf-connecting-ip":"192.0.2.10",...headers},...(body===null?{}:{body:JSON.stringify(body)})});
}
function db(){
 const calls=[],records=[];let attempts=0;
 return {calls,records,prepare(sql){calls.push(sql);return {
  bind(...values){this.values=values;return this;},
  async first(){if(sql.includes("RETURNING minute_count"))return {minute_count:++attempts,day_count:attempts};if(sql.includes("COUNT(*)"))return {n:0};return null;},
  async all(){return {results:records};},
  async run(){if(sql.includes("INSERT INTO community_chat_messages"))records.push({id:this.values[0],nickname:this.values[1],body:this.values[2],created_at:this.values[3]});return {meta:{changes:1}};}
 };}};
}
test("only three exact chat paths bypass the financial API handler",()=>{
 assert.equal(isCommunityChatPath(message),true);
 assert.equal(isCommunityChatPath("/api/community/reports"),true);
 assert.equal(isCommunityChatPath("/api/internal/community/moderation"),true);
 assert.equal(isCommunityChatPath("/api/market-score"),false);
 assert.equal(isCommunityChatPath("/api/community/messages/other"),false);
});
test("missing chat binding refuses both reads and writes while legacy DB is ignored",async()=>{
 const env={...base,DB_CORE:{},DB_HISTORY:{}};
 assert.equal((await communityChatApi(req(message),env)).status,503);
 assert.equal((await communityChatApi(req(message,"POST",{nickname:"익명",body:"hello",turnstileToken:"x"}),env)).status,503);
});
test("anonymous write requires origin, token, hostname and separate chat DB",async()=>{
 const storage=db(),env={...base,DB_COMMUNITY:storage};
 const invalid=req(message,"POST",{nickname:"익명",body:"hello",turnstileToken:"token"});
 assert.equal((await communityChatApi(invalid,env,{fetchImpl:async()=>Response.json({success:true,hostname:"evil.example"})})).status,403);
 assert.equal(storage.records.length,0);
 const noOrigin=req(message,"POST",{nickname:"익명",body:"hello",turnstileToken:"token"},{origin:"https://attacker.example"});
 assert.equal((await communityChatApi(noOrigin,env)).status,403);
 const valid=req(message,"POST",{nickname:"익명",body:"안녕하세요",turnstileToken:"test-token"});
 const result=await communityChatApi(valid,env,{fetchImpl:async()=>Response.json({success:true,hostname:"zgmini.kr"}),now:()=>1800000000000});
 assert.equal(result.status,201);assert.equal(storage.records.length,1);assert.equal(storage.records[0].body,"안녕하세요");
 assert.equal(storage.calls.every(x=>x.includes("community_chat_")),true);
});
test("fourth post in minute is blocked, hidden financial DB is never contacted",async()=>{
 const storage=db(),env={...base,DB_COMMUNITY:storage,DB_CORE:{prepare(){throw Error("financial DB was touched");}}};
 for(let i=0;i<4;i++){const r=await communityChatApi(req(message,"POST",{nickname:"익명",body:"hello"+i,turnstileToken:"token"}),env,{fetchImpl:async()=>Response.json({success:true,hostname:"zgmini.kr"}),now:()=>1800000000000});assert.equal(r.status,i===3?429:201);}
 assert.equal(storage.records.length,3);
});
test("admin moderation refuses absent or wrong bearer secret",async()=>{
 const env={...base,DB_COMMUNITY:db()};
 assert.equal((await communityChatApi(req("/api/internal/community/moderation"),env)).status,401);
 assert.equal((await communityChatApi(req("/api/internal/community/moderation","GET",null,{authorization:"Bearer wrong"}),env)).status,401);
});
