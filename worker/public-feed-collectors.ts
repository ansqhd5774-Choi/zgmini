import {collect as cnn} from './feed-collectors/fear-greed';
import {collect as kospi} from './feed-collectors/kospi-fear-greed';
import {collect as history} from './feed-collectors/kospi-history';
import {collect as ftse} from './feed-collectors/ftse-fear-greed';
import {collect as nikkei} from './feed-collectors/nikkei-fear-greed';
import {collectMarketDataFeed} from './market-data-feed';
import {collectCorePceFeed} from './data-health.mjs';
import {refreshPublicFeeds} from './public-feed-refresh.mjs';
export function runPublicFeeds({env,maxFeedsPerRun}: {env:any,maxFeedsPerRun?:number}){
 return refreshPublicFeeds({env,maxFeedsPerRun,collectors:{
  'fear-greed':cnn,'kospi-fear-greed':kospi,'kospi-history':history,'ftse-fear-greed':ftse,'nikkei-fear-greed':nikkei,
  'market-data':(store:any,now:number)=>collectMarketDataFeed(env,store,now),
  'core-pce':(store:any,now:number)=>collectCorePceFeed(env,store,now),
 }});
}
