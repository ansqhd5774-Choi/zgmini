import {env} from 'cloudflare:workers';
import {PUBLIC_PROJECTION_KEYS,publicProjectionStore,storedProjectionResponse} from '../../../worker/market-public-projection-store.mjs';

// Read the approved stored R2 projection only; a visitor GET never collects or calculates.
export async function GET(request:Request){
  return storedProjectionResponse(request,{
    store:publicProjectionStore(env.DB),
    key:PUBLIC_PROJECTION_KEYS.inflation,
  });
}
