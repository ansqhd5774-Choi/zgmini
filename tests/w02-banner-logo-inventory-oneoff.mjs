import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1200,height:800}});
try{
  const resp=await page.goto('https://zgmini.kr/market-calendar/',{waitUntil:'domcontentloaded',timeout:60000});
  assert.equal(resp?.status(),200);
  const close=page.getByRole('button',{name:'닫기',exact:true}).first();
  if(await close.isVisible().catch(()=>false))await close.click({timeout:5000});
  await page.locator('.zg-fomc-bar').click();
  await page.waitForFunction(()=>document.querySelectorAll('.zg-schedule-kind.is-earnings').length>=1,null,{timeout:45000});
  const items=await page.locator('.zg-schedule-item').evaluateAll(els=>els.filter(x=>x.querySelector('.zg-schedule-kind.is-earnings')).map(x=>({
    name:x.querySelector('.zg-schedule-name-text')?.textContent?.trim(),
    ticker:x.querySelector('.zg-schedule-ticker-fallback')?.getAttribute('aria-label')?.split(' ')[0]||
      x.querySelector('.zg-schedule-company-logo')?.getAttribute('alt')?.split(' ')[0]||null,
    logo:x.querySelector('.zg-schedule-company-logo')?'image-or-svg':'ticker-fallback',
    domain:x.querySelector('img.zg-schedule-company-logo')?.getAttribute('src')?.match(/domain=([^&]+)/)?.[1]||null
  })));
  console.log('W02_PUBLIC_LOGO_INVENTORY '+JSON.stringify(items));
  assert.ok(items.length>=12&&items.length<=20);
}finally{await browser.close();}
