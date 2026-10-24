import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

// Isolated local browser fixtures. No real account, data write, or analytics.
const base=process.env.CHAT_PREVIEW_URL??'http://127.0.0.1:5173';
mkdirSync('artifacts/dashboard-deferred-ui',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const width of [390,1440])for(const signedIn of [false,true]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const modules=[],errors=[];
  page.on('request',request=>modules.push(new URL(request.url()).pathname));
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>sessionStorage.setItem('zgmini-about-intro-dismissed-r1','1'));
  await page.route('https://**',route=>route.abort());
  await page.route('**/api/**',route=>{
   const path=new URL(route.request().url()).pathname;
   const payload=path==='/api/session'?{user:signedIn?{displayName:'UI fixture',email:'fixture@example.invalid'}:null}
    :path==='/api/favorites'?{favorites:[]}
    :path==='/api/market-data'?{status:'fallback',updatedAt:'',indicators:{},summary:[]}
    :{status:'UNAVAILABLE'};
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});
  });
  await page.goto(base,{waitUntil:'networkidle',timeout:45000});
  await page.locator('.zg-dashboard[data-view="dashboard"]').waitFor({state:'visible'});
  if(signedIn){
   const trigger=page.getByRole('button',{name:'사용자 설정',exact:true});
   await trigger.waitFor({state:'visible',timeout:15000});
   await trigger.click();
   const dialog=page.getByRole('dialog');
   await dialog.getByRole('heading',{name:'사용자 설정',exact:true}).waitFor({state:'visible'});
   assert.equal(await dialog.getByText('내 즐겨찾기 0개',{exact:true}).count(),1);
   await page.screenshot({path:`artifacts/dashboard-deferred-ui/settings-${width}.png`});
   await page.keyboard.press('Escape');
   await dialog.waitFor({state:'hidden'});
  }else{
   assert.equal(await page.getByRole('button',{name:'사용자 설정',exact:true}).count(),0);
   assert.deepEqual(modules.filter(path=>/\/components\/ui\/(tabs|select|accordion|sheet)\.tsx$/.test(path)||path.endsWith('/app/core-pce-row.tsx')),[],
    'Anonymous dashboard must not request secondary UI modules');
   await page.screenshot({path:`artifacts/dashboard-deferred-ui/dashboard-${width}.png`});
  }
  assert.deepEqual(errors,[],`No client errors at ${width}px, signedIn=${signedIn}`);
  console.log(`PASS dashboard deferred UI ${width}px signedIn=${signedIn}`);
  await page.close();
 }
}finally{await browser.close();}
