import handler from 'vinext/server/app-router-entry';
import {candidateWorker} from './candidate-guard.mjs';
import {readPublicFeed,readPublicFeedHealth} from './public-feed-store.mjs';
export default candidateWorker({async fetch(request,env,ctx) {
  const path=new URL(request.url).pathname;
  if(path==='/api/core-pce') return readPublicFeed(env.DB,'core-pce');
  if(path==='/api/data-health') return readPublicFeedHealth(env.DB);
  return handler.fetch(request,env,ctx);
}});
