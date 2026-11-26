import path from 'node:path';

function stop(code){const e=new Error(code);e.code=code;throw e;}

// Read only explicitly approved SEC runtime settings. No implicit fallback to
// the collector-local base: that would silently split the SEC global budget.
export function secGuardOptionsFromEnv(env=process.env){
 const flag=env.ZGMINI_SEC_SHARED_GUARD_ENABLED;
 if(flag===undefined||flag==='false')return {secSharedGuard:false};
 if(flag!=='true')stop('SEC_GUARD_ENABLE_FLAG_INVALID');
 const root=env.ZGMINI_SEC_SHARED_STATE_ROOT;
 if(typeof root!=='string'||root.length===0||!path.isAbsolute(root))
  stop('SEC_GLOBAL_PERMIT_SCOPE_REQUIRED');
 return {secSharedGuard:true,secSharedBase:path.resolve(root)};
}
