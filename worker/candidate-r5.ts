import handler from 'vinext/server/app-router-entry';
import {candidateWorker} from './candidate-guard.mjs';
import {staticShell} from './candidate-shell-r7.mjs';
export default candidateWorker({async fetch(request,env,ctx) {
  const path=new URL(request.url).pathname;
  if(path==='/api/candidate-status') return Response.json({candidate:true,database:'UNBOUND',writes:false,cron:false});
  // No provider calls or fabricated data in the DB-less candidate.
  if(path.startsWith('/api/') && path!=='/api/session') return Response.json({status:'unavailable',reason:'CANDIDATE_DB_UNBOUND'},{status:503,headers:{'cache-control':'no-store'}});
  const shell=await staticShell(request,env);
  if(shell)return shell; // Allowlisted shell never calls the SSR handler, even on missing artifacts.
  if(env.ASSETS && /\.(?:css|js|svg|png|jpg|webp|ico|xml|txt)$/.test(path)) return env.ASSETS.fetch(request);
  try {return await handler.fetch(request,env,ctx);} catch {
    return Response.json({status:'unavailable',reason:'CANDIDATE_RUNTIME_UNAVAILABLE'},{status:503});
  }
}});
