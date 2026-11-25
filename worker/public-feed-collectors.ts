import {collect as cnn} from './feed-collectors/fear-greed';
import {collectMarketDataFeed} from './market-data-feed';
import {collectCorePceFeed} from './data-health.mjs';
import {refreshPublicFeeds} from './public-feed-refresh.mjs';
import type {DataEnv} from './runtime-contracts';
import type {publicFeedStore} from './public-feed-store.mjs';
type FeedStore=ReturnType<typeof publicFeedStore>;
export function runPublicFeeds({env,maxFeedsPerRun,cnnMinuteOnly=false}: {env:DataEnv & {ZGMINI_COMPUTE_TARGET?:string},maxFeedsPerRun?:number,cnnMinuteOnly?:boolean}){
 return refreshPublicFeeds({env,maxFeedsPerRun,cnnMinuteOnly,collectors:{
  'fear-greed':cnn,
  'market-data':(store:FeedStore,now:number)=>collectMarketDataFeed(env,store,now),
  'core-pce':(store:FeedStore,now:number)=>collectCorePceFeed(env,store,now),
 }});
}
