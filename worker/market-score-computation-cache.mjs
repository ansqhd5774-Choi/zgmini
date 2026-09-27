// Request-local only: provider results are immutable during incremental assembly.
// Compare row arrays by identity; a replaced history always invalidates its score.
function equal(a,b){
  if(a===b)return true;
  if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===0&&b.length===0;
  if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;
  const keys=Object.keys(a);
  return keys.length===Object.keys(b).length&&keys.every(key=>Object.hasOwn(b,key)&&equal(a[key],b[key]));
}
export function createProgressiveComputationCache(){
  const cache=new Map();
  return (fn,...args)=>{
    const old=cache.get(fn);
    if(old&&args.length===old.args.length&&args.every((arg,i)=>equal(arg,old.args[i])))return old.value;
    const value=fn(...args);
    cache.set(fn,{args,value});
    return value;
  };
}
