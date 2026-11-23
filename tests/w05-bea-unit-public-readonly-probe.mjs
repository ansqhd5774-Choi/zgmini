// W05 read-only public GET: separate BEA unit / QFR status from PC raw archive.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const origin='https://zgmini.kr';
const targets=[
 {id:'bea-unit-profit',path:'/api/earnings-recession-bea-unit-profit'},
 {id:'census-qfr',path:'/api/earnings-recession-census-qfr-margin'},
];
const out={schema:'ZGMINI_W05_REMAINING_PUBLIC_GET_V1',probe:'READ_ONLY',
 observedAt:new Date().toISOString(),status:'UNVERIFIED',items:[],writes:0,errors:[]};
mkdirSync('artifacts/w05-bea-unit-public-readonly',{recursive:true});
try{
 for(const target of targets){
  const response=await fetch(origin+target.path,{method:'GET',redirect:'manual',
   headers:{accept:'application/json','cache-control':'no-cache'},signal:AbortSignal.timeout(25000)});
  const body=await response.json();
  assert([200,503].includes(response.status),target.id+' HTTP must be 200 or stored pending 503');
  assert(body&&typeof body==='object'&&!Array.isArray(body),target.id+' expected JSON');
  const item={id:target.id,httpStatus:response.status,status:body.status??null,
   reason:body.reason??null,sourceVersion:body.sourceVersion??null,
   sourceStoredAt:body.sourceStoredAt??null,
   indicatorPresent:Boolean(body.indicator&&typeof body.indicator==='object'),
   rowsCount:Array.isArray(body.rows)?body.rows.length:null};
  if(response.status===503){
   assert(item.status==='unavailable'||item.status==='UNAVAILABLE',
    target.id+' unavailable contract');
  }
  out.items.push(item);
 }
 out.status='OBSERVED';
}catch(e){
 out.status='PROBE_FAILED';
 out.errors.push(String(e?.message??e).slice(0,350));
 process.exitCode=1;
}finally{
 writeFileSync('artifacts/w05-bea-unit-public-readonly/summary.json',JSON.stringify(out,null,2)+'\n');
 console.log(JSON.stringify(out));
}
