// Keep scheduled writer targets in one statically linked runtime boundary.
import {runPublicFeeds} from './public-feed-collectors.ts';
import {runMarketOperationalRefresh} from './market-operational-refresh.mjs';
import {refreshKoreaRev7 as refreshStoredKorea} from './korea-rev7-refresh.mjs';
import {Rev7D1Store} from './korea-rev7-d1.mjs?scheduled-writer';

export async function refreshKoreaRev7(options){
 const store=new Rev7D1Store(options.env.DB_HISTORY,{leaseMs:600000});
 return refreshStoredKorea({...options,store});
}

export {runPublicFeeds,runMarketOperationalRefresh};
