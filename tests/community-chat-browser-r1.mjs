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
  await page.addInitScript(()=>{
   localStorage.setItem("zgmini:inflation:favorites:v1",JSON.stringify(["CORE_PCE"]));
   localStorage.setItem("zgmini:debt:favorites:v1",JSON.stringify(["dsr"]));
   localStorage.setItem("zgmini:economic:favorites:v1",JSON.stringify(["growth:G010"]));
   localStorage.setItem("zgmini:liquidity:favorites:v1",JSON.stringify(["sofrIorb","sofrIorbRv20","bankEmergency"]));
  });
  await page.route("**/api/market-score",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({status:"SUCCESS",domains:[{id:"growth",asOfDate:"2026-10-20",indicators:[{id:"G010",label:"제조업 신규주문",score:44.3,status:"READY",observationDate:"2026-10-19"}]}]})}));
  await page.route("**/api/liquidity-crisis-detail",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({status:"READY",asOfDate:"2026-10-20",indicators:[
   {id:"sofrIorb",status:"READY",score:52,value:0.031,unit:"bp",observationDate:"2026-10-20"},
   {id:"sofrIorbRv20",status:"READY",score:67,value:0.001,unit:"bp",observationDate:"2026-10-17"},
   {id:"bankEmergency",status:"MISSING",score:null,value:null,unit:"%",observationDate:null}
  ]})}));
  await page.route("**/api/inflation-detail",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({status:"READY",asOfDate:"2026-10-20",features:{CORE_PCE:{value:2.31,score:63,observationDate:"2026-10-18"}}})}));
  await page.route("**/api/debt-risk-detail",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({status:"READY",asOfDate:"2026-10-20",indicators:[{id:"dsr",status:"READY",value:10.5,score:58,unit:"%",observationDate:"2026-10-17"}]})}));
  await page.goto(base,{waitUntil:"domcontentloaded",timeout:45000});
  const wide=width>=1650;
  const toggle=page.getByRole("button",{name:"시장 채팅 열기"});
  await page.waitForFunction(()=>Boolean(sessionStorage.getItem("zgmini-community-chat-nick-r1")),null,{timeout:30000}).catch(error=>{throw new Error("React client hydration not confirmed; browser errors: "+errors.join(" | ")+"; "+error.message);});
  // First-time visitors dismiss the site introduction before using the rails.
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  await page.locator('dialog[aria-labelledby="zg-about-popup-title"]').waitFor({state:'hidden'});
  await page.waitForFunction(wide=>document.querySelector(".zg-dashboard-side-rails-root")?.getAttribute("data-wide")===(wide?"true":"false"),wide,{timeout:15000});
  const favorites=page.locator("#zg-dashboard-favorites-panel");
  await favorites.locator('a[href="/inflation/"]').waitFor({state:"attached"});
  await favorites.locator('a[href="/debt-risk/"]').waitFor({state:"attached"});
  await favorites.getByText("제조업 신규주문").waitFor({state:"attached"});
  await favorites.getByLabel("즐겨찾기 6개").waitFor({state:"attached"});
  assert.equal(await favorites.locator(".zg-risk-side-intro").count(),0,"Remove redundant saved-count line");
  assert.equal(await favorites.locator(".zg-dashboard-favorite-count").evaluate(el=>getComputedStyle(el).backgroundColor),"rgb(245, 188, 69)","Count badge is yellow");
  await favorites.locator('a[href="/liquidity-crisis/"]').first().getByText("0.031 bp").waitFor({state:"visible",timeout:12000}).catch(async ()=>{
   // On narrow screens the rail starts hidden; attached DOM retains the exact stored preview.
   await favorites.locator('a[href="/liquidity-crisis/"]').first().getByText("0.031 bp").waitFor({state:"attached",timeout:12000});
  });
  assert.equal(await favorites.getByText("0.001 bp").count(),1);
  assert.equal(await favorites.getByText("44.3점").count(),1);
  assert.equal(await favorites.locator(".zg-dashboard-favorite-link svg.lucide-chevron-right").count(),0,"Replace shortcut arrows with data");
  assert.equal(await favorites.getByText("자료 미제공").count(),1,"Missing observation does not become zero");
  assert.equal(await favorites.locator(".zg-dashboard-favorite-card-head").count(),6,"Every favorite has its own titled card");
  assert.equal(await favorites.locator(".zg-dashboard-favorite-status").count(),6,"Every card has a distinct status slot");
  assert.equal(await favorites.getByText("관측 26.10.20").count(),1,"Actual observation date is shown");
  assert.equal(await favorites.locator('a[href="/liquidity-crisis/"]').first().getByText("중립").count(),1);
  assert.equal(await favorites.locator('a[href="/liquidity-crisis/"]').first().locator(".zg-dashboard-favorite-metric small").textContent(),"현재");

  if(wide){
   assert.equal(await favorites.getAttribute("data-open"),"true");
   assert.equal(await toggle.count(),0,"Desktop chat is persistent; no second floating toggle");
   const card=favorites.locator(".zg-dashboard-favorite-link").first();
   const visible=await card.evaluate(el=>{
    const rect=el.getBoundingClientRect(),metric=el.querySelector(".zg-dashboard-favorite-reading").getBoundingClientRect();
    return {cardWidth:Math.round(rect.width),metricInside:metric.right<=rect.right+1};
   });
   assert(visible.cardWidth>=180&&visible.cardWidth<=240&&visible.metricInside,"Desktop mini card is readable within sidebar");

   assert.equal(await page.locator(".zg-container").evaluate(el=>getComputedStyle(el).width!=="0px"),true);
  }else{
   const star=page.getByRole("button",{name:"즐겨찾기 열기"});
   await star.click();
   await favorites.waitFor({state:"visible"});
   assert.equal(await favorites.getAttribute("data-open"),"true");
   // Wait until the slide transition has reached its final on-screen position.
   await page.waitForFunction(()=>{
    const rail=document.querySelector("#zg-dashboard-favorites-panel");
    if(!rail)return false;
    const box=rail.getBoundingClientRect();
    return box.left>=-0.5&&box.right<=window.innerWidth+0.5;
   },null,{timeout:5000});
   const firstCard=favorites.locator(".zg-dashboard-favorite-link").first();
   const mobileLayout=await firstCard.evaluate(el=>{
    const bounds=el.getBoundingClientRect(),head=el.querySelector(".zg-dashboard-favorite-card-head").getBoundingClientRect();
    const metric=el.querySelector(".zg-dashboard-favorite-reading").getBoundingClientRect();
    const foot=el.querySelector(".zg-dashboard-favorite-context").getBoundingClientRect();
    return {inside:bounds.left>=0&&bounds.right<=window.innerWidth,
     order:head.top<metric.top&&metric.top<foot.top,
     metricFits:metric.right<=bounds.right+1};
   });
   assert.deepEqual(mobileLayout,{inside:true,order:true,metricFits:true},"Mobile favorite card visual hierarchy fits viewport");

   await page.getByRole("button",{name:"즐겨찾기 닫기"}).first().click();
   assert.equal(await favorites.getAttribute("data-open"),"false");
   await toggle.waitFor({state:"visible"});
   assert.equal(await page.locator("#zg-community-chat-panel").getAttribute("aria-hidden"),"true");
   await toggle.click();
   assert.equal(await favorites.getAttribute("data-open"),"false","Only one narrow overlay is open");
  }
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
  if(!wide){
   await page.keyboard.press("Escape");
   assert.equal(await panel.getAttribute("aria-hidden"),"true");
   await page.getByRole("button",{name:"시장 채팅 열기"}).click();
  }else{
   assert.equal(await panel.getAttribute("aria-hidden"),"false");
  }
  await page.waitForFunction(()=>document.querySelector(".zg-community-captcha")?.classList.contains("is-verified"),null,{timeout:10000});
  assert.equal(await page.evaluate(()=>window.__zgTurnstileRenderCount),renderCountBeforeClose,"Reopening must reuse a fresh unused token");
  // Full-page navigation must retain the unused verification within the same tab.
  await page.evaluate(()=>sessionStorage.removeItem("zgmini-community-chat-nick-r1"));
  await page.reload({waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>Boolean(sessionStorage.getItem("zgmini-community-chat-nick-r1")),null,{timeout:15000});
  if(!wide)await page.getByRole("button",{name:"시장 채팅 열기"}).click();
  else await page.waitForFunction(()=>document.querySelector(".zg-dashboard-side-rails-root")?.getAttribute("data-wide")==="true",null,{timeout:15000});
  await page.waitForFunction(()=>document.querySelector(".zg-community-captcha")?.classList.contains("is-verified"),null,{timeout:10000});
  assert.equal(await page.evaluate(()=>window.__zgTurnstileRenderCount??0),0,"Navigation must not issue another verification");
  assert.equal(await page.evaluate(()=>Boolean(sessionStorage.getItem("zgmini-community-chat-turnstile-r2"))),true,"A verified unused challenge is preserved for navigation");
  await page.locator("#zg-community-input").fill("오늘 시장 전망이 궁금해요");
  await page.getByRole("button",{name:"메시지 전송"}).waitFor({state:"visible"});
  await page.waitForFunction(()=>!document.querySelector('button[aria-label="메시지 전송"]')?.hasAttribute("disabled"),{timeout:15000});
  await page.getByRole("button",{name:"메시지 전송"}).click();
  await page.getByText("오늘 시장 전망이 궁금해요").waitFor({state:"visible",timeout:10000});
  await page.waitForFunction(()=>Boolean(window.__zgTurnstileRenderCount)&&!document.querySelector(".zg-community-captcha")?.classList.contains("is-verified"),null,{timeout:10000});
  assert((await captcha.boundingBox())?.height>=67,"Sending must consume token and show a new challenge for the next message");
  assert.equal(await page.evaluate(()=>sessionStorage.getItem("zgmini-community-chat-turnstile-r2")),null,"A used Turnstile token cannot survive another navigation");
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
  if(!wide){
   await page.keyboard.press("Escape");
   assert.equal(await panel.getAttribute("aria-hidden"),"true");
   if(width!==390) assert.equal(await panel.evaluate(el=>getComputedStyle(el).animationName),"zg-community-exit");
   assert.equal(await page.getByRole("button",{name:"시장 채팅 열기"}).getAttribute("aria-expanded"),"false");
  }else{
   assert.equal(await panel.getAttribute("aria-hidden"),"false","Desktop chat stays visible");
  }
  await page.close();
  console.log("PASS: chat browser width="+width+" with mocked API, captcha, report and Escape");
 }
 assert.equal(errors.length,0,errors.join("\n"));
}finally{await browser.close();}
