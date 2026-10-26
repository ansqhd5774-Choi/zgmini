import assert from "node:assert/strict";
import {mkdirSync} from "node:fs";
import {chromium} from "playwright";
mkdirSync("artifacts/risk-detail-side-rails",{recursive:true});
const base=process.env.CHAT_PREVIEW_URL??"http://127.0.0.1:5173";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const errors=[];
try{
 for(const width of [390,768,1440,1650,1920]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:width===390?"reduce":"no-preference"});
  let chatRequests=0;
  page.on("pageerror",e=>errors.push(width+":"+e.message));
  await page.route("**/api/community/messages",route=>{
   chatRequests++;
   return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({messages:[],writeEnabled:false,siteKey:null})});
  });
  await page.goto(base+"/inflation/",{waitUntil:"domcontentloaded",timeout:60000});
  await page.locator('dialog[aria-labelledby="zg-about-popup-title"]').waitFor({state:"visible"});
  await page.getByRole("button",{name:"닫기",exact:true}).click();
  await page.locator('dialog[aria-labelledby="zg-about-popup-title"]').waitFor({state:"hidden"});
  await page.locator(".zg-risk-only-nav").waitFor({state:"attached",timeout:45000});
  const desktop=width>=1650;
  await page.waitForFunction(expect=>document.querySelector(".zg-risk-only-nav")?.getAttribute("data-wide")===expect,desktop?"true":"false",{timeout:15000});
  const list=page.locator("#zg-risk-side-nav-panel"),main=page.locator("main").first();
  const links=list.locator("nav a");
  assert.equal(await links.count(),8,"exact eight risk destinations");
  assert.equal(await list.locator('a[aria-current="page"]').getAttribute("href"),"/inflation/");
  assert.equal(await page.locator(".zg-risk-side-action").first().isVisible(),!desktop,"nav icon only in narrow mode");
  assert.equal(await page.locator(".zg-risk-side-right").count(),0,"risk route has no right chat rail");
  assert.equal(await page.locator("#zg-community-chat-panel").count(),0,"risk route never mounts chat panel");
  assert.equal(await page.getByRole("button",{name:/시장 채팅 (열기|닫기)/}).count(),0,"risk route has no chat toggle");
  if(desktop){
   assert(await list.isVisible(),"desktop left navigation rail visible");
   const [lb,mb]=await Promise.all([list.boundingBox(),main.boundingBox()]);
   assert(lb&&mb&&lb.x+lb.width<=mb.x+3&&mb.x+mb.width<=width+3,"left rail and expanded content do not overlap");
   assert(mb.width>1152,"released chat width is available to risk detail content");
  }else{
   assert.equal(await list.getAttribute("aria-hidden"),"true");
   const left=page.getByRole("button",{name:"위험지표 목록 열기"});
   await left.click();
   assert.equal(await list.getAttribute("aria-hidden"),"false");
   await page.waitForFunction(()=>{const b=document.querySelector("#zg-risk-side-nav-panel")?.getBoundingClientRect();return Boolean(b&&b.left>=0&&b.right<innerWidth);},null,{timeout:5000});
   let b=await list.boundingBox();
   assert(b&&b.x>=0&&b.x+b.width<width&&b.height<900*.8,"partial navigation overlay fits viewport");
   assert(Number(await list.evaluate(e=>getComputedStyle(e).backgroundColor.match(/[\d.]+\)$/)?.[0].replace(")","")??1))<1,"nav rail background is translucent");
   await page.getByRole("button",{name:"위험지표 목록 닫기"}).last().click();
   assert.equal(await list.getAttribute("aria-hidden"),"true","second press closes navigation");
   await left.click();
   await page.keyboard.press("Escape");
   assert.equal(await list.getAttribute("aria-hidden"),"true","Escape dismisses navigation");
  }
  await page.waitForTimeout(150);
  assert.equal(chatRequests,0,"risk route must never fetch chat messages");
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  assert(overflow<=2,"no horizontal overflow "+width+": "+overflow);
  await page.screenshot({path:"artifacts/risk-detail-side-rails/inflation-"+width+".png"});
  await page.close();
  console.log("PASS navigation-only risk rail "+width);
 }
 assert.deepEqual(errors,[],"browser runtime errors");
}finally{await browser.close();}
