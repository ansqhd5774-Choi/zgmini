// User-directed removal, 2026-11-16. This is not a rate limit or a retry gate.
// The supplier denied public use of free data on Nov 5 and the free exception
// on Nov 8. No legacy risk-acceptance flag may restore this source.
export const MARKETPARQUET_REMOVED_CODE='PROVIDER_REMOVED_MARKETPARQUET_PUBLICATION_DENIED';
export function throwMarketParquetRemoved(){
 throw Object.assign(new Error(MARKETPARQUET_REMOVED_CODE),{
  code:MARKETPARQUET_REMOVED_CODE,retryable:false,
 });
}
export function hasMarketParquetProvenance(record){
 if(!record||typeof record!=='object')return false;
 const fields=['source','sourceName','sourceVersion','sourcePriceMode','provider',
  'primarySource','secondarySource','provisionalPriceMode'];
 if(fields.some(key=>typeof record[key]==='string'&&/marketparquet/i.test(record[key])))return true;
 return ['lineage','provenance','provisionalLineage'].some(key=>record[key]&&
  fields.some(field=>typeof record[key][field]==='string'&&/marketparquet/i.test(record[key][field])));
}
