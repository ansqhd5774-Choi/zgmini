import assert from "node:assert/strict";
import {mkdirSync} from "node:fs";
mkdirSync("artifacts/community-chat-browser",{recursive:true});
import {chromium} from "playwright";
const base=process.env.CHAT_PREVIEW_URL??"http://127.0.0.1:5173";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const errors=[];
try{
 for(const width of [390,768,1440,1920]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:width===390?"reduce":"no-preference"});
  let stored=[];
  await page.route("**/api/community/messages",async route=>{
   const req=route.request();
   if(req.method()==="POST"){
    const body=req.postDataJSON();
    assert.equal(body.nickname.startsWith("익명"),true);
    assert.equal(body.body,"오늘 시장 전망이 궁금해요");
    assert.equal(body.turnstileToken,"test-browser-token");
    stored=[{id:"ac3ac84a-af50-432c-8bd2-13303421b401",nickname:body.nickname,body:body.body,created_at:"2026-10-19T00:00:00Z"}];
    return route.fulfill({status:201,contentType:"application/json",body:JSON.stringify({id:stored[0].id,created_at:stored[0].created_at})});
   }
   return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({messages:stored,writeEnabled:true,siteKey:"test-site"})});
  });
  await page.route("**/api/community/reports",r=>r.fulfill({status:200,contentType:"application/json",body:'{"accepted":true}'}));
  await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",route=>route.fulfill({status:200,contentType:"application/javascript",body:"window.turnstile={render:(el,o)=>{el.textContent='Turnstile test';setTimeout(()=>o.callback('test-browser-token'),0);return 'test-id';},remove:()=>{},reset:()=>{}}"}));
  page.on("pageerror",error=>errors.push(width+": "+error.message));
  await page.goto(base,{waitUntil:"domcontentloaded",timeout:45000});
  const toggle=page.getByRole("button",{name:"시장 채팅 열기"});
  await toggle.waitFor({state:"visible",timeout:45000});
  await page.waitForFunction(()=>Boolean(sessionStorage.getItem("zgmini-community-chat-nick-r1")),null,{timeout:30000}).catch(error=>{throw new Error("React client hydration not confirmed; browser errors: "+errors.join(" | ")+"; "+error.message);});
  assert.equal(await page.locator("#zg-community-chat-panel").getAttribute("aria-hidden"),"true");
  await toggle.click();
  const panel=page.locator("#zg-community-chat-panel");
  await panel.waitFor({state:"visible",timeout:15000});
  assert.equal(await panel.getAttribute("aria-hidden"),"false");
  const animation=await panel.evaluate(el=>getComputedStyle(el).animationName);
  assert.equal(animation,width===390?"none":"zg-community-enter","Opening animation at viewport "+width);
  const bounds=await panel.boundingBox(); assert(bounds&&bounds.x>=-1&&bounds.x+bounds.width<=width+1,"Panel must fit viewport "+width);
  assert.equal(await page.getByRole("heading",{name:"시장 채팅"}).count(),0,"chat header uses compact text, not heading");
  await page.locator("#zg-community-input").fill("오늘 시장 전망이 궁금해요");
  await page.getByRole("button",{name:"메시지 전송"}).waitFor({state:"visible"});
  await page.waitForFunction(()=>!document.querySelector('button[aria-label="메시지 전송"]')?.hasAttribute("disabled"),{timeout:15000});
  await page.getByRole("button",{name:"메시지 전송"}).click();
  await page.getByText("오늘 시장 전망이 궁금해요").waitFor({state:"visible",timeout:10000});
  await page.screenshot({path:`artifacts/community-chat-browser/chat-open-${width}.png`});
  await page.getByRole("button",{name:"메시지 신고"}).click();
  await page.getByText("신고됨").waitFor({state:"visible"});
  await page.keyboard.press("Escape");
  assert.equal(await panel.getAttribute("aria-hidden"),"true");
  if(width!==390) assert.equal(await panel.evaluate(el=>getComputedStyle(el).animationName),"zg-community-exit");
  assert.equal(await page.getByRole("button",{name:"시장 채팅 열기"}).getAttribute("aria-expanded"),"false");
  await page.close();
  console.log("PASS: chat browser width="+width+" with mocked API, captcha, report and Escape");
 }
 assert.equal(errors.length,0,errors.join("\n"));
}finally{await browser.close();}
