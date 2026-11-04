import assert from 'node:assert/strict';
import test from 'node:test';
import {readUnifiedPublicThemes} from '../worker/theme-unified-public.mjs';

const existing={theme:'로봇·자동화',score:42,history:[{date:'2026-10-30',score:42}]};
const added={id:'ai-software',theme:'AI 소프트웨어',score:55,history:[{date:'2026-10-30',score:55}],
 provisional:{date:'2026-11-02',score:57}};
const response=(themes,status=200)=>Response.json({status:status===200?'READY':'UNAVAILABLE',themes},{status});
test('configured public themes append with their own dates and no fixed capacity',async()=>{
 const bulk=Array.from({length:501},(_,i)=>({...added,id:'theme-'+i,theme:'테마 '+i}));
 const result=await readUnifiedPublicThemes(null,{
  readLegacy:()=>response([existing]),
  readConfigured:()=>response([added,{...added,id:'duplicate',theme:existing.theme},...bulk]),
 });
 assert.deepEqual((await result.json()).themes,[existing,added,...bulk]);
});
test('configured failure or collision leaves the legacy response intact',async()=>{
 for(const configured of [response([],503),response([{...added,theme:existing.theme}])]){
  const legacy=response([existing]);
  assert.equal(await readUnifiedPublicThemes(null,{readLegacy:()=>legacy,readConfigured:()=>configured}),legacy);
  assert.deepEqual((await legacy.json()).themes,[existing]);
 }
});
test('configured results remain visible when legacy storage is unavailable',async()=>{
 const result=await readUnifiedPublicThemes(null,{
  readLegacy:()=>response([],503),readConfigured:()=>response([added]),
 });
 assert.equal(result.status,200);
 assert.deepEqual((await result.json()).themes,[added]);
});
