import {collect as cnn} from './feed-collectors/fear-greed';
import {collectMarketDataFeed} from './market-data-feed';
import {collectCorePceFeed} from './data-health.mjs';
import {refreshPublicFeeds} from './public-feed-refresh.mjs';
export function runPublicFeeds({env,maxFeedsPerRun}: {env:any,maxFeedsPerRun?:number}){
 return refreshPublicFeeds({env,maxFeedsPerRun,collectors:{
  'fear-greed':cnn,
  'market-data':(store:any,now:number)=>collectMarketDataFeed(env,store,now),
  'core-pce':(store:any,now:number)=>collectCorePceFeed(env,store,now),
 }});
}
