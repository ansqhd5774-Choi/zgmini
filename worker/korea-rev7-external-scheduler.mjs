import {timingSafeEqual} from 'node:crypto';
import {refreshKoreaRev7} from './korea-rev7-refresh.mjs';

// Dedicated scheduler credential; owner-session refresh remains separate.
export async function koreaRev7ExternalScheduler(request,env,{refresh=refreshKoreaRev7,ctx,responseBudgetMs=20000,logTag='KOREA_REV7_EXTERNAL'}={}){
 const reply=(body,status)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-robots-tag':'noindex'}});
 if(request.method!=='POST')return reply({status:'METHOD_NOT_ALLOWED'},405);
 const secret=env?.KOREA_REV7_SCHEDULER_SECRET;
 if(typeof secret!=='string'||secret.length<32)return reply({status:'CONFIGURATION_MISSING'},503);
 const supplied=new TextEncoder().encode(request.headers.get('authorization')??'');
 const expected=new TextEncoder().encode(`Bearer ${secret}`);
 if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return reply({status:'UNAUTHORIZED'},401);
 try{
  const work=refresh({env,maxDates:1}).catch(()=>({status:'ERROR'}));
  // Free external scheduler stops at 30s. Keep in-flight work attached to
  // the Worker, and report RUNNING rather than claiming a completed refresh.
  if(ctx)ctx.waitUntil(work.then(result=>console.log(logTag,JSON.stringify(result))));
  let timer;
  const result=ctx?await Promise.race([work,new Promise(resolve=>{timer=setTimeout(()=>resolve({status:'RUNNING'}),responseBudgetMs);})]).finally(()=>clearTimeout(timer)):await work;
  if(result.status==='RUNNING')return reply(result,202);
  return reply(result,['COMPLETE','BACKLOG','WAITING_PUBLICATION','ALREADY_RUNNING'].includes(result.status)?200:503);
 }catch{return reply({status:'ERROR'},503);}
}
