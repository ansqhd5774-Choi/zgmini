// Removed the MarketParquet primary and automatic alternate-source fallback.
// Keep the scheduler's result contract; do not open a DB, fetch or acquire a lease.
import {MARKETPARQUET_REMOVED_CODE} from '../marketparquet-retirement.mjs';
export const B1_R3_COLLECTOR='B1-R3-COLLECTOR-SOURCE-REMOVED';
export async function collectBreadthB1R3ToStore(){
 return {collectorVersion:B1_R3_COLLECTOR,status:'UNAVAILABLE',code:MARKETPARQUET_REMOVED_CODE,
  providerRequests:0,scoreComputed:false,dbWrites:0,retryable:false};
}
