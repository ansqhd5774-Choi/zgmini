// Local build-time renderer only. This entry is never deployed.
import handler from 'vinext/server/app-router-entry';
import {candidateWorker} from './candidate-guard.mjs';
import type {CandidateEnv,WorkerContext} from './runtime-contracts';
export default candidateWorker({async fetch(request:Request,env:Pick<CandidateEnv,'ASSETS'>,ctx:WorkerContext){
 const path=new URL(request.url).pathname;
 if(path.startsWith('/api/'))return Response.json({reason:'CANDIDATE_DB_UNBOUND'},{status:503});
 if(env.ASSETS&&/\.(?:css|js|svg|png|jpg|webp|ico|xml|txt)$/.test(path))return env.ASSETS.fetch(request);
 return handler.fetch(request,env,ctx);
}});
