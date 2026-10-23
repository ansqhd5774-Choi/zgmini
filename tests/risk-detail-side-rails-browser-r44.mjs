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
  page.on("pageerror",e=>errors.push(width+":"+e.message));
  await page.route("**/api/community/messages",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({messages:[],writeEnabled:false,siteKey:null})}));
  await page.goto(base+"/inflation/",{waitUntil:"domcontentloaded",timeout:60000});
  await page.locator('dialog[aria-labelledby="zg-about-popup-title"]').waitFor({state:'visible'});
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  await page.locator('dialog[aria-labelledby="zg-about-popup-title"]').waitFor({state:'hidden'});
  await page.locator(".zg-risk-side-rails-root").waitFor({state:"attached",timeout:45000});
  const desktop=width>=1650;
  await page.waitForFunction(expect=>document.querySelector(".zg-risk-side-rails-root")?.getAttribute("data-wide")===expect,desktop?"true":"false",{timeout:15000});
  const list=page.locator("#zg-risk-side-nav-panel"),chat=page.locator(".zg-risk-side-right"),main=page.locator("main").first();
  const links=list.locator("nav a");
  assert.equal(await links.count(),8,"exact eight risk destinations");
  assert.equal(await list.locator('a[aria-current="page"]').getAttribute("href"),"/inflation/");
  assert.equal(await page.locator(".zg-risk-side-action").first().isVisible(),!desktop,"icon controls only in narrow mode");
  if(desktop){
   assert(await list.isVisible(),"desktop left rail visible");
   assert(await chat.isVisible(),"desktop right rail visible");
   assert.equal(await chat.locator(".zg-community-panel").getAttribute("aria-hidden"),"false");
   const [lb,mb,cb]=await Promise.all([list.boundingBox(),main.boundingBox(),chat.boundingBox()]);
   assert(lb&&mb&&cb&&lb.x+lb.width<=mb.x+3&&mb.x+mb.width<=cb.x+3,"left | content | right must not overlap on desktop");
  }else{
   assert.equal(await list.getAttribute("aria-hidden"),"true");
   const left=page.getByRole("button",{name:"위험지표 목록 열기"});
   const right=page.getByRole("button",{name:"시장 채팅 열기"});
   await left.click();
   assert.equal(await list.getAttribute("aria-hidden"),"false");
   await page.waitForFunction(()=>{const b=document.querySelector("#zg-risk-side-nav-panel")?.getBoundingClientRect();return Boolean(b&&b.left>=0&&b.right<innerWidth);},null,{timeout:5000});
   let b=await list.boundingBox();
   assert(b&&b.x>=0&&b.x+b.width<width&&b.height<900*.8,"left partial overlay fits viewport");
   assert(Number(await list.evaluate(e=>getComputedStyle(e).backgroundColor.match(/[\d.]+\)$/)?.[0].replace(')','')??1))<1,"nav rail background is translucent");
   await page.getByRole("button",{name:"위험지표 목록 닫기"}).last().click();
   assert.equal(await list.getAttribute("aria-hidden"),"true","second press closes left");
   await right.click();
   assert.equal(await chat.getAttribute("aria-hidden"),"false");
   await page.waitForFunction(()=>{const b=document.querySelector(".zg-risk-side-right")?.getBoundingClientRect();return Boolean(b&&b.left>0&&b.right<=innerWidth+1);},null,{timeout:5000});
   b=await chat.boundingBox();assert(b&&b.x>0&&b.x+b.width<=width+1&&b.height<900*.8,"right partial overlay fits viewport");
   await page.getByRole("button",{name:"시장 채팅 닫기"}).last().click();
   assert.equal(await chat.getAttribute("aria-hidden"),"true","second press closes right");
   await left.click();await right.click();
   assert.equal(await list.getAttribute("aria-hidden"),"true","opening chat closes nav");
   await page.keyboard.press("Escape");
   assert.equal(await chat.getAttribute("aria-hidden"),"true","Escape dismisses chat");
  }
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  assert(overflow<=2,"no horizontal overflow "+width+": "+overflow);
  await page.screenshot({path:"artifacts/risk-detail-side-rails/inflation-"+width+".png"});
  await page.close();
  console.log("PASS responsive risk rails "+width);
 }
 assert.deepEqual(errors,[],"browser runtime errors");
}finally{await browser.close();}
