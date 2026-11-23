// W05 one-time Production acceptance: public GET and responsive UI ONLY.
// No provider requests, PC SQLite, D1 writes, authenticated APIs or deployment.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

const ORIGIN='https://zgmini.kr';
const API=ORIGIN+'/api/earnings-recession-indicators';
const PAGE=ORIGIN+'/earnings-recession/';
const IDS=['bls_ppi_final_demand_yoy_sa','bls_ppi_final_demand_index',
  'bls_ppi_goods_yoy_sa','bls_ppi_goods_index','bls_unit_labor_cost_yoy',
  'bls_ppi_services_yoy_sa','bls_ppi_services_index'];
const SERVICE=new Set(IDS.slice(5));
const dir='artifacts/w05-production-readonly';
mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const result={schema:'ZGMINI_W05_PRODUCTION_READONLY_ONCE_V1',observedAt:new Date().toISOString(),
  origin:ORIGIN,api:null,viewports:[],providerRequests:0,d1Writes:0,operationalWrites:0};
const failure=[];
try{
  const apiContext=await browser.newContext({locale:'ko-KR',timezoneId:'Asia/Seoul',serviceWorkers:'block'});
  try{
    let res;
    try{
      res=await apiContext.request.get(API,{timeout:30000});
      const header=res.headers();
      let json=null;
      try{json=await res.json();}catch{}
      const rows=Array.isArray(json?.rows)?json.rows:[];
      const service=rows.filter(row=>SERVICE.has(row?.indicatorId));
      const sample=service.map(row=>({id:row.indicatorId,status:row.status,
        freshness:row.freshness?.status??null,value:row.value??null,
        unit:row.unit??null,observationPeriod:row.observationPeriod??null,
        sourceVersion:json?.sourceVersion??null}));
      result.api={httpStatus:res.status(),reason:json?.reason??null,
        schemaVersion:json?.schemaVersion??null,overallStatus:json?.status??null,
        serviceHeader:header['x-earnings-c-service']??null,
        publishedAt:header['x-projection-published-at']??null,
        sourceAt:header['x-projection-source-at']??null,
        coverage:json?.coverage??null,rowCount:rows.length,
        indicatorIds:rows.map(row=>row?.indicatorId??null),service:sample};
      console.log('W05_PRODUCTION_API '+JSON.stringify(result.api));
      if(res.status()!==200)failure.push('API_HTTP_'+res.status()+'_'+(json?.reason??'NO_REASON'));
      else{
        if(json?.schemaVersion!=='earnings-companion-c-r4-v1')failure.push('API_SCHEMA_MISMATCH');
        if(rows.length!==7||!IDS.every(id=>rows.some(row=>row.indicatorId===id)))
          failure.push('API_BASE5_SERVICE2_COMPOSITION_MISSING');
        if(header['x-earnings-c-service']!=='READY')failure.push('API_SERVICE_'+(header['x-earnings-c-service']??'NO_HEADER'));
        if(service.length!==2||!service.every(row=>row.status==='READY'&&
          row.freshness?.status==='FRESH'&&Number.isFinite(row.value)))
          failure.push('API_SERVICE_PAIR_NOT_READY_FRESH');
      }
    }catch(e){
      result.api={httpStatus:null,reason:'API_NETWORK_OR_PARSE_ERROR',
        name:/^[A-Za-z]+$/.test(e?.name??'')?e.name:'Error'};
      failure.push('API_READ_UNAVAILABLE');
      console.log('W05_PRODUCTION_API '+JSON.stringify(result.api));
    }
  }finally{await apiContext.close();}

  for(const width of [390,1440]){
    const mobile=width===390;
    const context=await browser.newContext({viewport:{width,height:900},
      locale:'ko-KR',timezoneId:'Asia/Seoul',serviceWorkers:'block',
      isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'});
    const page=await context.newPage();
    const jsErrors=[];
    page.on('pageerror',error=>jsErrors.push(error.name??'Error'));
    await page.addInitScript(()=>sessionStorage.setItem('zgmini-about-intro-dismissed-r1','1'));
    let status=null;
    try{
      const response=await page.goto(PAGE,{waitUntil:'domcontentloaded',timeout:60000});
      status=response?.status()??null;
      await page.locator('.earnings-r2-cost-status').waitFor({state:'attached',timeout:20000});
      await page.waitForFunction(()=>{const text=document.querySelector('.earnings-r2-cost-status')?.textContent??'';
        return text.includes('개 연결')||text.includes('조회 실패')||text.includes('원자료 준비 중');
      },null,{timeout:25000}).catch(()=>{});
      const table=page.locator('tr.earnings-r2-cost-row');
      const mobileCards=page.locator('article.earnings-r2-cost-mobile-card');
      const serviceTable=table.filter({hasText:/서비스 생산자물가/});
      const serviceMobile=mobileCards.filter({hasText:/서비스 생산자물가/});
      const active=mobile?serviceMobile:serviceTable;
      const activeTexts=await active.allTextContents();
      const visible=await Promise.all([...Array(await active.count()).keys()].map(i=>active.nth(i).isVisible()));
      const summary=await page.locator('.earnings-r2-cost-status').first().innerText();
      const evidence={width,httpStatus:status,summary,desktopServiceRows:await serviceTable.count(),
        mobileServiceCards:await serviceMobile.count(),activeServiceVisible:visible.filter(Boolean).length,
        activeServiceTexts:activeTexts.map(t=>t.replace(/\s+/g,' ').trim().slice(0,160)),
        pageErrors:jsErrors.slice(0,5)};
      result.viewports.push(evidence);
      await page.screenshot({path:dir+'/earnings-'+width+'.png',fullPage:false});
      console.log('W05_PRODUCTION_VIEWPORT '+JSON.stringify(evidence));
      if(status!==200)failure.push('PAGE_HTTP_'+width+'_'+status);
      if(evidence.activeServiceVisible!==2)failure.push('UI_SERVICE_TWO_MISSING_'+width);
      if(evidence.pageErrors.length)failure.push('UI_JS_ERRORS_'+width);
    }catch(error){
      result.viewports.push({width,httpStatus:status,errorCode:'PAGE_VALIDATION_INCOMPLETE',
        errorName:/^[A-Za-z]+$/.test(error?.name??'')?error.name:'Error'});
      failure.push('PAGE_VALIDATION_INCOMPLETE_'+width);
      console.log('W05_PRODUCTION_VIEWPORT_FAILED '+JSON.stringify(result.viewports.at(-1)));
    }finally{await context.close();}
  }
}finally{
  result.failures=[...new Set(failure)];
  result.status=result.failures.length?'FAIL':'PASS';
  writeFileSync(dir+'/evidence.json',JSON.stringify(result,null,2)+'\n');
  await browser.close();
}
console.log('W05_PRODUCTION_RESULT '+JSON.stringify({status:result.status,failures:result.failures}));
assert.equal(result.status,'PASS','W05 public GET and actual 390px/1440px UI must show 5+2 verified stored observations');
