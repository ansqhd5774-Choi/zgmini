import {env} from 'cloudflare:workers';
import {PUBLIC_PROJECTION_KEYS,publicProjectionStore,storedProjectionResponse} from '../../../worker/market-public-projection-store.mjs';

// Read the existing approved D1 public projection; do not collect or calculate on GET.
export async function GET(request:Request){
  return storedProjectionResponse(request,{
    store:publicProjectionStore(env.DB),
    key:PUBLIC_PROJECTION_KEYS.recession,
  });
}
