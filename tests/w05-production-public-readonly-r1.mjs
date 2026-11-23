// W05 final public-only production acceptance. No authentication, writes, or provider calls.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

const origin='https://zgmini.kr';
const path='/api/earnings-recession-indicators';
const output='artifacts/w05-production-readonly';
const expectedBase=[
 'bls_ppi_final_demand_yoy_sa','bls_ppi_final_demand_index',
 'bls_ppi_goods_yoy_sa','bls_ppi_goods_index','bls_unit_labor_cost_yoy',
];
const expectedService={
 bls_ppi_services_index:{value:158.076,unit:'INDEX'},
 bls_ppi_services_yoy_sa:{value:4.973901956357141,unit:'PERCENT'},
};
const summary={schema:'ZGMINI_W05_PUBLIC_ACCEPTANCE_V1',status:'UNVERIFIED',
  api:null,viewports:[],errors:[],writes:0};
mkdirSync(output,{recursive:true});
const save=()=>writeFileSync(output+'/summary.json',JSON.stringify(summary,null,2)+'\n');
let browser;
try {
 const response=await fetch(origin+path,{method:'GET',redirect:'manual',
   headers:{accept:'application/json','cache-control':'no-cache'},signal:AbortSignal.timeout(35000)});
 const header=response.headers.get('x-earnings-c-service');
 summary.api={httpStatus:response.status,serviceHeader:header,
   publishedAt:response.headers.get('x-projection-published-at')};
 assert.equal(response.status,200,'Production stored API HTTP status');
 assert.equal(header,'READY','Production WPSFD42 extension state');
 const payload=await response.json();
 summary.api.status=payload.status;
 summary.api.totalRows=payload.rows?.length??null;
 const rows=payload.rows;
 assert(Array.isArray(rows),'Production indicator rows required');
 assert.equal(rows.length,7,'five baseline plus two WPSFD42 rows');
 assert.equal(new Set(rows.map(row=>row.indicatorId)).size,7,'unique indicators');
 for(const id of expectedBase)assert.equal(rows.filter(row=>row.indicatorId===id).length,1,'preserve base '+id);
 for(const [id,expected] of Object.entries(expectedService)){
  const row=rows.find(row=>row.indicatorId===id);
  assert(row,'missing '+id);
  assert.equal(row.status,'READY',id+' must be READY');
  assert.equal(row.unit,expected.unit,id+' unit');
  assert.equal(row.observationPeriod,'2026-10',id+' observation period');
  assert(Math.abs(row.value-expected.value)<1e-8,id+' stored value');
 }
 summary.api.values=Object.fromEntries(Object.keys(expectedService).map(id=>{
  const row=rows.find(row=>row.indicatorId===id);
  return [id,{value:row.value,unit:row.unit,period:row.observationPeriod}];
 }));
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const size of [{width:1440,height:900},{width:390,height:844}]){
  const context=await browser.newContext({viewport:size,locale:'ko-KR',timezoneId:'Asia/Seoul',
   serviceWorkers:'block',isMobile:size.width===390,hasTouch:size.width===390});
  const page=await context.newPage();
  const record={viewport:size.width,status:'UNVERIFIED',visibleNames:[],apiStatus:null};
  summary.viewports.push(record);
  try{
   const apiSeen=page.waitForResponse(r=>r.url().split('?')[0]===origin+path,
    {timeout:60000});
   const pageResponse=await page.goto(origin+'/earnings-recession/',{waitUntil:'domcontentloaded',timeout:60000});
   assert.equal(pageResponse?.status(),200,'Production earnings HTML HTTP');
   const apiResponse=await apiSeen;
   record.apiStatus=apiResponse.status();
   assert.equal(apiResponse.status(),200,'Page API response');
   const list=size.width===390?'.earnings-r2-cost-mobile-card':'.earnings-r2-cost-row';
   const names=[
    '최종수요 생산자물가 상승률','최종수요 생산자물가 지수',
    '재화 생산자물가 상승률','재화 생산자물가 지수',
    '비농업 단위노동비용 증가율',
    '서비스 생산자물가 상승률','서비스 생산자물가 지수',
   ];
   for(const name of names){
    const target=page.locator(list).filter({hasText:name});
    await target.first().waitFor({state:'visible',timeout:35000});
    const count=await target.count();
    assert.equal(count,1,'exactly one visible BLS indicator '+name);
    record.visibleNames.push(name);
   }
   const serviceCards=page.locator(list).filter({hasText:/서비스 생산자물가/});
   assert.equal(await serviceCards.count(),2,'both service indicator entries visible');
   await page.screenshot({path:output+'/earnings-'+size.width+'.png',fullPage:true});
   record.status='PASS';
  }finally{await context.close();}
 }
 summary.status='PASS';
}catch(error){
 summary.status='FAIL';
 summary.errors.push(String(error?.message??error).slice(0,500));
 process.exitCode=1;
}finally{
 try{await browser?.close();}catch{}
 save();
 console.log(JSON.stringify(summary));
}
