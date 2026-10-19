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
  await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",route=>route.fulfill({status:200,contentType:"application/javascript",body:"window.turnstile={render:(el,o)=>{el.textContent='Turnstile test';window.__zgTurnstileRenderCount=(window.__zgTurnstileRenderCount||0)+1;window.__zgTurnstileCallbacks=o;return 'test-id';},remove:()=>{},reset:()=>{window.__zgTurnstileResets=(window.__zgTurnstileResets||0)+1;}}"}));
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
  if(width>390){
   const enterDirection=await panel.evaluate(el=>{
    const animation=el.getAnimations().find(a=>a.animationName==="zg-community-enter");
    return animation?.effect?.getKeyframes().map(k=>String(k.transform??""))??[];
   });
   assert.equal(enterDirection[0],"translateX(100%)","Chat must enter from right (positive X)");
   assert.match(enterDirection.at(-1)??"",/^translateX\(0(?:px)?\)$/,"Chat must settle at its fixed right position");
  }
  await page.waitForFunction(viewport=>{
    const rect=document.querySelector("#zg-community-chat-panel")?.getBoundingClientRect();
    return Boolean(rect&&rect.x>=-1&&rect.right<=viewport+1);
   },width,{timeout:5000});
  const bounds=await panel.boundingBox(); assert(bounds&&bounds.x>=-1&&bounds.x+bounds.width<=width+1,"Panel must fit viewport "+width);
  assert.equal(await page.getByRole("heading",{name:"시장 채팅"}).count(),0,"chat header uses compact text, not heading");
  const captcha=page.locator(".zg-community-captcha");
  await captcha.waitFor({state:"visible",timeout:15000});
  assert((await captcha.boundingBox())?.height>=67,"Challenge must be visible and reserve its height before verification");
  await page.waitForFunction(()=>Boolean(window.__zgTurnstileCallbacks?.callback),null,{timeout:15000});
  await page.evaluate(()=>window.__zgTurnstileCallbacks.callback("test-browser-token"));
  await page.waitForFunction(()=>document.querySelector(".zg-community-captcha")?.classList.contains("is-verified"),null,{timeout:10000});
  assert.equal(await captcha.evaluate(el=>el.getBoundingClientRect().height),0,"Successful verification must reclaim challenge height");
  assert.equal(await captcha.evaluate(el=>el.textContent?.includes("Turnstile test")),true,"Challenge remains mounted for expiry/reset");
  await page.evaluate(()=>window.__zgTurnstileCallbacks["expired-callback"]());
  await page.waitForFunction(()=>!document.querySelector(".zg-community-captcha")?.classList.contains("is-verified"),null,{timeout:10000});
  assert((await captcha.boundingBox())?.height>=67,"Expired token must restore challenge");
  await page.evaluate(()=>window.__zgTurnstileCallbacks.callback("test-browser-token"));
  await page.waitForFunction(()=>document.querySelector(".zg-community-captcha")?.classList.contains("is-verified"),null,{timeout:10000});
  const renderCountBeforeClose=await page.evaluate(()=>window.__zgTurnstileRenderCount);
  await page.keyboard.press("Escape");
  assert.equal(await panel.getAttribute("aria-hidden"),"true");
  await page.getByRole("button",{name:"시장 채팅 열기"}).click();
  await page.waitForFunction(()=>!document.querySelector(".zg-community-captcha")?.classList.contains("is-verified"),null,{timeout:10000});
  assert((await captcha.boundingBox())?.height>=67,"Reopened chat must not retain stale verification");
  await page.waitForFunction(before=>window.__zgTurnstileRenderCount>before,renderCountBeforeClose,{timeout:10000});
  await page.evaluate(()=>window.__zgTurnstileCallbacks.callback("test-browser-token"));
  await page.waitForFunction(()=>document.querySelector(".zg-community-captcha")?.classList.contains("is-verified"),null,{timeout:10000});
  await page.locator("#zg-community-input").fill("오늘 시장 전망이 궁금해요");
  await page.getByRole("button",{name:"메시지 전송"}).waitFor({state:"visible"});
  await page.waitForFunction(()=>!document.querySelector('button[aria-label="메시지 전송"]')?.hasAttribute("disabled"),{timeout:15000});
  await page.getByRole("button",{name:"메시지 전송"}).click();
  await page.getByText("오늘 시장 전망이 궁금해요").waitFor({state:"visible",timeout:10000});
  await page.waitForFunction(()=>window.__zgTurnstileResets>0&&!document.querySelector(".zg-community-captcha")?.classList.contains("is-verified"),null,{timeout:10000});
  assert((await captcha.boundingBox())?.height>=67,"Sending must reset token and show challenge for the next message");
  const messageItem=page.locator(".zg-community-item").first();
  const messageLine=messageItem.locator(".zg-community-copy");
  const lineText=await messageLine.textContent();
  assert.match(lineText??"",/^익명(?:[0-9]{4}|방문자) : 오늘 시장 전망이 궁금해요 \d{2}:\d{2}$/,"Nickname : message time is inline without parentheses");
  const singleLine=await messageItem.evaluate(item=>{
    const copy=item.querySelector(".zg-community-copy");
    const body=item.querySelector(".zg-community-body");
    const nick=copy.querySelector("b");
    const time=copy.querySelector("time");
    const before=copy.clientHeight;
    const original=body.textContent;
    const title=body.getAttribute("title");
    const timeFont=getComputedStyle(time).fontSize;
    const noWrap=[copy,body,time].every(el=>getComputedStyle(el).whiteSpace==="nowrap");
    const compactTime=Number.parseFloat(timeFont)<=10;
    body.textContent="증시 흐름을 긴 문장으로 설명한 내용입니다 ".repeat(30);
    const lineStillOne=copy.clientHeight===before;
    const ellipsis=getComputedStyle(body).textOverflow==="ellipsis"&&body.scrollWidth>body.clientWidth;
    const sameRow=Math.abs(nick.getBoundingClientRect().top-time.getBoundingClientRect().top)<12;
    body.textContent=original;
    return {noWrap,compactTime,lineStillOne,ellipsis,sameRow,titlePreserved:title===original};
  });
  assert.deepEqual(singleLine,{noWrap:true,compactTime:true,lineStillOne:true,ellipsis:true,sameRow:true,titlePreserved:true},"Every message stays one row, even when long");
  const report=messageItem.getByRole("button",{name:"메시지 신고"});
  assert.equal((await report.textContent())?.trim(),"","Report button must display only the icon");
  if(width>430){
   assert.equal(await report.evaluate(el=>getComputedStyle(el).opacity),"0","Report icon hidden until hover");
   await messageItem.hover();
   await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector(".zg-community-item .zg-community-report")).opacity)>=.99);
  }else{
   assert(Number(await report.evaluate(el=>getComputedStyle(el).opacity))>.5,"Mobile report icon accessible without hover");
  }
  await page.screenshot({path:`artifacts/community-chat-browser/chat-open-${width}.png`});
  await report.click();
  const reportedIcon=messageItem.getByRole("button",{name:"신고 완료"});
  await reportedIcon.waitFor({state:"attached",timeout:10000});
  assert.equal(await reportedIcon.isDisabled(),true);
  await page.keyboard.press("Escape");
  assert.equal(await panel.getAttribute("aria-hidden"),"true");
  if(width!==390) assert.equal(await panel.evaluate(el=>getComputedStyle(el).animationName),"zg-community-exit");
  assert.equal(await page.getByRole("button",{name:"시장 채팅 열기"}).getAttribute("aria-expanded"),"false");
  await page.close();
  console.log("PASS: chat browser width="+width+" with mocked API, captcha, report and Escape");
 }
 assert.equal(errors.length,0,errors.join("\n"));
}finally{await browser.close();}
