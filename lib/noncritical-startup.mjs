// Let the document and critical UI finish before downloading optional analytics.
export function afterFirstLoadIdle(target,callback){
 let disposed=false,id=null,idle=false;
 const run=()=>{if(!disposed)callback();};
 const schedule=()=>{
  if(disposed)return;
  if(typeof target.requestIdleCallback==='function'){idle=true;id=target.requestIdleCallback(run,{timeout:3000});}
  else id=target.setTimeout(run,0);
 };
 if(target.document.readyState==='complete')schedule();
 else target.addEventListener('load',schedule,{once:true});
 return()=>{disposed=true;target.removeEventListener('load',schedule);if(id!==null){if(idle)target.cancelIdleCallback(id);else target.clearTimeout(id);}};
}
